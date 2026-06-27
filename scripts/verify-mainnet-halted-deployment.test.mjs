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

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "xgp-halted-"));
  const configPath = join(directory, "wrangler.mainnet-halted.jsonc");
  await writeFile(configPath, '{"env":{"mainnet":{}}}\n');
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
          operations_halted: true,
          payment_creation_blocked: true,
          payment_verification_blocked: true,
          callback_verification_ready: true,
          sensitive_values_excluded: true,
        },
      });
      expect(report).not.toHaveProperty("evidence_patch");
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
