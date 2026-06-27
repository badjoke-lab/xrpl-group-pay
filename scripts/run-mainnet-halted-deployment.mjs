import { spawnSync } from "node:child_process";
import { unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { writeHaltedMainnetWrangler } from "./mainnet-halted-deployment-config.mjs";
import { executeMainnetHaltedDeploymentVerification } from "./verify-mainnet-halted-deployment.mjs";

const CONFIRMATION = "DEPLOY XRPL GROUP PAY MAINNET HALTED";

function required(environment, name) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function run(command, args, environment) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}.`);
  }
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

export async function runMainnetHaltedDeployment({
  environment = process.env,
  runCommand = run,
  verify = executeMainnetHaltedDeploymentVerification,
  prepareConfig = writeHaltedMainnetWrangler,
  writeSecretFile = writeFile,
  removeFile = unlink,
  wait = delay,
} = {}) {
  if (environment.GITHUB_ACTIONS !== "true") {
    throw new Error("The halted Mainnet deployment may run only in GitHub Actions.");
  }
  if (environment.MAINNET_HALTED_DEPLOYMENT_CONFIRMATION !== CONFIRMATION) {
    throw new Error("The halted Mainnet deployment confirmation is invalid.");
  }

  required(environment, "CLOUDFLARE_API_TOKEN");
  required(environment, "CLOUDFLARE_ACCOUNT_ID");
  const xamanApiKey = required(environment, "MAINNET_XAMAN_API_KEY");
  const xamanApiSecret = required(environment, "MAINNET_XAMAN_API_SECRET");
  const runnerTemp = resolve(required(environment, "RUNNER_TEMP"));
  const workspace = resolve(required(environment, "GITHUB_WORKSPACE"));
  const configPath = join(workspace, "wrangler.mainnet-halted.jsonc");
  const secretsPath = join(runnerTemp, "mainnet-worker-secrets.json");

  const childEnvironment = {
    ...environment,
    APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_URL: "https://xgp.badjoke-lab.com",
    ALLOW_MAINNET_BUILD: "true",
    ALLOW_MAINNET_RUNTIME: "true",
    MAINNET_GATE_APPROVED: "true",
    MAINNET_SOURCE_TAG_APPROVED: "true",
    MAINNET_RELEASE_MODE: "internal",
    MAINNET_OPERATIONS_MODE: "halted",
    PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
    XRPL_MAINNET_SOURCE_TAG: "2171267705",
    MAINNET_HALTED_WRANGLER_PATH: configPath,
  };

  try {
    await prepareConfig({ outputPath: configPath });
    await writeSecretFile(
      secretsPath,
      JSON.stringify({
        XAMAN_API_KEY: xamanApiKey,
        XAMAN_API_SECRET: xamanApiSecret,
      }),
      { mode: 0o600 },
    );

    console.log("[halted-mainnet] Building Next.js output.");
    runCommand("pnpm", ["exec", "next", "build"], childEnvironment);

    console.log("[halted-mainnet] Transforming the existing build for Cloudflare.");
    runCommand(
      "pnpm",
      [
        "exec",
        "opennextjs-cloudflare",
        "build",
        "--skipNextBuild",
        `--config=${configPath}`,
        "--env=mainnet",
      ],
      childEnvironment,
    );

    console.log("[halted-mainnet] Deploying the internal halted Worker.");
    runCommand(
      "pnpm",
      [
        "exec",
        "opennextjs-cloudflare",
        "deploy",
        `--config=${configPath}`,
        "--env=mainnet",
        `--secrets-file=${secretsPath}`,
      ],
      childEnvironment,
    );

    console.log("[halted-mainnet] Verifying the public halted target.");
    let lastError;
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      try {
        return await verify({ environment: childEnvironment });
      } catch (error) {
        lastError = error;
        if (attempt < 30) await wait(10_000);
      }
    }
    throw lastError;
  } finally {
    await Promise.all([
      removeFile(configPath).catch(() => undefined),
      removeFile(secretsPath).catch(() => undefined),
    ]);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMainnetHaltedDeployment()
    .then(() => console.log("Deployed and verified the halted Mainnet target."))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
