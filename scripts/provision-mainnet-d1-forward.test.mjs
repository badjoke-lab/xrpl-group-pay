import { describe, expect, it } from "vitest";

import {
  classifyMainnetD1State,
  createProvisionedWrangler,
} from "./provision-mainnet-d1.mjs";

const PRODUCTION_ID = "11111111-1111-4111-8111-111111111111";
const PREVIEW_ID = "22222222-2222-4222-8222-222222222222";

const policy = {
  binding: "PAYMENTS_DB_MAINNET",
  production_database_name: "xrpl-group-pay-mainnet",
};

function reviewedConfig(overrides = {}) {
  return {
    name: "xrpl-group-pay",
    env: {
      mainnet: {
        name: "xrpl-group-pay-mainnet",
        vars: {
          APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_URL: "https://xgp.badjoke-lab.com",
          ALLOW_MAINNET_RUNTIME: "true",
          MAINNET_GATE_APPROVED: "true",
          MAINNET_SOURCE_TAG_APPROVED: "true",
          XRPL_MAINNET_SOURCE_TAG: "2171267705",
          MAINNET_RELEASE_MODE: "internal",
          MAINNET_OPERATIONS_MODE: "halted",
          PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
          ...overrides,
        },
        d1_databases: [
          {
            binding: "PAYMENTS_DB_MAINNET",
            database_name: "xrpl-group-pay-mainnet",
            database_id: PRODUCTION_ID,
            preview_database_id: PREVIEW_ID,
            migrations_dir: "migrations",
          },
        ],
        routes: [
          { pattern: "xgp.badjoke-lab.com", custom_domain: true },
        ],
        workers_dev: false,
      },
    },
  };
}

describe("reviewed halted Mainnet D1 forward migration", () => {
  it("accepts the exact reviewed internal halted target", () => {
    expect(classifyMainnetD1State(reviewedConfig(), policy)).toMatchObject({
      kind: "reviewed-halted",
      binding: {
        database_id: PRODUCTION_ID,
        preview_database_id: PREVIEW_ID,
      },
    });
  });

  it("preserves reviewed IDs and operational state", () => {
    const generated = JSON.parse(
      createProvisionedWrangler(
        JSON.stringify(reviewedConfig()),
        policy,
        { productionId: PRODUCTION_ID, previewId: PREVIEW_ID },
      ),
    );

    expect(generated.env.mainnet.vars).toMatchObject({
      MAINNET_RELEASE_MODE: "internal",
      MAINNET_OPERATIONS_MODE: "halted",
    });
    expect(generated.env.mainnet.d1_databases[0]).toMatchObject({
      database_id: PRODUCTION_ID,
      preview_database_id: PREVIEW_ID,
    });
  });

  it("rejects ID replacement and operational activation", () => {
    expect(() =>
      createProvisionedWrangler(
        JSON.stringify(reviewedConfig()),
        policy,
        {
          productionId: "33333333-3333-4333-8333-333333333333",
          previewId: PREVIEW_ID,
        },
      ),
    ).toThrow("must not change");

    expect(() =>
      classifyMainnetD1State(
        reviewedConfig({ MAINNET_OPERATIONS_MODE: "enabled" }),
        policy,
      ),
    ).toThrow("safe default ALLOW_MAINNET_RUNTIME=false");
  });
});
