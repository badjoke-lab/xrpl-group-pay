import { spawnSync } from "node:child_process";
import { unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { runMainnetHaltedDeployment } from "./run-mainnet-halted-deployment.mjs";
import { writePublicMainnetWrangler } from "./mainnet-public-deployment-config.mjs";
import { executeMainnetPublicDeploymentVerification } from "./verify-mainnet-public-deployment.mjs";

const CONFIRMATION = "DEPLOY XRPL GROUP PAY MAINNET PUBLIC";
const HALTED_CONFIRMATION = "DEPLOY XRPL GROUP PAY MAINNET HALTED";

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

export async function runMainnetPublicDeployment({
  environment = process.env,
  runCommand = run,
  verify = executeMainnetPublicDeploymentVerification,
  prepareConfig = writePublicMainnetWrangler,
  rollback = runMainnetHaltedDeployment,
  writeSecretFile = writeFile,
  writeStageFile = writeFile,
  removeFile = unlink,
  wait = delay,
} = {}) {
  if (environment.GITHUB_ACTIONS !== "true") {
    throw new Error("The public Mainnet deployment may run only in GitHub Actions.");
  }
  if (environment.MAINNET_PUBLIC_DEPLOYMENT_CONFIRMATION !== CONFIRMATION) {
    throw new Error("The public Mainnet deployment confirmation is invalid.");
  }

  required(environment, "CLOUDFLARE_API_TOKEN");
  required(environment, "CLOUDFLARE_ACCOUNT_ID");
  const xamanApiKey = required(environment, "MAINNET_XAMAN_API_KEY");
  const xamanApiSecret = required(environment, "MAINNET_XAMAN_API_SECRET");
  const runnerTemp = resolve(required(environment, "RUNNER_TEMP"));
  const workspace = resolve(required(environment, "GITHUB_WORKSPACE"));
  const configPath = join(workspace, "wrangler.mainnet-public.jsonc");
  const secretsPath = join(runnerTemp, "mainnet-public-worker-secrets.json");
  const stagePath = join(runnerTemp, "mainnet-public-deployment-stage.json");
  const rollbackReportPath = join(
    runnerTemp,
    "mainnet-public-deployment-rollback-report.json",
  );

  const recordStage = async (stage, state = "in_progress") => {
    await writeStageFile(
      stagePath,
      `${JSON.stringify(
        {
          schema_version: 1,
          network: "mainnet",
          state,
          stage,
          git_sha: environment.GITHUB_SHA,
          workflow_run_id: environment.GITHUB_RUN_ID,
        },
        null,
        2,
      )}\n`,
      { mode: 0o600 },
    );
  };

  const childEnvironment = {
    ...environment,
    APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_URL: "https://xgp.badjoke-lab.com",
    ALLOW_MAINNET_BUILD: "true",
    ALLOW_MAINNET_RUNTIME: "true",
    MAINNET_GATE_APPROVED: "true",
    MAINNET_SOURCE_TAG_APPROVED: "true",
    MAINNET_RELEASE_MODE: "public",
    MAINNET_OPERATIONS_MODE: "enabled",
    PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
    XRPL_MAINNET_SOURCE_TAG: "2171267705",
    MAINNET_PUBLIC_WRANGLER_PATH: configPath,
  };

  let deploymentStarted = false;
  try {
    await recordStage("prepare-configuration");
    await prepareConfig({ outputPath: configPath });
    await writeSecretFile(
      secretsPath,
      JSON.stringify({
        XAMAN_API_KEY: xamanApiKey,
        XAMAN_API_SECRET: xamanApiSecret,
      }),
      { mode: 0o600 },
    );

    await recordStage("next-build");
    console.log("[public-mainnet] Building Next.js output.");
    runCommand("pnpm", ["exec", "next", "build"], childEnvironment);

    await recordStage("opennext-transform");
    console.log("[public-mainnet] Transforming the existing build for Cloudflare.");
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

    await recordStage("wrangler-deploy");
    deploymentStarted = true;
    console.log("[public-mainnet] Deploying the public enabled Worker with Wrangler.");
    runCommand(
      "pnpm",
      [
        "exec",
        "wrangler",
        "deploy",
        `--config=${configPath}`,
        "--env=mainnet",
        `--secrets-file=${secretsPath}`,
      ],
      childEnvironment,
    );

    await recordStage("public-verification");
    console.log("[public-mainnet] Verifying the public enabled target.");
    let lastError;
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      try {
        const report = await verify({ environment: childEnvironment });
        await recordStage("verified", "verified");
        return report;
      } catch (error) {
        lastError = error;
        if (attempt < 30) await wait(10_000);
      }
    }
    throw lastError;
  } catch (error) {
    if (deploymentStarted) {
      await recordStage("automatic-halted-rollback");
      console.error(
        "[public-mainnet] Public verification failed; restoring the reviewed halted target.",
      );
      try {
        await rollback({
          environment: {
            ...environment,
            MAINNET_HALTED_DEPLOYMENT_CONFIRMATION: HALTED_CONFIRMATION,
            MAINNET_HALTED_DEPLOYMENT_REPORT_PATH: rollbackReportPath,
          },
        });
        await recordStage("rolled-back-halted", "rolled_back");
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "Public deployment failed and the automatic halted rollback also failed.",
        );
      }
    }
    throw error;
  } finally {
    await Promise.all([
      removeFile(configPath).catch(() => undefined),
      removeFile(secretsPath).catch(() => undefined),
    ]);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMainnetPublicDeployment()
    .then(() => console.log("Deployed and verified the public Mainnet target."))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
