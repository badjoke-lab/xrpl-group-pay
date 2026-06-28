import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { assertBlockedReleaseEvidence } from "./check-mainnet-acceptance.mjs";
import {
  assertEvidenceMatchesAcceptance,
  assertEvidenceMatchesConfiguration,
} from "./check-mainnet-release-evidence.mjs";
import { assertMainnetReleasePlan } from "./check-mainnet-release-plan.mjs";
import { assertProductionTarget } from "./check-production-target.mjs";
import {
  applyMainnetXrpAcceptanceReport,
  validateMainnetXrpAcceptanceReport,
} from "./mainnet-xrp-acceptance-report.mjs";

const SHA = "c".repeat(40);
const TX = "A".repeat(64);
const PROOF = "B".repeat(64);
const GENERATED_AT = "2026-06-28T04:00:00.000Z";

function report() {
  const patch = {
    id: "live-mainnet-xrp-acceptance",
    status: "accepted",
    recorded_at: GENERATED_AT,
    transaction_hash: TX,
    ledger_index: 99_000_001,
    validated: true,
    transaction_result: "tesSUCCESS",
    amount_drops: "1",
    receipt_id: `mainnet:${TX}`,
    proof_digest: PROOF,
    duplicate_rejected: true,
    replay_rejected: true,
  };
  return {
    schema_version: 1,
    network: "mainnet",
    asset_id: "xrpl:mainnet:xrp",
    generated_at: GENERATED_AT,
    git_sha: SHA,
    workflow_run_url:
      "https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/28319999999",
    state: "verified",
    public_url: "https://xgp.badjoke-lab.com",
    transaction_hash: TX,
    ledger_index: 99_000_001,
    validated: true,
    transaction_result: "tesSUCCESS",
    amount_drops: "1",
    receipt_id: `mainnet:${TX}`,
    proof_digest: PROOF,
    duplicate_rejected: true,
    duplicate_receipt_count: 1,
    replay_rejected: true,
    operations_restored_halted: true,
    sensitive_values_excluded: true,
    evidence_patch: patch,
  };
}

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

async function repositoryState() {
  const root = process.cwd();
  const [evidence, acceptance, releasePlan, wranglerSource, productionTarget, assetRegistry, gate, sourceTag, routeSource] =
    await Promise.all([
      readFile(resolve(root, "config/mainnet-release-evidence.json"), "utf8").then(JSON.parse),
      readFile(resolve(root, "config/mainnet-acceptance.json"), "utf8").then(JSON.parse),
      readFile(resolve(root, "config/mainnet-release-plan.json"), "utf8").then(JSON.parse),
      readFile(resolve(root, "wrangler.jsonc"), "utf8"),
      readFile(resolve(root, "config/production-target.json"), "utf8").then(JSON.parse),
      readFile(resolve(root, "config/xrpl-mainnet-assets.json"), "utf8").then(JSON.parse),
      readFile(resolve(root, "config/mainnet-gate.json"), "utf8").then(JSON.parse),
      readFile(resolve(root, "config/mainnet-source-tag.json"), "utf8").then(JSON.parse),
      readFile(resolve(root, "src/app/api/xaman/callback/route.ts"), "utf8"),
    ]);
  return {
    evidence,
    acceptance,
    releasePlan,
    wrangler: parseJsonc(wranglerSource),
    productionTarget,
    assetRegistry,
    gate,
    sourceTag,
    routeSource,
  };
}

