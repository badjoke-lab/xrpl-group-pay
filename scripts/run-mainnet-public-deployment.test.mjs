import { describe, expect, it, vi } from "vitest";

import { runMainnetPublicDeployment } from "./run-mainnet-public-deployment.mjs";

function environment() {
  return {
    GITHUB_ACTIONS: "true",
    MAINNET_PUBLIC_DEPLOYMENT_CONFIRMATION:
      "DEPLOY XRPL GROUP PAY MAINNET PUBLIC",
    CLOUDFLARE_API_TOKEN: "configured",
    CLOUDFLARE_ACCOUNT_ID: "configured",
    MAINNET_XAMAN_API_KEY: "configured",
    MAINNET_XAMAN_API_SECRET: "configured",
    RUNNER_TEMP: "/tmp/xgp-runner",
    GITHUB_WORKSPACE: "/tmp/xgp-workspace",
    GITHUB_SHA: "a".repeat(40),
    GITHUB_RUN_ID: "123456",
  };
}

function dependencies(overrides = {}) {
  return {
    runCommand: vi.fn(),
    verify: vi.fn().mockResolvedValue({ state: "verified" }),
    prepareConfig: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    writeSecretFile: vi.fn().mockResolvedValue(undefined),
    writeStageFile: vi.fn().mockResolvedValue(undefined),
    removeFile: vi.fn().mockResolvedValue(undefined),
    wait: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("Mainnet public deployment runner", () => {
  it("requires GitHub Actions and the exact confirmation", async () => {
    await expect(
      runMainnetPublicDeployment({
        environment: { ...environment(), GITHUB_ACTIONS: "false" },
        ...dependencies(),
      }),
    ).rejects.toThrow("only in GitHub Actions");

    await expect(
      runMainnetPublicDeployment({
        environment: {
          ...environment(),
          MAINNET_PUBLIC_DEPLOYMENT_CONFIRMATION: "wrong",
        },
        ...dependencies(),
      }),
    ).rejects.toThrow("confirmation is invalid");
  });

  it("records secret validation before rejecting a missing secret", async () => {
    const deps = dependencies();
    const input = environment();
    delete input.MAINNET_XAMAN_API_SECRET;

    await expect(
      runMainnetPublicDeployment({
        environment: input,
        ...deps,
      }),
    ).rejects.toThrow("MAINNET_XAMAN_API_SECRET is required");

    expect(deps.writeStageFile).toHaveBeenCalledOnce();
    expect(deps.writeStageFile.mock.calls[0][1]).toContain(
      '"stage": "validate-deployment-secrets"',
    );
    expect(deps.runCommand).not.toHaveBeenCalled();
    expect(deps.rollback).not.toHaveBeenCalled();
  });

  it("builds, deploys, verifies, and avoids rollback on success", async () => {
    const deps = dependencies();
    const result = await runMainnetPublicDeployment({
      environment: environment(),
      ...deps,
    });

    expect(result).toEqual({ state: "verified" });
    expect(deps.runCommand).toHaveBeenCalledTimes(3);
    expect(deps.verify).toHaveBeenCalledOnce();
    expect(deps.rollback).not.toHaveBeenCalled();
  });

  it("restores halted mode when post-deploy verification fails", async () => {
    const deps = dependencies({
      verify: vi.fn().mockRejectedValue(new Error("verification failed")),
    });

    await expect(
      runMainnetPublicDeployment({
        environment: environment(),
        ...deps,
      }),
    ).rejects.toThrow("verification failed");
    expect(deps.verify).toHaveBeenCalledTimes(30);
    expect(deps.rollback).toHaveBeenCalledOnce();
    expect(deps.rollback.mock.calls[0][0].environment).toMatchObject({
      MAINNET_HALTED_DEPLOYMENT_CONFIRMATION:
        "DEPLOY XRPL GROUP PAY MAINNET HALTED",
    });
  });
});
