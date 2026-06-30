import { describe, expect, it } from "vitest";

import {
  assertMainnetPublicDeploymentContract,
  buildPublicMainnetWrangler,
} from "./mainnet-public-deployment-config.mjs";

const contract = {
  schema_version: 1,
  network: "mainnet",
  stage: "public-operating-deployment",
  confirmation: "DEPLOY XRPL GROUP PAY MAINNET PUBLIC",
  worker_name: "xrpl-group-pay-mainnet",
  public_origin: "https://xgp.badjoke-lab.com",
  custom_domain: "xgp.badjoke-lab.com",
  callback_path: "/api/xaman/callback",
  database_binding: "PAYMENTS_DB_MAINNET",
  source_tag: 2171267705,
  runtime_allowed: true,
  gate_approved: true,
  source_tag_approved: true,
  release_mode: "public",
  operations_mode: "enabled",
  required_baseline_release_mode: "internal",
  required_baseline_operations_mode: "halted",
  require_final_audit_approved: true,
  automatic_rollback_mode: "halted",
};

function input() {
  return {
    contract,
    wrangler: {
      name: "xrpl-group-pay",
      main: ".open-next/worker.js",
      d1_databases: [{ binding: "PAYMENTS_DB" }],
      env: {
        mainnet: {
          name: "xrpl-group-pay-mainnet",
          vars: {
            APP_NETWORK: "mainnet",
            NEXT_PUBLIC_APP_NETWORK: "mainnet",
            NEXT_PUBLIC_APP_URL: "https://xgp.badjoke-lab.com",
            ALLOW_MAINNET_RUNTIME: "true",
            MAINNET_GATE_APPROVED: "true",
            XRPL_MAINNET_SOURCE_TAG: "2171267705",
            MAINNET_SOURCE_TAG_APPROVED: "true",
            MAINNET_RELEASE_MODE: "internal",
            MAINNET_OPERATIONS_MODE: "halted",
            PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
          },
          d1_databases: [
            {
              binding: "PAYMENTS_DB_MAINNET",
              database_id: "11111111-1111-4111-8111-111111111111",
              preview_database_id: "22222222-2222-4222-8222-222222222222",
            },
          ],
          routes: [
            {
              pattern: "xgp.badjoke-lab.com",
              custom_domain: true,
            },
          ],
          workers_dev: false,
        },
      },
    },
    releasePlan: {
      state: "ready",
      review_status: "approved",
      release_decision: "approved",
      current_stage: "final-release-audit",
      stages: [
        { id: "foundations", status: "complete" },
        { id: "provider-attestation", status: "complete" },
        { id: "halted-deployment-review", status: "complete" },
        { id: "live-xrp-acceptance", status: "complete" },
        { id: "live-rlusd-acceptance", status: "complete" },
        { id: "final-release-audit", status: "complete" },
      ],
    },
    gate: {
      state: "ready",
      checks: [{ id: "mainnet-acceptance-audit", status: "passed" }],
    },
    acceptance: {
      release_decision: "approved",
      controls: [{ id: "final-release-audit", status: "passed" }],
      blocking_findings: [
        { id: "final-release-audit-not-complete", status: "resolved" },
      ],
    },
    evidence: {
      records: [
        { id: "production-d1-provisioning", status: "accepted" },
        { id: "production-provider-attestation", status: "accepted" },
        { id: "production-release-configuration", status: "accepted" },
        { id: "assigned-mainnet-source-tag", status: "accepted" },
        { id: "live-mainnet-xrp-acceptance", status: "accepted" },
        { id: "live-mainnet-rlusd-acceptance", status: "accepted" },
        { id: "operational-stop-drill", status: "accepted" },
      ],
    },
    productionTarget: {
      network: "mainnet",
      public_origin: "https://xgp.badjoke-lab.com",
      deployment: "deployed",
      release_mode: "internal",
      operations_mode: "halted",
    },
  };
}

describe("Mainnet public deployment configuration", () => {
  it("accepts the fixed public deployment contract", () => {
    expect(assertMainnetPublicDeploymentContract(contract)).toEqual(contract);
  });

  it("generates public enabled configuration from the reviewed halted baseline", () => {
    const source = input();
    const generated = buildPublicMainnetWrangler(source);

    expect(generated.d1_databases).toBeUndefined();
    expect(generated.env.mainnet.vars).toMatchObject({
      MAINNET_RELEASE_MODE: "public",
      MAINNET_OPERATIONS_MODE: "enabled",
      ALLOW_MAINNET_RUNTIME: "true",
      MAINNET_GATE_APPROVED: "true",
      MAINNET_SOURCE_TAG_APPROVED: "true",
    });
    expect(
      generated.env.mainnet.vars.MAINNET_ACCEPTANCE_EXPIRES_AT,
    ).toBeUndefined();
    expect(generated.env.mainnet.d1_databases[0].binding).toBe(
      "PAYMENTS_DB_MAINNET",
    );
    expect(source.wrangler.env.mainnet.vars.MAINNET_RELEASE_MODE).toBe(
      "internal",
    );
  });

  it("rejects an incomplete gate or a non-halted baseline", () => {
    const incomplete = input();
    incomplete.gate.state = "blocked";
    expect(() => buildPublicMainnetWrangler(incomplete)).toThrow(
      "Mainnet gate is not ready",
    );

    const enabled = input();
    enabled.productionTarget.operations_mode = "enabled";
    expect(() => buildPublicMainnetWrangler(enabled)).toThrow(
      "baseline must remain internal and halted",
    );
  });
});
