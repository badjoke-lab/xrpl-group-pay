import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertEvidenceMatchesAcceptance,
  assertEvidenceMatchesConfiguration,
} from "./check-mainnet-release-evidence.mjs";
import { assertProductionTarget } from "./check-production-target.mjs";
import { applyMainnetHaltedDeploymentReport } from "./mainnet-halted-deployment-report.mjs";

const SHA = "a".repeat(40);
const RUN_URL =
  "https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/28299999999";
const GENERATED_AT = "2026-06-27T14:00:00.000Z";

function report() {
  return {
    schema_version: 1,
    network: "mainnet",
    generated_at: GENERATED_AT,
    git_sha: SHA,
    state: "verified",
    workflow_run_url: RUN_URL,
    public_url: "https://xgp.badjoke-lab.com",
    worker_name: "xrpl-group-pay-mainnet",
    configuration_digest: "b".repeat(64),
    checks: {
      deployment_reachable: true,
      custom_domain_https_checked: true,
      runtime_configuration_checked: true,
      release_mode_internal: true,
      operations_halted: true,
      payment_creation_blocked: true,
      payment_verification_blocked: true,
      callback_route_checked: true,
      callback_verification_ready: true,
      sensitive_values_excluded: true,
    },
    evidence_patch: {
      id: "production-release-configuration",
      status: "accepted",
      recorded_at: GENERATED_AT,
      public_url: "https://xgp.badjoke-lab.com",
      app_network: "mainnet",
      public_network: "mainnet",
      database_binding: "PAYMENTS_DB_MAINNET",
      runtime_allowed: true,
      gate_approved: true,
      source_tag_approved: true,
      release_mode: "internal",
      operations_mode: "halted",
    },
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
  const [
    evidence,
    acceptance,
    releasePlan,
    wranglerSource,
    productionTarget,
    assetRegistry,
    routeSource,
  ] = await Promise.all([
    readFile(resolve(root, "config/mainnet-release-evidence.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-acceptance.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-release-plan.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "wrangler.jsonc"), "utf8"),
    readFile(resolve(root, "config/production-target.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/xrpl-mainnet-assets.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "src/app/api/xaman/callback/route.ts"), "utf8"),
  ]);

  return {
    evidence,
    acceptance,
    releasePlan,
    wrangler: parseJsonc(wranglerSource),
    productionTarget,
    assetRegistry,
    routeSource,
  };
}

describe("halted Mainnet deployment report import", () => {
  it("advances to live XRP acceptance while keeping operations halted", async () => {
    const state = await repositoryState();
    const result = applyMainnetHaltedDeploymentReport({
      report: report(),
      expectedGitSha: SHA,
      ...state,
    });

    expect(() =>
      assertEvidenceMatchesAcceptance(result.evidence, result.acceptance),
    ).not.toThrow();
    expect(() =>
      assertEvidenceMatchesConfiguration(
        result.evidence,
        JSON.stringify(result.wrangler),
        state.assetRegistry,
      ),
    ).not.toThrow();
    expect(() =>
      assertProductionTarget({
        target: result.productionTarget,
        wrangler: result.wrangler,
        routeSource: state.routeSource,
      }),
    ).not.toThrow();

    expect(result.releasePlan.current_stage).toBe("live-xrp-acceptance");
    expect(result.releasePlan.remaining_evidence).toEqual([
      "live-mainnet-xrp-acceptance",
      "live-mainnet-rlusd-acceptance",
    ]);
    expect(result.releasePlan.staged_target.committed).toBe(true);
    expect(result.wrangler.env.mainnet.vars).toMatchObject({
      ALLOW_MAINNET_RUNTIME: "true",
      MAINNET_GATE_APPROVED: "true",
      MAINNET_SOURCE_TAG_APPROVED: "true",
      MAINNET_RELEASE_MODE: "internal",
      MAINNET_OPERATIONS_MODE: "halted",
    });
    expect(
      result.acceptance.blocking_findings
        .filter((finding) => finding.status === "open")
        .map((finding) => finding.id)
        .sort(),
    ).toEqual(
      [
        "live-rlusd-acceptance-not-recorded",
        "live-xrp-acceptance-not-recorded",
      ].sort(),
    );
  });

  it("rejects a report containing protected deployment fields", async () => {
    const state = await repositoryState();
    await expect(() =>
      applyMainnetHaltedDeploymentReport({
        report: { ...report(), cloudflare_api_token: "not-public" },
        expectedGitSha: SHA,
        ...state,
      }),
    ).toThrow("forbidden field");
  });
});
