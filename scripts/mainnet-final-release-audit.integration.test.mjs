import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertMainnetAcceptanceDocument,
  assertMainnetAcceptanceMatchesGate,
} from "./check-mainnet-acceptance.mjs";
import { assertMainnetGate } from "./check-mainnet-gate.mjs";
import {
  assertEvidenceMatchesAcceptance,
  assertEvidenceMatchesConfiguration,
} from "./check-mainnet-release-evidence.mjs";
import { assertMainnetReleasePlan } from "./check-mainnet-release-plan.mjs";
import { assertProductionTarget } from "./check-production-target.mjs";
import { validateMainnetFinalReleaseAuditReport } from "./mainnet-final-release-audit-report.mjs";

const MERGE_SHA = "03ca2bd454c71e63166de21192db82f91832736b";

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
    gate,
    releasePlan,
    productionTarget,
    wranglerSource,
    assetRegistry,
    sourceTag,
    routeSource,
  ] = await Promise.all([
    readFile(
      resolve(root, "evidence/mainnet-final-release-audit-2026-06-30.json"),
      "utf8",
    ).then(JSON.parse),
    readFile(resolve(root, "config/mainnet-release-evidence.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-acceptance.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-gate.json"), "utf8").then(JSON.parse),
    readFile(resolve(root, "config/mainnet-release-plan.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/production-target.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "wrangler.jsonc"), "utf8"),
    readFile(resolve(root, "config/xrpl-mainnet-assets.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-source-tag.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "src/app/api/xaman/callback/route.ts"), "utf8"),
  ]);
  return {
    report,
    evidence,
    acceptance,
    gate,
    releasePlan,
    productionTarget,
    wrangler: parseJsonc(wranglerSource),
    wranglerSource,
    assetRegistry,
    sourceTag,
    routeSource,
  };
}

describe("Mainnet final release audit", () => {
  it("approves the repository gate while preserving internal halted production", async () => {
    const state = await repositoryState();

    expect(() =>
      validateMainnetFinalReleaseAuditReport(state.report, MERGE_SHA),
    ).not.toThrow();
    expect(() =>
      assertEvidenceMatchesAcceptance(state.evidence, state.acceptance),
    ).not.toThrow();
    expect(() =>
      assertEvidenceMatchesConfiguration(
        state.evidence,
        state.wranglerSource,
        state.assetRegistry,
      ),
    ).not.toThrow();
    expect(() => assertMainnetAcceptanceDocument(state.acceptance)).not.toThrow();
    expect(() =>
      assertMainnetAcceptanceMatchesGate(state.acceptance, state.gate),
    ).not.toThrow();
    expect(() => assertMainnetGate(state.gate)).not.toThrow();
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
    expect(() =>
      assertProductionTarget({
        target: state.productionTarget,
        wrangler: state.wrangler,
        routeSource: state.routeSource,
      }),
    ).not.toThrow();

    expect(state.productionTarget).toMatchObject({
      deployment: "deployed",
      release_mode: "internal",
      operations_mode: "halted",
    });
    expect(state.report).toMatchObject({
      release_decision: "approved",
      gate_state: "ready",
      new_transaction_performed: false,
      new_handoff_created: false,
      production_deployment_performed: false,
      public_operating_configuration_applied: false,
    });
  });

  it("rejects protected or unsafe final audit reports", async () => {
    const { report } = await repositoryState();
    expect(() =>
      validateMainnetFinalReleaseAuditReport(
        { ...report, payment_token: "not-public" },
        MERGE_SHA,
      ),
    ).toThrow("forbidden field");
    expect(() =>
      validateMainnetFinalReleaseAuditReport(
        {
          ...report,
          production_target: {
            ...report.production_target,
            operations_mode: "enabled",
          },
        },
        MERGE_SHA,
      ),
    ).toThrow();
  });
});
