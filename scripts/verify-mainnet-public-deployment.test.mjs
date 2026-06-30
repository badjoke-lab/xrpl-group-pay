import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assertPublicMainnetRuntimeConfiguration,
  validateMainnetPublicDeploymentReport,
  verifyMainnetPublicDeployment,
} from "./verify-mainnet-public-deployment.mjs";

const SHA = "a".repeat(40);
const NOW = "2026-06-30T15:00:00.000Z";
const directories = [];

function config() {
  return {
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
          MAINNET_RELEASE_MODE: "public",
          MAINNET_OPERATIONS_MODE: "enabled",
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
  };
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "xgp-public-"));
  directories.push(directory);
  const path = join(directory, "wrangler.jsonc");
  await writeFile(path, `${JSON.stringify(config(), null, 2)}\n`);
  return {
    path,
    environment: {
      MAINNET_PUBLIC_DEPLOYMENT_CONFIRMATION:
        "DEPLOY XRPL GROUP PAY MAINNET PUBLIC",
      MAINNET_PUBLIC_WRANGLER_PATH: path,
      GITHUB_SHA: SHA,
      GITHUB_RUN_ID: "123456",
      GITHUB_REPOSITORY: "badjoke-lab/xrpl-group-pay",
      GITHUB_SERVER_URL: "https://github.com",
    },
  };
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("Mainnet public deployment verification", () => {
  it("accepts the isolated public enabled runtime configuration", () => {
    expect(
      assertPublicMainnetRuntimeConfiguration(JSON.stringify(config())),
    ).toMatchObject({
      workerName: "xrpl-group-pay-mainnet",
      releaseMode: "public",
      operationsMode: "enabled",
    });
  });

  it("verifies the public status endpoint and guarded callback", async () => {
    const { environment } = await fixture();
    const fetcher = async (url) => {
      if (url.endsWith("/api/status/payments")) {
        return new Response(
          JSON.stringify({
            schemaVersion: 1,
            network: "mainnet",
            status: "operational",
            mode: "enabled",
            operations: { create: true, verify: true },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/api/xaman/callback")) {
        return new Response(
          JSON.stringify({
            error: { code: "INVALID_XAMAN_SIGNATURE" },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("ok", { status: 200 });
    };

    const report = await verifyMainnetPublicDeployment({
      environment,
      fetcher,
      now: () => new Date(NOW),
    });

    expect(report).toMatchObject({
      git_sha: SHA,
      state: "verified",
      release_mode: "public",
      operations_mode: "enabled",
      checks: {
        payment_creation_enabled: true,
        payment_verification_enabled: true,
      },
    });
    expect(() =>
      validateMainnetPublicDeploymentReport(report, "b".repeat(40)),
    ).toThrow("commit does not match");
  });

  it("rejects a non-operational public status", async () => {
    const { environment } = await fixture();
    const fetcher = async (url) => {
      if (url.endsWith("/api/status/payments")) {
        return new Response(
          JSON.stringify({
            schemaVersion: 1,
            network: "mainnet",
            status: "halted",
            mode: "halted",
            operations: { create: false, verify: false },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("ok", { status: 200 });
    };

    await expect(
      verifyMainnetPublicDeployment({
        environment,
        fetcher,
        now: () => new Date(NOW),
      }),
    ).rejects.toThrow("payment operations endpoint is not enabled");
  });
});
