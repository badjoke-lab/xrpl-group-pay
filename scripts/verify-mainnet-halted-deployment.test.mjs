import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { verifyMainnetHaltedDeployment } from "./verify-mainnet-halted-deployment.mjs";

const SHA = "a".repeat(40);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function runtimeConfig(overrides = {}) {
  return {
    env: {
      mainnet: {
        name: "xrpl-group-pay-mainnet",
        workers_dev: false,
        routes: [
          { pattern: "xgp.badjoke-lab.com", custom_domain: true },
        ],
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
            database_id: "11111111-1111-4111-8111-111111111111",
            preview_database_id: "22222222-2222-4222-8222-222222222222",
          },
        ],
      },
    },
  };
}

async function fixture(overrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), "xgp-halted-"));
  const configPath = join(directory, "wrangler.mainnet-halted.jsonc");
  await writeFile(
    configPath,
    `${JSON.stringify(runtimeConfig(overrides), null, 2)}\n`,
  );
  return { directory, configPath };
}

function environment(configPath) {
  return {
    MAINNET_HALTED_DEPLOYMENT_CONFIRMATION:
      "DEPLOY XRPL GROUP PAY MAINNET HALTED",
    MAINNET_HALTED_WRANGLER_PATH: configPath,
    GITHUB_SHA: SHA,
    GITHUB_RUN_ID: "28290000000",
    GITHUB_REPOSITORY: "badjoke-lab/xrpl-group-pay",
    GITHUB_SERVER_URL: "https://github.com",
  };
}

function statusBody(overrides = {}) {
  return {
    schemaVersion: 1,
    network: "mainnet",
    status: "halted",
    mode: "halted",
    operations: { create: false, verify: false },
    ...overrides,
  };
}

function fetcher(status = statusBody(), callbackStatus = 401) {
  return vi
    .fn()
    .mockResolvedValueOnce(new Response("ok", { status: 200 }))
    .mockResolvedValueOnce(json(status))
    .mockResolvedValueOnce(
      json(
        {
          error: {
            code:
              callbackStatus === 401
                ? "INVALID_XAMAN_SIGNATURE"
                : "XAMAN_WEBHOOK_UNAVAILABLE",
          },
        },
        callbackStatus,
      ),
    );
}

describe("halted Mainnet deployment verification", () => {
  it("records a reachable target with both payment operations disabled", async () => {
    const { directory, configPath } = await fixture();
    const request = fetcher();
    try {
      const report = await verifyMainnetHaltedDeployment({
        environment: environment(configPath),
        fetcher: request,
        now: () => new Date("2026-06-27T12:30:00.000Z"),
      });

      expect(request.mock.calls.map(([url]) => url)).toEqual([
        "https://xgp.badjoke-lab.com/",
        "https://xgp.badjoke-lab.com/api/status/payments",
        "https://xgp.badjoke-lab.com/api/xaman/callback",
      ]);
      expect(report).toMatchObject({
        state: "verified",
        git_sha: SHA,
        checks: {
          runtime_configuration_checked: true,
          operations_halted: true,
          payment_creation_blocked: true,
          payment_verification_blocked: true,
          callback_verification_ready: true,
          sensitive_values_excluded: true,
        },
        evidence_patch: {
          id: "production-release-configuration",
          status: "accepted",
          public_url: "https://xgp.badjoke-lab.com",
          database_binding: "PAYMENTS_DB_MAINNET",
          runtime_allowed: true,
          gate_approved: true,
          source_tag_approved: true,
          release_mode: "internal",
          operations_mode: "halted",
        },
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects staged configuration drift before any public request", async () => {
    const { directory, configPath } = await fixture({
      MAINNET_RELEASE_MODE: "public",
    });
    const request = fetcher();
    try {
      await expect(
        verifyMainnetHaltedDeployment({
          environment: environment(configPath),
          fetcher: request,
        }),
      ).rejects.toThrow("runtime configuration is invalid");
      expect(request).not.toHaveBeenCalled();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects a target that enables payment operations", async () => {
    const { directory, configPath } = await fixture();
    try {
      await expect(
        verifyMainnetHaltedDeployment({
          environment: environment(configPath),
          fetcher: fetcher(
            statusBody({
              status: "operational",
              mode: "enabled",
              operations: { create: true, verify: true },
            }),
          ),
        }),
      ).rejects.toThrow("not safely halted");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects a callback route without its verification configuration", async () => {
    const { directory, configPath } = await fixture();
    try {
      await expect(
        verifyMainnetHaltedDeployment({
          environment: environment(configPath),
          fetcher: fetcher(statusBody(), 503),
        }),
      ).rejects.toThrow("did not reject unsigned input");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
