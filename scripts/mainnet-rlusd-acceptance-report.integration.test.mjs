import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertBlockedReleaseEvidence,
  assertMainnetAcceptanceDocument,
  assertMainnetAcceptanceMatchesGate,
} from "./check-mainnet-acceptance.mjs";
import {
  assertEvidenceMatchesAcceptance,
  assertEvidenceMatchesConfiguration,
} from "./check-mainnet-release-evidence.mjs";
import { assertMainnetReleasePlan } from "./check-mainnet-release-plan.mjs";
import { assertProductionTarget } from "./check-production-target.mjs";
import {
  applyMainnetRlusdAcceptanceReport,
  validateMainnetRlusdAcceptanceReport,
} from "./mainnet-rlusd-acceptance-report.mjs";

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

async function repositoryState() {
  const root = process.cwd();
  const [
    report,
    evidence,
    acceptance,
    releasePlan,
    gate,
    wranglerSource,
    productionTarget,
    assetRegistry,
    sourceTag,
    routeSource,
  ] = await Promise.all([
    readFile(
      resolve(
        root,
        "evidence/mainnet-rlusd-acceptance-2026-06-30.json",
      ),
      "utf8",
    ).then(JSON.parse),
    readFile(
      resolve(root, "config/mainnet-release-evidence.json"),
      "utf8",
    ).then(JSON.parse),
    readFile(
      resolve(root, "config/mainnet-acceptance.json"),
      "utf8",
    ).then(JSON.parse),
    readFile(
      resolve(root, "config/mainnet-release-plan.json"),
      "utf8",
    ).then(JSON.parse),
    readFile(resolve(root, "config/mainnet-gate.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "wrangler.jsonc"), "utf8"),
    readFile(
      resolve(root, "config/production-target.json"),
      "utf8",
    ).then(JSON.parse),
    readFile(
      resolve(root, "config/xrpl-mainnet-assets.json"),
      "utf8",
    ).then(JSON.parse),
    readFile(
      resolve(root, "config/mainnet-source-tag.json"),
      "utf8",
    ).then(JSON.parse),
    readFile(
      resolve(root, "src/app/api/xaman/callback/route.ts"),
      "utf8",
    ),
  ]);

  return {
    report,
    evidence,
    acceptance,
    releasePlan,
    gate,
    wrangler: parseJsonc(wranglerSource),
    wranglerSource,
    productionTarget,
    assetRegistry,
    sourceTag,
    routeSource,
  };
}

function pendingRlusdState(state) {
  const pending = structuredClone(state);
  pending.acceptance.release_decision = "blocked";

  Object.assign(
    pending.evidence.records.find(
      (record) => record.id === "live-mainnet-rlusd-acceptance",
    ),
    {
      status: "pending",
      recorded_at: null,
      transaction_hash: null,
      ledger_index: null,
      validated: false,
      transaction_result: null,
      amount_value: null,
      receipt_id: null,
      proof_digest: null,
      recipient_readiness_checked: false,
      duplicate_rejected: false,
      replay_rejected: false,
    },
  );

  Object.assign(
    pending.acceptance.controls.find(
      (control) => control.id === "live-mainnet-rlusd-acceptance",
    ),
    {
      status: "pending",
      evidence:
        "No accepted live Mainnet RLUSD end-to-end evidence is recorded.",
    },
  );
  Object.assign(
    pending.acceptance.blocking_findings.find(
      (finding) =>
        finding.id === "live-rlusd-acceptance-not-recorded",
    ),
    {
      status: "open",
      evidence:
        "Complete a controlled official RLUSD Mainnet payment and record validated-ledger, receipt, and Bill settlement evidence.",
    },
  );
  Object.assign(
    pending.acceptance.controls.find(
      (control) => control.id === "final-release-audit",
    ),
    {
      status: "pending",
      evidence:
        "The final release audit begins only after all evidence records are accepted.",
    },
  );
  Object.assign(
    pending.acceptance.blocking_findings.find(
      (finding) =>
        finding.id === "final-release-audit-not-complete",
    ),
    {
      status: "resolved",
      evidence:
        "The final release audit is not active while RLUSD evidence remains pending.",
    },
  );

  pending.gate.state = "blocked";
  Object.assign(
    pending.gate.checks.find(
      (check) => check.id === "mainnet-acceptance-audit",
    ),
    {
      status: "failed",
      evidence: "live-rlusd-acceptance-not-recorded",
    },
  );

  Object.assign(pending.releasePlan, {
    state: "blocked",
    review_status: "prepared",
    release_decision: "blocked",
    current_stage: "live-rlusd-acceptance",
    remaining_evidence: ["live-mainnet-rlusd-acceptance"],
  });
  const statuses = {
    foundations: "complete",
    "provider-attestation": "complete",
    "halted-deployment-review": "complete",
    "live-xrp-acceptance": "complete",
    "live-rlusd-acceptance": "blocked",
    "final-release-audit": "pending",
  };
  pending.releasePlan.stages.forEach((stage) => {
    stage.status = statuses[stage.id];
  });

  return pending;
}

describe("Mainnet RLUSD acceptance evidence import", () => {
  it("accepts the public report and enters final release audit while halted", async () => {
    const current = await repositoryState();
    const pending = pendingRlusdState(current);

    const result = applyMainnetRlusdAcceptanceReport({
      report: current.report,
      expectedGitSha: current.report.git_sha,
      evidence: pending.evidence,
      acceptance: pending.acceptance,
      releasePlan: pending.releasePlan,
      gate: pending.gate,
      wrangler: pending.wrangler,
      productionTarget: pending.productionTarget,
    });
    const wranglerSource = JSON.stringify(result.wrangler);

    expect(() =>
      assertEvidenceMatchesAcceptance(
        result.evidence,
        result.acceptance,
      ),
    ).not.toThrow();
    expect(() =>
      assertEvidenceMatchesConfiguration(
        result.evidence,
        wranglerSource,
        current.assetRegistry,
      ),
    ).not.toThrow();
    expect(() =>
      assertMainnetAcceptanceDocument(result.acceptance),
    ).not.toThrow();
    expect(() =>
      assertMainnetAcceptanceMatchesGate(
        result.acceptance,
        result.gate,
      ),
    ).not.toThrow();
    expect(() =>
      assertBlockedReleaseEvidence(
        result.acceptance,
        wranglerSource,
      ),
    ).not.toThrow();
    expect(() =>
      assertMainnetReleasePlan({
        plan: result.releasePlan,
        evidence: result.evidence,
        acceptance: result.acceptance,
        gate: result.gate,
        wranglerSource,
        sourceTag: current.sourceTag,
      }),
    ).not.toThrow();
    expect(() =>
      assertProductionTarget({
        target: result.productionTarget,
        wrangler: result.wrangler,
        routeSource: current.routeSource,
      }),
    ).not.toThrow();

    expect(result.releasePlan.current_stage).toBe(
      "final-release-audit",
    );
    expect(result.releasePlan.remaining_evidence).toEqual([]);
    expect(
      result.acceptance.blocking_findings
        .filter((finding) => finding.status === "open")
        .map((finding) => finding.id),
    ).toEqual(["final-release-audit-not-complete"]);
    expect(result.gate.state).toBe("blocked");
    expect(result.productionTarget).toEqual(
      pending.productionTarget,
    );
    expect(result.wrangler).toEqual(pending.wrangler);
  });

  it("matches the committed final-audit repository state", async () => {
    const state = await repositoryState();

    expect(() =>
      validateMainnetRlusdAcceptanceReport(
        state.report,
        state.report.git_sha,
      ),
    ).not.toThrow();
    expect(() =>
      assertEvidenceMatchesAcceptance(
        state.evidence,
        state.acceptance,
      ),
    ).not.toThrow();
    expect(() =>
      assertMainnetReleasePlan({
        plan: state.releasePlan,
        evidence: state.evidence,
        acceptance: state.acceptance,
        gate: state.gate,
        wranglerSource: state.wranglerSource,
        sourceTag: state.sourceTag,
      }),
    ).not.toThrow();
    expect(state.productionTarget).toMatchObject({
      release_mode: "internal",
      operations_mode: "halted",
    });
  });

  it("rejects protected, incomplete, or mismatched reports", async () => {
    const state = await repositoryState();

    expect(() =>
      validateMainnetRlusdAcceptanceReport(
        { ...state.report, payment_token: "not-public" },
        state.report.git_sha,
      ),
    ).toThrow("forbidden field");
    expect(() =>
      validateMainnetRlusdAcceptanceReport(
        { ...state.report, receipt_count: 2 },
        state.report.git_sha,
      ),
    ).toThrow();
    expect(() =>
      validateMainnetRlusdAcceptanceReport(
        {
          ...state.report,
          final_operations_mode: "verify-only",
        },
        state.report.git_sha,
      ),
    ).toThrow();
  });
});
