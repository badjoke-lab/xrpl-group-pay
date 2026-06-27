import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  validateMainnetHaltedDeploymentReport,
  verifyMainnetHaltedDeployment,
} from "./verify-mainnet-halted-deployment.mjs";

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

function successfulFetcher() {
  return vi
    .fn()
    .mockResolvedValueOnce(new Response("ok", { status: 200 }))
    .mockResolvedValueOnce(
      json({
        schemaVersion: 1,
        network: "mainnet",
        status: "halted",
        mode: "halted",
        operations: { create: false, verify: false },
      }),
    )
    .mockResolvedValueOnce(
      json(
        {
          error: {
            code: "INVALID_XAMAN_SIGNATURE",
            message: "The Xaman callback signature is invalid.",
          },
        },
        401,
      ),
    );
}

describe("halted Mainnet deployment verification", () => {
  it("records a reachable deployment with payment operations halted", async () => {
    const { directory, configPath } = await fixture();
    const fetcher = successfulFetcher();
    try {
      const report = await verifyMainnetHaltedDeployment({
        environment: environment(configPath),
        fetcher,
        now: () => new Date("2026-06-27T12:30:00.000Z"),
      });

      expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
        "https://xgp.badjoke-lab.com/",
        "https://xgp.badjoke-lab.com/api/status/payments",
        "https://xgp.badjoke-lab.com/api/xaman/callback",
      ]);
      expect(report).toMatchObject({
        state: "verified",
        git_sha: SHA,
        public_url: "https://xgp.badjoke-lab.com",
        checks: {
          operations_halted: true,
          payment_creation_blocked: true,
          payment_verification_blocked: true,
          callback_secret_configured: true,
          secrets_committed: false,
        },
        evidence_patch: {
          id: "production-release-configuration",
          status: "accepted",
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

  it("rejects a deployment that enables payment creation", async () => {
    const { directory, configPath } = await fixture();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("ok", { status: 200 }))
      .mockResolvedValueOnce(
        json({
          schemaVersion: 1,
          network: "mainnet",
          status: "operational",
          mode: "enabled",
          operations: { create: true, verify: true },
        }),
      );
    try {
      await expect(
        verifyMainnetHaltedDeployment({
          environment: environment(configPath),
          fetcher,
        }),
      ).rejects.toThrow("not safely halted");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects an unavailable callback secret", async () => {
    const { directory, configPath } = await fixture();
    const fetcher = successfulFetcher();
    fetcher.mockImplementationOnce(async () => new Response("ok", { status: 200 }));
    fetcher.mockImplementationOnce(async () =>
      json({
        schemaVersion: 1,
        network: "mainnet",
        status: "halted",
        mode: "halted",
        operations: { create: false, verify: false },
      }),
    );
    fetcher.mockImplementationOnce(async () =>
      json({ error: { code: "XAMAN_WEBHOOK_UNAVAILABLE" } }, 503),
    );
    try {
      await expect(
        verifyMainnetHaltedDeployment({
          environment: environment(configPath),
          fetcher,
        }),
      ).rejects.toThrow("did not reject unsigned input");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("binds public evidence to the expected commit", () => {
    expect(() =>
      validateMainnetHaltedDeploymentReport(
        {
          schema_version: 1,
          network: "mainnet",
          generated_at: "2026-06-27T12:30:00.000Z",
          git_sha: SHA,
          state: "verified",
          workflow_run_url:
            "https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/28290000000",
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
            callback_secret_configured: true,
            secrets_committed: false,
          },
          evidence_patch: {
            id: "production-release-configuration",
            status: "accepted",
            recorded_at: "2026-06-27T12:30:00.000Z",
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
        },
        "c".repeat(40),
      ),
    ).toThrow("commit does not match");
  });
});
