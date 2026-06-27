import { describe, expect, it } from "vitest";

import {
  assertHaltedDeploymentContract,
  buildHaltedMainnetWrangler,
} from "./mainnet-halted-deployment-config.mjs";

const contract = {
  schema_version: 1,
  network: "mainnet",
  stage: "halted-deployment-review",
  confirmation: "DEPLOY XRPL GROUP PAY MAINNET HALTED",
  worker_name: "xrpl-group-pay-mainnet",
  public_origin: "https://xgp.badjoke-lab.com",
  custom_domain: "xgp.badjoke-lab.com",
  callback_path: "/api/xaman/callback",
  database_binding: "PAYMENTS_DB_MAINNET",
  source_tag: 2171267705,
  runtime_allowed: true,
  gate_approved: true,
  source_tag_approved: true,
  release_mode: "internal",
  operations_mode: "halted",
};

function sourceConfig() {
  return {
    name: "xrpl-group-pay",
    main: ".open-next/worker.js",
    d1_databases: [
      {
        binding: "PAYMENTS_DB",
        database_id: "33333333-3333-4333-8333-333333333333",
        preview_database_id: "44444444-4444-4444-8444-444444444444",
      },
    ],
    env: {
      mainnet: {
        name: "xrpl-group-pay-mainnet",
        vars: {
          APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_URL: "https://xgp.badjoke-lab.com",
          ALLOW_MAINNET_RUNTIME: "false",
          MAINNET_GATE_APPROVED: "false",
          XRPL_MAINNET_SOURCE_TAG: "2171267705",
          MAINNET_SOURCE_TAG_APPROVED: "false",
          MAINNET_RELEASE_MODE: "disabled",
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
      },
    },
  };
}

function input() {
  return {
    contract,
    wrangler: sourceConfig(),
    releasePlan: {
      current_stage: "halted-deployment-review",
      release_decision: "blocked",
    },
    evidence: {
      records: [
        { id: "production-provider-attestation", status: "accepted" },
        { id: "production-release-configuration", status: "pending" },
      ],
    },
  };
}

describe("halted Mainnet deployment configuration", () => {
  it("accepts the fixed contract", () => {
    expect(assertHaltedDeploymentContract(contract)).toEqual(contract);
  });

  it("generates an isolated internal target with halted operations", () => {
    const generated = buildHaltedMainnetWrangler(input());
    expect(generated.d1_databases).toBeUndefined();
    expect(generated.env.mainnet.d1_databases).toHaveLength(1);
    expect(generated.env.mainnet.d1_databases[0].binding).toBe(
      "PAYMENTS_DB_MAINNET",
    );
    expect(generated.env.mainnet.vars).toMatchObject({
      ALLOW_MAINNET_RUNTIME: "true",
      MAINNET_GATE_APPROVED: "true",
      MAINNET_SOURCE_TAG_APPROVED: "true",
      MAINNET_RELEASE_MODE: "internal",
      MAINNET_OPERATIONS_MODE: "halted",
    });
    expect(generated.env.mainnet.routes).toEqual([
      { pattern: "xgp.badjoke-lab.com", custom_domain: true },
    ]);
    expect(generated.env.mainnet.workers_dev).toBe(false);
  });

  it("leaves the source configuration unchanged", () => {
    const source = sourceConfig();
    buildHaltedMainnetWrangler({ ...input(), wrangler: source });
    expect(source.d1_databases[0].binding).toBe("PAYMENTS_DB");
    expect(source.env.mainnet.vars.ALLOW_MAINNET_RUNTIME).toBe("false");
    expect(source.env.mainnet.routes).toBeUndefined();
  });

  it("rejects stage and database isolation drift", () => {
    const wrongStage = input();
    wrongStage.releasePlan.current_stage = "live-xrp-acceptance";
    expect(() => buildHaltedMainnetWrangler(wrongStage)).toThrow(
      "halted-deployment-review stage",
    );

    const sharedDatabase = input();
    sharedDatabase.wrangler.env.mainnet.d1_databases[0].preview_database_id =
      sharedDatabase.wrangler.env.mainnet.d1_databases[0].database_id;
    expect(() => buildHaltedMainnetWrangler(sharedDatabase)).toThrow(
      "isolated Mainnet D1 bindings",
    );
  });
});
