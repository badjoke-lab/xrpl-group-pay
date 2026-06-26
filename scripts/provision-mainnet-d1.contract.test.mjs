import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertProvisioningRequest,
  createProvisionedWrangler,
} from "./provision-mainnet-d1.mjs";

const PRODUCTION_ID = "11111111-1111-4111-8111-111111111111";
const PREVIEW_ID = "22222222-2222-4222-8222-222222222222";

async function readRepositoryFile(path) {
  return readFile(resolve(process.cwd(), path), "utf8");
}

describe("repository Mainnet D1 provisioning contract", () => {
  it("keeps the committed Wrangler target halted while accepting temporary isolated IDs", async () => {
    const [policySource, wranglerSource] = await Promise.all([
      readRepositoryFile("config/mainnet-d1-provisioning.json"),
      readRepositoryFile("wrangler.jsonc"),
    ]);
    const policy = JSON.parse(policySource);
    const temporaryConfig = JSON.parse(
      createProvisionedWrangler(wranglerSource, policy, {
        productionId: PRODUCTION_ID,
        previewId: PREVIEW_ID,
      }),
    );

    expect(temporaryConfig.env.mainnet.vars).toMatchObject({
      ALLOW_MAINNET_RUNTIME: "false",
      MAINNET_GATE_APPROVED: "false",
      MAINNET_SOURCE_TAG_APPROVED: "false",
      MAINNET_RELEASE_MODE: "disabled",
      MAINNET_OPERATIONS_MODE: "halted",
      PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
    });
    expect(temporaryConfig.env.mainnet.d1_databases).toEqual([
      expect.objectContaining({
        binding: policy.binding,
        database_name: policy.production_database_name,
        database_id: PRODUCTION_ID,
        preview_database_id: PREVIEW_ID,
      }),
    ]);
  });

  it("keeps confirmation phrases and location values machine-consistent", async () => {
    const policy = JSON.parse(
      await readRepositoryFile("config/mainnet-d1-provisioning.json"),
    );

    expect(() =>
      assertProvisioningRequest(policy, {
        mode: "inspect",
        confirmation: policy.inspect_confirmation,
        location: policy.default_location,
      }),
    ).not.toThrow();
    expect(() =>
      assertProvisioningRequest(policy, {
        mode: "provision",
        confirmation: policy.provision_confirmation,
        location: policy.default_location,
      }),
    ).not.toThrow();
    expect(policy.production_database_name).not.toBe(
      policy.preview_database_name,
    );
    expect(policy.required_tables).toContain("_cf_KV");
    expect(policy.required_tables).toContain("verified_payment_records");
  });

  it("keeps the remote workflow manual, serialized, read-only, and non-deploying", async () => {
    const workflow = await readRepositoryFile(
      ".github/workflows/provision-mainnet-d1.yml",
    );

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("pull_request:");
    expect(workflow).not.toContain("push:");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("environment: mainnet-provisioning");
    expect(workflow).toContain("secrets.MAINNET_D1_API_TOKEN");
    expect(workflow).toContain("secrets.MAINNET_D1_ACCOUNT_ID");
    expect(workflow).not.toContain("wrangler deploy");
    expect(workflow).not.toContain("opennextjs-cloudflare deploy");
    expect(workflow).not.toContain("contents: write");
  });
});
