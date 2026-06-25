import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  REQUIRED_ACCEPTANCE_CONTROL_IDS,
  REQUIRED_ACCEPTANCE_FINDING_IDS,
  runMainnetAcceptanceAudit,
} from "./check-mainnet-acceptance.mjs";

const temporaryDirectories = [];

function controls(status = "passed") {
  return REQUIRED_ACCEPTANCE_CONTROL_IDS.map((id) => ({
    id,
    status,
    evidence: `Evidence for ${id}.`,
  }));
}

function findings(status = "open") {
  return REQUIRED_ACCEPTANCE_FINDING_IDS.map((id) => ({
    id,
    status,
    evidence: `Evidence for ${id}.`,
  }));
}

function gate({ state = "blocked", acceptanceStatus = "failed" } = {}) {
  return {
    schema_version: 1,
    state,
    updated_at: "2026-06-26",
    checks: [
      {
        id: "repository-controls",
        status: "passed",
        evidence: "Repository controls passed.",
      },
      {
        id: "mainnet-acceptance-audit",
        status: acceptanceStatus,
        evidence: "Acceptance decision recorded.",
      },
    ],
  };
}

const safeBlockedWrangler = `{
  "env": {
    "mainnet": {
      "vars": {
        "ALLOW_MAINNET_RUNTIME": "false",
        "MAINNET_GATE_APPROVED": "false",
        "MAINNET_SOURCE_TAG_APPROVED": "false",
        "MAINNET_RELEASE_MODE": "disabled",
        "MAINNET_OPERATIONS_MODE": "halted"
      },
      "d1_databases": [{
        "binding": "PAYMENTS_DB_MAINNET",
        "database_id": "00000000-0000-0000-0000-000000000000",
        "preview_database_id": "00000000-0000-0000-0000-000000000000"
      }]
    }
  }
}`;