describe("Mainnet XRP acceptance evidence import", () => {
  it("advances only to live RLUSD acceptance and preserves halted operation", async () => {
    const state = await repositoryState();
    const result = applyMainnetXrpAcceptanceReport({
      report: report(),
      expectedGitSha: SHA,
      evidence: state.evidence,
      acceptance: state.acceptance,
      releasePlan: state.releasePlan,
      wrangler: state.wrangler,
      productionTarget: state.productionTarget,
    });
    const wranglerSource = JSON.stringify(result.wrangler);

    expect(() =>
      assertEvidenceMatchesAcceptance(result.evidence, result.acceptance),
    ).not.toThrow();
    expect(() =>
      assertEvidenceMatchesConfiguration(
        result.evidence,
        wranglerSource,
        state.assetRegistry,
      ),
    ).not.toThrow();
    expect(() =>
      assertBlockedReleaseEvidence(result.acceptance, wranglerSource),
    ).not.toThrow();
    expect(() =>
      assertMainnetReleasePlan({
        plan: result.releasePlan,
        evidence: result.evidence,
        acceptance: result.acceptance,
        gate: state.gate,
        wranglerSource,
        sourceTag: state.sourceTag,
      }),
    ).not.toThrow();
    expect(() =>
      assertProductionTarget({
        target: result.productionTarget,
        wrangler: result.wrangler,
        routeSource: state.routeSource,
      }),
    ).not.toThrow();

    expect(result.releasePlan.current_stage).toBe("live-rlusd-acceptance");
    expect(result.releasePlan.remaining_evidence).toEqual([
      "live-mainnet-rlusd-acceptance",
    ]);
    expect(
      result.acceptance.blocking_findings
        .filter((finding) => finding.status === "open")
        .map((finding) => finding.id),
    ).toEqual(["live-rlusd-acceptance-not-recorded"]);
    expect(result.productionTarget.operations_mode).toBe("halted");
    expect(result.wrangler.env.mainnet.vars.MAINNET_OPERATIONS_MODE).toBe(
      "halted",
    );
    expect(result.wrangler).toEqual(state.wrangler);
    expect(result.acceptance.controls.find(
      (control) => control.id === "live-mainnet-xrp-acceptance",
    )?.evidence).toContain("prevented duplicate settlement with exactly one receipt");
  });

  it("accepts a human-operated ceremony reference", () => {
    const humanReport = report();
    delete humanReport.workflow_run_url;
    humanReport.ceremony_reference = "controlled-mainnet-xrp-acceptance-2026-06-29";

    expect(() =>
      validateMainnetXrpAcceptanceReport(humanReport, SHA),
    ).not.toThrow();
  });

  it("rejects unsafe, incomplete, or mismatched public reports", () => {
    expect(() =>
      validateMainnetXrpAcceptanceReport(
        { ...report(), payment_token: "not-public" },
        SHA,
      ),
    ).toThrow("forbidden field");
    expect(() =>
      validateMainnetXrpAcceptanceReport(
        { ...report(), amount_drops: "1001" },
        SHA,
      ),
    ).toThrow("approved range");
    expect(() =>
      validateMainnetXrpAcceptanceReport(
        { ...report(), operations_restored_halted: false },
        SHA,
      ),
    ).toThrow();
    expect(() =>
      validateMainnetXrpAcceptanceReport(
        { ...report(), duplicate_receipt_count: 2 },
        SHA,
      ),
    ).toThrow();

    const missingReference = report();
    delete missingReference.workflow_run_url;
    expect(() =>
      validateMainnetXrpAcceptanceReport(missingReference, SHA),
    ).toThrow("exactly one workflow or human-operated ceremony reference");

    const duplicateReference = {
      ...report(),
      ceremony_reference: "also-present",
    };
    expect(() =>
      validateMainnetXrpAcceptanceReport(duplicateReference, SHA),
    ).toThrow("exactly one workflow or human-operated ceremony reference");

    const mismatchedReceipt = `mainnet:${"D".repeat(64)}`;
    const invalidReceiptReport = report();
    invalidReceiptReport.receipt_id = mismatchedReceipt;
    invalidReceiptReport.evidence_patch.receipt_id = mismatchedReceipt;
    expect(() =>
      validateMainnetXrpAcceptanceReport(invalidReceiptReport, SHA),
    ).toThrow("receipt identity");

    expect(() => validateMainnetXrpAcceptanceReport(report(), "d".repeat(40))).toThrow(
      "commit does not match",
    );
  });
});
