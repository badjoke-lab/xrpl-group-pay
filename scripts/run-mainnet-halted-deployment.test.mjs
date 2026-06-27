import { describe, expect, it, vi } from "vitest";

import { runMainnetHaltedDeployment } from "./run-mainnet-halted-deployment.mjs";

function environment() {
  return {
    GITHUB_ACTIONS: "true",
    GITHUB_WORKSPACE: "/workspace",
    RUNNER_TEMP: "/runner-temp",
    GITHUB_SHA: "a".repeat(40),
    GITHUB_RUN_ID: "28299999999",
    GITHUB_REPOSITORY: "badjoke-lab/xrpl-group-pay",
    GITHUB_SERVER_URL: "https://github.com",
    MAINNET_HALTED_DEPLOYMENT_CONFIRMATION:
      "DEPLOY XRPL GROUP PAY MAINNET HALTED",
    MAINNET_HALTED_DEPLOYMENT_REPORT_PATH:
      "/runner-temp/mainnet-halted-deployment-report.json",
    CLOUDFLARE_API_TOKEN: "cloudflare-token",
    CLOUDFLARE_ACCOUNT_ID: "cloudflare-account",
    MAINNET_XAMAN_API_KEY: "xaman-key",
    MAINNET_XAMAN_API_SECRET: "xaman-secret",
  };
}

describe("halted Mainnet deployment runner", () => {
  it("passes Wrangler deployment options directly to OpenNext", async () => {
    const runCommand = vi.fn();
    const prepareConfig = vi.fn().mockResolvedValue(undefined);
    const writeSecretFile = vi.fn().mockResolvedValue(undefined);
    const removeFile = vi.fn().mockResolvedValue(undefined);
    const verify = vi.fn().mockResolvedValue({ state: "verified" });

    const result = await runMainnetHaltedDeployment({
      environment: environment(),
      runCommand,
      prepareConfig,
      writeSecretFile,
      removeFile,
      verify,
    });

    expect(result).toEqual({ state: "verified" });
    expect(prepareConfig).toHaveBeenCalledWith({
      outputPath: "/workspace/wrangler.mainnet-halted.jsonc",
    });
    expect(writeSecretFile).toHaveBeenCalledWith(
      "/runner-temp/mainnet-worker-secrets.json",
      JSON.stringify({
        XAMAN_API_KEY: "xaman-key",
        XAMAN_API_SECRET: "xaman-secret",
      }),
      { mode: 0o600 },
    );
    expect(runCommand).toHaveBeenCalledTimes(3);
    expect(runCommand.mock.calls[0][1]).toEqual([
      "exec",
      "next",
      "build",
    ]);
    expect(runCommand.mock.calls[1][1]).toEqual([
      "exec",
      "opennextjs-cloudflare",
      "build",
      "--skipNextBuild",
      "--config=/workspace/wrangler.mainnet-halted.jsonc",
      "--env=mainnet",
    ]);
    expect(runCommand.mock.calls[2][1]).toEqual([
      "exec",
      "opennextjs-cloudflare",
      "deploy",
      "--config=/workspace/wrangler.mainnet-halted.jsonc",
      "--env=mainnet",
      "--secrets-file=/runner-temp/mainnet-worker-secrets.json",
    ]);
    expect(runCommand.mock.calls[2][1]).not.toContain("--");
    expect(verify).toHaveBeenCalledWith({
      environment: expect.objectContaining({
        MAINNET_RELEASE_MODE: "internal",
        MAINNET_OPERATIONS_MODE: "halted",
        MAINNET_HALTED_WRANGLER_PATH:
          "/workspace/wrangler.mainnet-halted.jsonc",
      }),
    });
    expect(removeFile).toHaveBeenCalledWith(
      "/workspace/wrangler.mainnet-halted.jsonc",
    );
    expect(removeFile).toHaveBeenCalledWith(
      "/runner-temp/mainnet-worker-secrets.json",
    );
  });

  it("retries public verification without rebuilding or redeploying", async () => {
    const verify = vi
      .fn()
      .mockRejectedValueOnce(new Error("not ready"))
      .mockResolvedValueOnce({ state: "verified" });
    const wait = vi.fn().mockResolvedValue(undefined);
    const runCommand = vi.fn();

    await runMainnetHaltedDeployment({
      environment: environment(),
      runCommand,
      prepareConfig: vi.fn().mockResolvedValue(undefined),
      writeSecretFile: vi.fn().mockResolvedValue(undefined),
      removeFile: vi.fn().mockResolvedValue(undefined),
      verify,
      wait,
    });

    expect(runCommand).toHaveBeenCalledTimes(3);
    expect(verify).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(10_000);
  });

  it("rejects execution outside GitHub Actions", async () => {
    await expect(
      runMainnetHaltedDeployment({
        environment: { ...environment(), GITHUB_ACTIONS: "false" },
      }),
    ).rejects.toThrow("only in GitHub Actions");
  });
});