async function fixture({ acceptance, gateDocument, wrangler = safeBlockedWrangler }) {
  const directory = await mkdtemp(join(tmpdir(), "group-pay-mainnet-audit-"));
  temporaryDirectories.push(directory);
  const acceptancePath = join(directory, "mainnet-acceptance.json");
  const gatePath = join(directory, "mainnet-gate.json");
  const wranglerPath = join(directory, "wrangler.jsonc");
  await Promise.all([
    writeFile(acceptancePath, JSON.stringify(acceptance)),
    writeFile(gatePath, JSON.stringify(gateDocument)),
    writeFile(wranglerPath, wrangler),
  ]);
  return { acceptancePath, gatePath, wranglerPath };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("Mainnet acceptance audit", () => {
  it("accepts a completed blocked audit while normal CI remains usable", async () => {
    const acceptance = {
      schema_version: 1,
      audit_status: "completed",
      release_decision: "blocked",
      audited_at: "2026-06-26",
      controls: controls().map((control, index) =>
        index === 0 ? { ...control, status: "pending" } : control,
      ),
      blocking_findings: findings(),
    };
    const paths = await fixture({ acceptance, gateDocument: gate() });

    await expect(runMainnetAcceptanceAudit(paths)).resolves.toMatchObject({
      release_decision: "blocked",
    });
    await expect(
      runMainnetAcceptanceAudit({ ...paths, requireReady: true }),
    ).rejects.toThrow("Mainnet acceptance is blocked");
  });

  it("accepts an approved audit only with all controls, findings, and gate checks complete", async () => {
    const acceptance = {
      schema_version: 1,
      audit_status: "completed",
      release_decision: "approved",
      audited_at: "2026-06-26",
      controls: controls(),
      blocking_findings: findings("resolved"),
    };
    const paths = await fixture({
      acceptance,
      gateDocument: gate({ state: "ready", acceptanceStatus: "passed" }),
      wrangler: "{}",
    });

    await expect(
      runMainnetAcceptanceAudit({ ...paths, requireReady: true }),
    ).resolves.toMatchObject({ release_decision: "approved" });
  });

  it("rejects approval with incomplete controls or open findings", async () => {
    const incomplete = {
      schema_version: 1,
      audit_status: "completed",
      release_decision: "approved",
      audited_at: "2026-06-26",
      controls: controls().map((control, index) =>
        index === 1 ? { ...control, status: "pending" } : control,
      ),
      blocking_findings: findings("resolved"),
    };
    const incompletePaths = await fixture({
      acceptance: incomplete,
      gateDocument: gate({ state: "ready", acceptanceStatus: "passed" }),
      wrangler: "{}",
    });
    await expect(runMainnetAcceptanceAudit(incompletePaths)).rejects.toThrow(
      "requires every control to pass",
    );

    const openFinding = {
      ...incomplete,
      controls: controls(),
      blocking_findings: findings("resolved").map((finding, index) =>
        index === 0 ? { ...finding, status: "open" } : finding,
      ),
    };
    const openPaths = await fixture({
      acceptance: openFinding,
      gateDocument: gate({ state: "ready", acceptanceStatus: "passed" }),
      wrangler: "{}",
    });
    await expect(runMainnetAcceptanceAudit(openPaths)).rejects.toThrow(
      "cannot contain open findings",
    );
  });

  it("rejects a blocked decision when the Mainnet gate is ready", async () => {
    const acceptance = {
      schema_version: 1,
      audit_status: "completed",
      release_decision: "blocked",
      audited_at: "2026-06-26",
      controls: controls("pending"),
      blocking_findings: findings(),
    };
    const paths = await fixture({
      acceptance,
      gateDocument: gate({ state: "ready", acceptanceStatus: "passed" }),
    });

    await expect(runMainnetAcceptanceAudit(paths)).rejects.toThrow(
      "requires a blocked gate",
    );
  });

  it("allows D1 provisioning to resolve while other release findings remain open", async () => {
    const acceptance = {
      schema_version: 1,
      audit_status: "completed",
      release_decision: "blocked",
      audited_at: "2026-06-26",
      controls: controls("pending").map((control) =>
        control.id === "production-d1-provisioning"
          ? { ...control, status: "passed" }
          : control,
      ),
      blocking_findings: findings().map((finding) =>
        finding.id === "production-d1-not-provisioned"
          ? { ...finding, status: "resolved" }
          : finding,
      ),
    };
    const provisionedWrangler = safeBlockedWrangler.replaceAll(
      "00000000-0000-0000-0000-000000000000",
      "11111111-1111-4111-8111-111111111111",
    );
    const paths = await fixture({
      acceptance,
      gateDocument: gate(),
      wrangler: provisionedWrangler,
    });

    await expect(runMainnetAcceptanceAudit(paths)).resolves.toMatchObject({
      release_decision: "blocked",
    });
  });

  it("rejects missing required records and stale blocker evidence", async () => {
    const missingControl = {
      schema_version: 1,
      audit_status: "completed",
      release_decision: "blocked",
      audited_at: "2026-06-26",
      controls: controls().slice(1),
      blocking_findings: findings(),
    };
    const missingControlPaths = await fixture({
      acceptance: missingControl,
      gateDocument: gate(),
    });
    await expect(runMainnetAcceptanceAudit(missingControlPaths)).rejects.toThrow(
      "control is missing",
    );

    const missingFinding = {
      ...missingControl,
      controls: controls("pending"),
      blocking_findings: findings().slice(1),
    };
    const missingFindingPaths = await fixture({
      acceptance: missingFinding,
      gateDocument: gate(),
    });
    await expect(runMainnetAcceptanceAudit(missingFindingPaths)).rejects.toThrow(
      "finding is missing",
    );

    const complete = {
      ...missingControl,
      controls: controls("pending"),
      blocking_findings: findings(),
    };
    const stalePaths = await fixture({
      acceptance: complete,
      gateDocument: gate(),
      wrangler: safeBlockedWrangler.replace(
        "00000000-0000-0000-0000-000000000000",
        "11111111-1111-4111-8111-111111111111",
      ),
    });
    await expect(runMainnetAcceptanceAudit(stalePaths)).rejects.toThrow(
      "D1 blocker no longer matches",
    );
  });
});
