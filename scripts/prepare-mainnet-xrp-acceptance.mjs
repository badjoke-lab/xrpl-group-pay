import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { isValidClassicAddress } from "xrpl";

import { mainnetAcceptanceTokenDigest } from "../src/config/mainnet-internal-auth.ts";
import { writeMainnetXrpAcceptanceWranglers } from "./mainnet-xrp-acceptance-config.mjs";

const CONFIRMATION = "RUN XRPL GROUP PAY MAINNET XRP ACCEPTANCE";
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
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}.`);
  }
}

function dropsToXrp(drops) {
  const value = BigInt(drops);
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0");
  return `${whole}.${fraction}`;
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function waitForEnabled() {
  let last;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const status = await requestJson(`${ORIGIN}/api/status/payments`);
      if (
        status?.network === "mainnet" &&
        status?.mode === "enabled" &&
        status?.operations?.create === true &&
        status?.operations?.verify === true
      ) {
        return;
      }
      last = new Error("The payment status endpoint is not enabled.");
    } catch (error) {
      last = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 10_000));
  }
  throw last;
}

export async function prepareMainnetXrpAcceptance({
  environment = process.env,
  runCommand = run,
} = {}) {
  if (environment.GITHUB_ACTIONS !== "true") {
    throw new Error("Mainnet XRP acceptance may run only in GitHub Actions.");
  }
  if (environment.MAINNET_XRP_ACCEPTANCE_CONFIRMATION !== CONFIRMATION) {
    throw new Error("The Mainnet XRP acceptance confirmation is invalid.");
  }

  required(environment, "CLOUDFLARE_API_TOKEN");
  required(environment, "CLOUDFLARE_ACCOUNT_ID");
  const xamanKey = required(environment, "MAINNET_XAMAN_API_KEY");
  const xamanSecret = required(environment, "MAINNET_XAMAN_API_SECRET");
  const destination = required(environment, "MAINNET_XRP_ACCEPTANCE_DESTINATION");
  const payer = required(environment, "MAINNET_XRP_ACCEPTANCE_PAYER");
  if (!isValidClassicAddress(destination) || !isValidClassicAddress(payer)) {
    throw new Error("The controlled Mainnet addresses must be classic XRPL addresses.");
  }
  const amountDrops = Number(required(environment, "MAINNET_XRP_ACCEPTANCE_AMOUNT_DROPS"));
  if (!Number.isInteger(amountDrops) || amountDrops < 1 || amountDrops > 1000) {
    throw new Error("The controlled XRP amount must be between 1 and 1000 drops.");
  }

  const workspace = resolve(required(environment, "GITHUB_WORKSPACE"));
  const runnerTemp = resolve(required(environment, "RUNNER_TEMP"));
  const activePath = join(workspace, "wrangler.mainnet-xrp-acceptance.jsonc");
  const restorePath = join(workspace, "wrangler.mainnet-xrp-restore.jsonc");
  const secretsPath = join(runnerTemp, "mainnet-xrp-worker-secrets.json");
  const statePath = resolve(required(environment, "MAINNET_XRP_ACCEPTANCE_STATE_PATH"));
  const handoffPath = resolve(required(environment, "MAINNET_XRP_ACCEPTANCE_HANDOFF_PATH"));
  const stagePath = resolve(required(environment, "MAINNET_XRP_ACCEPTANCE_STAGE_PATH"));
  const acceptanceToken = randomBytes(32).toString("hex");
  const tokenDigest = mainnetAcceptanceTokenDigest(acceptanceToken);

  console.log(`::add-mask::${acceptanceToken}`);
  await writeMainnetXrpAcceptanceWranglers({ activePath, restorePath, tokenDigest });
  await writeFile(
    secretsPath,
    JSON.stringify({ XAMAN_API_KEY: xamanKey, XAMAN_API_SECRET: xamanSecret }),
    { mode: 0o600 },
  );

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
    MAINNET_OPERATIONS_MODE: "enabled",
    MAINNET_ACCEPTANCE_TOKEN_SHA256: tokenDigest,
    PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
    XRPL_MAINNET_SOURCE_TAG: "2171267705",
  };

  const stage = async (name) =>
    writeFile(
      stagePath,
      `${JSON.stringify({ schema_version: 1, network: "mainnet", state: "in_progress", stage: name, git_sha: environment.GITHUB_SHA, workflow_run_id: environment.GITHUB_RUN_ID }, null, 2)}\n`,
      { mode: 0o600 },
    );

  await stage("next-build");
  runCommand("pnpm", ["exec", "next", "build"], childEnvironment);
  await stage("opennext-transform");
  runCommand(
    "pnpm",
    ["exec", "opennextjs-cloudflare", "build", "--skipNextBuild", `--config=${activePath}`, "--env=mainnet"],
    childEnvironment,
  );
  await stage("deploy-enabled");
  runCommand(
    "pnpm",
    ["exec", "wrangler", "deploy", `--config=${activePath}`, "--env=mainnet", `--secrets-file=${secretsPath}`],
    childEnvironment,
  );
  await stage("verify-enabled");
  await waitForEnabled();

  const headers = {
    "Content-Type": "application/json",
    "X-XRPL-Mainnet-Acceptance": acceptanceToken,
  };
  await stage("create-frozen-bill");
  const amount = dropsToXrp(amountDrops);
  const total = dropsToXrp(amountDrops * 2);
  const bill = await requestJson(`${ORIGIN}/api/bills`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: `Controlled Mainnet XRP acceptance ${environment.GITHUB_RUN_ID}`,
      destinationAddress: destination,
      settlementAssetId: "xrpl:mainnet:xrp",
      totalAmount: total,
      creatorShareAmount: "0",
      allocation: { strategy: "custom" },
      participants: [
        { participantId: "acceptance-primary", label: "Acceptance primary", expectedPayerAddress: payer, amount },
        { participantId: "acceptance-replay", label: "Replay rejection control", expectedPayerAddress: payer, amount },
      ],
    }),
  });
  const primary = bill?.slots?.[0];
  const replay = bill?.slots?.[1];
  if (!primary?.paymentToken || !replay?.paymentToken) {
    throw new Error("The controlled Mainnet Bill did not return two PaymentSlot capabilities.");
  }
  console.log(`::add-mask::${primary.paymentToken}`);
  console.log(`::add-mask::${replay.paymentToken}`);

  await stage("create-xaman-handoff");
  const handoff = await requestJson(`${ORIGIN}/api/payments/payload`, {
    method: "POST",
    headers,
    body: JSON.stringify({ paymentToken: primary.paymentToken }),
  });
  if (!handoff?.payloadId || !handoff?.deepLink || !handoff?.qrPng) {
    throw new Error("The Xaman handoff is incomplete.");
  }
  console.log(`::add-mask::${handoff.payloadId}`);
  console.log(`::add-mask::${handoff.deepLink}`);

  await writeFile(
    statePath,
    `${JSON.stringify({ schema_version: 1, acceptanceToken, activePath, restorePath, secretsPath, destination, payer, amountDrops: String(amountDrops), billPublicId: bill.bill.publicId, primaryPaymentToken: primary.paymentToken, replayPaymentToken: replay.paymentToken, payloadId: handoff.payloadId }, null, 2)}\n`,
    { mode: 0o600 },
  );
  await writeFile(
    handoffPath,
    `${JSON.stringify({ schema_version: 1, network: "mainnet", purpose: "controlled-xrp-acceptance", expectedPayerAddress: payer, destinationAddress: destination, amountDrops: String(amountDrops), deepLink: handoff.deepLink, qrPng: handoff.qrPng, instructions: "Open the deep link or QR in Xaman, verify the Mainnet destination and XRP amount, then sign with the expected payer account. This artifact expires after one day." }, null, 2)}\n`,
    { mode: 0o600 },
  );
  await stage("await-participant-signature");
  return { statePath, handoffPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  prepareMainnetXrpAcceptance()
    .then(() => console.log("Prepared the controlled Mainnet XRP handoff."))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
