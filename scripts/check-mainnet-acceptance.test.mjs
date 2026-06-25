import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  REQUIRED_ACCEPTANCE_CONTROL_IDS,
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
        "database_id": "00000000-0000-0000-0000-000000000000"
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
      blocking_findings: [
        { id: "production-not-ready", status: "open", evidence: "Blocked." },
      ],
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
      blocking_findings: [
        { id: "closed-finding", status: "resolved", evidence: "Resolved." },
      ],
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
      blocking_findings: [],
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
      blocking_findings: [
        { id: "still-open", status: "open", evidence: "Open." },
      ],
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
      blocking_findings: [
        { id: "blocker", status: "open", evidence: "Open." },
      ],
    };
    const paths = await fixture({
      acceptance,
      gateDocument: gate({ state: "ready", acceptanceStatus: "passed" }),
    });

    await expect(runMainnetAcceptanceAudit(paths)).rejects.toThrow(
      "requires a blocked gate",
    );
  });

  it("rejects missing required controls and stale blocker evidence", async () => {
    const acceptance = {
      schema_version: 1,
      audit_status: "completed",
      release_decision: "blocked",
      audited_at: "2026-06-26",
      controls: controls().slice(1),
      blocking_findings: [
        { id: "blocker", status: "open", evidence: "Open." },
      ],
    };
    const missingPaths = await fixture({ acceptance, gateDocument: gate() });
    await expect(runMainnetAcceptanceAudit(missingPaths)).rejects.toThrow(
      "control is missing",
    );

    const complete = { ...acceptance, controls: controls("pending") };
    const stalePaths = await fixture({
      acceptance: complete,
      gateDocument: gate(),
      wrangler: safeBlockedWrangler.replace(
        "00000000-0000-0000-0000-000000000000",
        "11111111-1111-1111-1111-111111111111",
      ),
    });
    await expect(runMainnetAcceptanceAudit(stalePaths)).rejects.toThrow(
      "D1 blocker no longer matches",
    );
  });
});
