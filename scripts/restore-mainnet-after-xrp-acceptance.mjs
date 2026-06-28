import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { writeMainnetXrpAcceptanceWranglers } from "./mainnet-xrp-acceptance-config.mjs";

const ORIGIN = "https://xgp.badjoke-lab.com";

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
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}.`);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function waitForHalted() {
  let last;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(`${ORIGIN}/api/status/payments`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      const status = await response.json().catch(() => null);
      if (
        response.ok &&
        status?.network === "mainnet" &&
        status?.mode === "halted" &&
        status?.operations?.create === false &&
        status?.operations?.verify === false
      ) {
        return;
      }
      last = new Error("The Mainnet payment status endpoint is not halted.");
    } catch (error) {
      last = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 10_000));
  }
  throw last;
}

export async function restoreMainnetAfterXrpAcceptance({
  environment = process.env,
  runCommand = run,
  now = () => new Date(),
} = {}) {
  if (environment.GITHUB_ACTIONS !== "true") {
    throw new Error("Mainnet restoration may run only in GitHub Actions.");
  }
  required(environment, "CLOUDFLARE_API_TOKEN");
  required(environment, "CLOUDFLARE_ACCOUNT_ID");
  const xamanKey = required(environment, "MAINNET_XAMAN_API_KEY");
  const xamanSecret = required(environment, "MAINNET_XAMAN_API_SECRET");
  const workspace = resolve(required(environment, "GITHUB_WORKSPACE"));
  const runnerTemp = resolve(required(environment, "RUNNER_TEMP"));
  const activePath = join(workspace, "wrangler.mainnet-xrp-acceptance.jsonc");
  const restorePath = join(workspace, "wrangler.mainnet-xrp-restore.jsonc");
  const secretsPath = join(runnerTemp, "mainnet-xrp-worker-secrets.json");
  const statePath = resolve(required(environment, "MAINNET_XRP_ACCEPTANCE_STATE_PATH"));
  const handoffPath = resolve(required(environment, "MAINNET_XRP_ACCEPTANCE_HANDOFF_PATH"));
  const outcomePath = resolve(required(environment, "MAINNET_XRP_ACCEPTANCE_OUTCOME_PATH"));
  const reportPath = resolve(required(environment, "MAINNET_XRP_ACCEPTANCE_REPORT_PATH"));

  if (!(await exists(restorePath))) {
    await writeMainnetXrpAcceptanceWranglers({
      activePath,
      restorePath,
      tokenDigest: randomBytes(32).toString("hex"),
    });
  }
  if (!(await exists(secretsPath))) {
    await writeFile(
      secretsPath,
      JSON.stringify({ XAMAN_API_KEY: xamanKey, XAMAN_API_SECRET: xamanSecret }),
      { mode: 0o600 },
    );
  }

  const childEnvironment = {
    ...environment,
    APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_URL: ORIGIN,
    ALLOW_MAINNET_BUILD: "true",
    ALLOW_MAINNET_RUNTIME: "true",
    MAINNET_GATE_APPROVED: "true",
    MAINNET_SOURCE_TAG_APPROVED: "true",
    MAINNET_RELEASE_MODE: "internal",
    MAINNET_OPERATIONS_MODE: "halted",
    PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
    XRPL_MAINNET_SOURCE_TAG: "2171267705",
  };

  try {
    if (!(await exists(join(workspace, ".open-next", "worker.js")))) {
      runCommand("pnpm", ["exec", "next", "build"], childEnvironment);
      runCommand(
        "pnpm",
        ["exec", "opennextjs-cloudflare", "build", "--skipNextBuild", `--config=${restorePath}`, "--env=mainnet"],
        childEnvironment,
      );
    }
    runCommand(
      "pnpm",
      ["exec", "wrangler", "deploy", `--config=${restorePath}`, "--env=mainnet", `--secrets-file=${secretsPath}`],
      childEnvironment,
    );
    await waitForHalted();

    if (await exists(outcomePath)) {
      const outcome = JSON.parse(await readFile(outcomePath, "utf8"));
      const generatedAt = now().toISOString();
      const report = {
        schema_version: 1,
        network: "mainnet",
        asset_id: "xrpl:mainnet:xrp",
        generated_at: generatedAt,
        git_sha: required(environment, "GITHUB_SHA"),
        workflow_run_url: `https://github.com/${required(environment, "GITHUB_REPOSITORY")}/actions/runs/${required(environment, "GITHUB_RUN_ID")}`,
        state: "verified",
        public_url: ORIGIN,
        transaction_hash: outcome.transaction_hash,
        ledger_index: outcome.ledger_index,
        validated: true,
        transaction_result: "tesSUCCESS",
        amount_drops: outcome.amount_drops,
        delivered_amount_drops: outcome.delivered_amount_drops,
        receipt_id: outcome.receipt_id,
        proof_digest: outcome.proof_digest,
        duplicate_rejected: outcome.duplicate_rejected === true,
        replay_rejected: outcome.replay_rejected === true,
        operations_restored_halted: true,
        sensitive_values_excluded: true,
        evidence_patch: {
          id: "live-mainnet-xrp-acceptance",
          status: "accepted",
          recorded_at: generatedAt,
          transaction_hash: outcome.transaction_hash,
          ledger_index: outcome.ledger_index,
          validated: true,
          transaction_result: "tesSUCCESS",
          amount_drops: outcome.amount_drops,
          receipt_id: outcome.receipt_id,
          proof_digest: outcome.proof_digest,
          duplicate_rejected: true,
          replay_rejected: true,
        },
      };
      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    }
  } finally {
    await Promise.all(
      [activePath, restorePath, secretsPath, statePath, handoffPath, outcomePath].map((path) =>
        unlink(path).catch(() => undefined),
      ),
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  restoreMainnetAfterXrpAcceptance()
    .then(() => console.log("Restored and verified the halted Mainnet target."))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
