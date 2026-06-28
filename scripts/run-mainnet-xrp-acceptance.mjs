import { spawnSync } from "node:child_process";
import { access, chmod, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { checkMainnetXrpAcceptanceReadiness } from "./check-mainnet-xrp-acceptance-readiness.mjs";
import {
  assertPublicSafeReport,
  buildAcceptanceWrangler,
  createEncryptedSigningBundleHtml,
  dropsToDecimal,
  generateInternalRequestMaterial,
  MAINNET_XRP_ASSET_ID,
  MAINNET_XRP_EXECUTION_CONFIRMATION,
  MAINNET_XRP_ORIGIN,
  parseJsonc,
  safeErrorCode,
} from "./mainnet-xrp-acceptance-runtime.mjs";

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

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
    redirect: "error",
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

function requestHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function verifyOperationsStatus(expectedMode, attempts = 30) {
  let lastError;
  const expected = {
    enabled: { status: "operational", create: true, verify: true },
    "verify-only": {
      status: "verification-only",
      create: false,
      verify: true,
    },
    halted: { status: "halted", create: false, verify: false },
  }[expectedMode];

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { response, body } = await fetchJson(
        `${MAINNET_XRP_ORIGIN}/api/status/payments`,
        { cache: "no-store" },
      );
      if (
        response.status === 200 &&
        body?.schemaVersion === 1 &&
        body?.network === "mainnet" &&
        body?.mode === expectedMode &&
        body?.status === expected.status &&
        body?.operations?.create === expected.create &&
        body?.operations?.verify === expected.verify
      ) {
        return body;
      }
      lastError = new Error(`Public operations status is not ${expectedMode}.`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await delay(2_000);
  }
  throw lastError ?? new Error("Public operations status could not be verified.");
}

function childEnvironment(environment, mode, temporary = {}) {
  return {
    ...environment,
    APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_URL: MAINNET_XRP_ORIGIN,
    ALLOW_MAINNET_BUILD: "true",
    ALLOW_MAINNET_RUNTIME: "true",
    MAINNET_GATE_APPROVED: "true",
    MAINNET_SOURCE_TAG_APPROVED: "true",
    MAINNET_RELEASE_MODE: "internal",
    MAINNET_OPERATIONS_MODE: mode,
    PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
    XRPL_MAINNET_SOURCE_TAG: "2171267705",
    ...temporary,
  };
}

async function writeSecrets(path, environment) {
  await writeFile(
    path,
    JSON.stringify({
      XAMAN_API_KEY: required(environment, "MAINNET_XAMAN_API_KEY"),
      XAMAN_API_SECRET: required(environment, "MAINNET_XAMAN_API_SECRET"),
    }),
    { mode: 0o600 },
  );
  await chmod(path, 0o600);
}

async function writeRuntimeConfig({
  source,
  path,
  mode,
  digest,
  expiresAt,
  now,
}) {
  const config = buildAcceptanceWrangler({
    wrangler: source,
    mode,
    digest,
    expiresAt,
    now,
  });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  return path;
}

function deploy(configPath, secretsPath, environment, runCommand = run) {
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
    environment,
  );
}

async function recordStage(path, environment, stage, state = "in_progress") {
  await writeFile(
    path,
    `${JSON.stringify(
      {
        schema_version: 1,
        network: "mainnet",
        state,
        stage,
        git_sha: environment.GITHUB_SHA,
        workflow_run_id: environment.GITHUB_RUN_ID,
        recorded_at: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
}

function paths(environment) {
  const runnerTemp = resolve(required(environment, "RUNNER_TEMP"));
  const workspace = resolve(required(environment, "GITHUB_WORKSPACE"));
  return {
    runnerTemp,
    workspace,
    wranglerSource: join(workspace, "wrangler.jsonc"),
    enabledConfig: join(runnerTemp, "wrangler.xrp-enabled.json"),
    verifyOnlyConfig: join(runnerTemp, "wrangler.xrp-verify-only.json"),
    haltedConfig: join(runnerTemp, "wrangler.xrp-halted.json"),
    secrets: join(runnerTemp, "mainnet-worker-secrets.json"),
    state: resolve(
      environment.MAINNET_XRP_ACCEPTANCE_STATE_PATH ??
        join(runnerTemp, "mainnet-xrp-acceptance-state.json"),
    ),
    bundle: resolve(
      environment.MAINNET_XRP_ACCEPTANCE_BUNDLE_PATH ??
        join(runnerTemp, "mainnet-xrp-signing-handoff.html"),
    ),
    outcome: resolve(
      environment.MAINNET_XRP_ACCEPTANCE_OUTCOME_PATH ??
        join(runnerTemp, "mainnet-xrp-acceptance-outcome.json"),
    ),
    report: resolve(
      environment.MAINNET_XRP_ACCEPTANCE_REPORT_PATH ??
        join(runnerTemp, "mainnet-xrp-acceptance-report.json"),
    ),
    stage: resolve(
      environment.MAINNET_XRP_ACCEPTANCE_STAGE_PATH ??
        join(runnerTemp, "mainnet-xrp-acceptance-stage.json"),
    ),
    worker: join(workspace, ".open-next", "worker.js"),
  };
}

async function prepare(environment, dependencies = {}) {
  const runCommand = dependencies.runCommand ?? run;
  const filePaths = paths(environment);
  if (environment.GITHUB_ACTIONS !== "true") {
    throw new Error("The controlled XRP runner may run only in GitHub Actions.");
  }
  if (
    environment.MAINNET_XRP_ACCEPTANCE_EXECUTION_CONFIRMATION !==
    MAINNET_XRP_EXECUTION_CONFIRMATION
  ) {
    throw new Error("The controlled XRP execution confirmation is invalid.");
  }
  required(environment, "CLOUDFLARE_API_TOKEN");
  required(environment, "CLOUDFLARE_ACCOUNT_ID");
  const bundlePassword = required(
    environment,
    "MAINNET_XRP_ACCEPTANCE_BUNDLE_PASSWORD",
  );
  if (bundlePassword.length < 16) {
    throw new Error("The signing-bundle password must contain at least 16 characters.");
  }

  await recordStage(filePaths.stage, environment, "readiness");
  const readiness = await checkMainnetXrpAcceptanceReadiness({
    environment: {
      ...environment,
      MAINNET_XRP_ACCEPTANCE_CONFIRMATION:
        "CHECK XRPL GROUP PAY MAINNET XRP ACCEPTANCE",
    },
  });
  const amountDrops = Number(readiness.amountDrops);
  const amount = dropsToDecimal(amountDrops);
  const total = dropsToDecimal(amountDrops * 2);
  const wrangler = parseJsonc(await readFile(filePaths.wranglerSource, "utf8"));

  await writeSecrets(filePaths.secrets, environment);
  try {
    await recordStage(filePaths.stage, environment, "build");
    const buildConfig = await writeRuntimeConfig({
      source: wrangler,
      path: filePaths.haltedConfig,
      mode: "halted",
      now: new Date(),
    });
    const buildEnvironment = childEnvironment(environment, "halted");
    runCommand("pnpm", ["exec", "next", "build"], buildEnvironment);
    runCommand(
      "pnpm",
      [
        "exec",
        "opennextjs-cloudflare",
        "build",
        "--skipNextBuild",
        `--config=${buildConfig}`,
        "--env=mainnet",
      ],
      buildEnvironment,
    );

    const material = generateInternalRequestMaterial(new Date());
    const temporary = {
      MAINNET_ACCEPTANCE_AUTH_DIGEST: material.digest,
      MAINNET_ACCEPTANCE_EXPIRES_AT: material.expiresAt,
    };
    await writeRuntimeConfig({
      source: wrangler,
      path: filePaths.enabledConfig,
      mode: "enabled",
      digest: material.digest,
      expiresAt: material.expiresAt,
      now: new Date(),
    });
    await writeRuntimeConfig({
      source: wrangler,
      path: filePaths.verifyOnlyConfig,
      mode: "verify-only",
      digest: material.digest,
      expiresAt: material.expiresAt,
      now: new Date(),
    });

    await recordStage(filePaths.stage, environment, "deploy-enabled");
    deploy(
      filePaths.enabledConfig,
      filePaths.secrets,
      childEnvironment(environment, "enabled", temporary),
      runCommand,
    );
    await verifyOperationsStatus("enabled");

    await recordStage(filePaths.stage, environment, "create-bill");
    const billResponse = await fetchJson(`${MAINNET_XRP_ORIGIN}/api/bills`, {
      method: "POST",
      headers: requestHeaders(material.token),
      body: JSON.stringify({
        title: `Controlled XRP acceptance ${environment.GITHUB_RUN_ID}`,
        destinationAddress: readiness.destinationAddress,
        settlementAssetId: MAINNET_XRP_ASSET_ID,
        totalAmount: total,
        creatorShareAmount: "0",
        allocation: { strategy: "custom" },
        participants: [
          {
            participantId: "primary",
            label: "Primary acceptance",
            expectedPayerAddress: readiness.expectedPayerAddress,
            amount,
          },
          {
            participantId: "replay-control",
            label: "Replay control",
            expectedPayerAddress: readiness.expectedPayerAddress,
            amount,
          },
        ],
      }),
    });
    if (billResponse.response.status !== 201 || billResponse.body?.slots?.length !== 2) {
      throw new Error(
        `Bill creation failed with ${billResponse.response.status}:${safeErrorCode(
          billResponse.body,
        )}.`,
      );
    }
    const primary = billResponse.body.slots.find(
      (slot) => slot.participantLabel === "Primary acceptance",
    );
    const replay = billResponse.body.slots.find(
      (slot) => slot.participantLabel === "Replay control",
    );
    if (!primary?.paymentToken || !replay?.paymentToken) {
      throw new Error("The controlled Bill did not return both payment slots.");
    }

    await recordStage(filePaths.stage, environment, "create-handoff");
    const handoffResponse = await fetchJson(
      `${MAINNET_XRP_ORIGIN}/api/payments/payload`,
      {
        method: "POST",
        headers: requestHeaders(material.token),
        body: JSON.stringify({ paymentToken: primary.paymentToken }),
      },
    );
    if (
      handoffResponse.response.status !== 201 ||
      !handoffResponse.body?.payloadId ||
      !handoffResponse.body?.deepLink ||
      !handoffResponse.body?.qrPng
    ) {
      throw new Error(
        `Wallet handoff creation failed with ${handoffResponse.response.status}:${safeErrorCode(
          handoffResponse.body,
        )}.`,
      );
    }

    await writeFile(
      filePaths.state,
      `${JSON.stringify(
        {
          schema_version: 1,
          created_at: new Date().toISOString(),
          expires_at: material.expiresAt,
          authorization_token: material.token,
          amount_drops: readiness.amountDrops,
          destination_address: readiness.destinationAddress,
          expected_payer_address: readiness.expectedPayerAddress,
          primary: {
            payment_token: primary.paymentToken,
            payload_id: handoffResponse.body.payloadId,
          },
          replay: { payment_token: replay.paymentToken },
        },
        null,
        2,
      )}\n`,
      { mode: 0o600 },
    );
    await chmod(filePaths.state, 0o600);

    const bundle = createEncryptedSigningBundleHtml({
      password: bundlePassword,
      bundle: {
        network: "XRPL Mainnet",
        destinationAddress: readiness.destinationAddress,
        expectedPayerAddress: readiness.expectedPayerAddress,
        amountDrops: readiness.amountDrops,
        expiresAt: material.expiresAt,
        deepLink: handoffResponse.body.deepLink,
        qrPng: handoffResponse.body.qrPng,
      },
    });
    await writeFile(filePaths.bundle, bundle, { mode: 0o600 });

    await recordStage(filePaths.stage, environment, "deploy-verify-only");
    deploy(
      filePaths.verifyOnlyConfig,
      filePaths.secrets,
      childEnvironment(environment, "verify-only", temporary),
      runCommand,
    );
    await verifyOperationsStatus("verify-only");
    await recordStage(filePaths.stage, environment, "awaiting-signature");
  } finally {
    await Promise.all([
      unlink(filePaths.secrets).catch(() => undefined),
      unlink(filePaths.enabledConfig).catch(() => undefined),
      unlink(filePaths.verifyOnlyConfig).catch(() => undefined),
      unlink(filePaths.haltedConfig).catch(() => undefined),
    ]);
  }
}

async function complete(environment) {
  const filePaths = paths(environment);
  const state = JSON.parse(await readFile(filePaths.state, "utf8"));
  const expiresAt = new Date(state.expires_at).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error("The controlled signing window has expired.");
  }

  await recordStage(filePaths.stage, environment, "verify-primary");
  let verified;
  while (Date.now() < expiresAt) {
    const result = await fetchJson(`${MAINNET_XRP_ORIGIN}/api/payments/verify`, {
      method: "POST",
      headers: requestHeaders(state.authorization_token),
      body: JSON.stringify({
        paymentToken: state.primary.payment_token,
        payloadId: state.primary.payload_id,
      }),
    });
    if (result.response.status === 200 && result.body?.status === "verified") {
      verified = result.body;
      break;
    }
    if (result.response.status === 202 && result.body?.status === "pending") {
      await delay(10_000);
      continue;
    }
    throw new Error(
      `Primary verification failed with ${result.response.status}:${safeErrorCode(
        result.body,
      )}:${result.body?.reason ?? "UNSPECIFIED"}.`,
    );
  }
  if (!verified) throw new Error("The controlled signing window ended without verification.");

  const proof = verified.proof;
  const receipt = verified.receipt;
  if (
    proof?.network !== "mainnet" ||
    proof?.sender !== state.expected_payer_address ||
    proof?.destination !== state.destination_address ||
    proof?.amountDrops !== state.amount_drops ||
    proof?.deliveredAmountDrops !== state.amount_drops ||
    receipt?.receiptId !== `mainnet:${proof?.transactionId}`
  ) {
    throw new Error("The verified primary evidence does not match the controlled request.");
  }

  await recordStage(filePaths.stage, environment, "duplicate-control");
  const duplicate = await fetchJson(
    `${MAINNET_XRP_ORIGIN}/api/payments/verify`,
    {
      method: "POST",
      headers: requestHeaders(state.authorization_token),
      body: JSON.stringify({
        paymentToken: state.primary.payment_token,
        payloadId: state.primary.payload_id,
      }),
    },
  );
  const duplicateRejected =
    duplicate.response.status === 200 &&
    duplicate.body?.status === "verified" &&
    duplicate.body?.receipt?.status === "existing" &&
    duplicate.body?.receipt?.receiptId === receipt.receiptId &&
    duplicate.body?.receipt?.proofDigest === receipt.proofDigest;
  if (!duplicateRejected) {
    throw new Error("The duplicate receipt control did not preserve one immutable receipt.");
  }

  await recordStage(filePaths.stage, environment, "replay-control");
  const replay = await fetchJson(`${MAINNET_XRP_ORIGIN}/api/payments/verify`, {
    method: "POST",
    headers: requestHeaders(state.authorization_token),
    body: JSON.stringify({
      paymentToken: state.replay.payment_token,
      payloadId: state.primary.payload_id,
    }),
  });
  const replayRejected =
    (replay.response.status === 422 && replay.body?.status === "failed") ||
    (replay.response.status === 409 &&
      ["SLOT_PROOF_MISMATCH", "SLOT_ALREADY_PAID"].includes(
        replay.body?.error?.code,
      ));
  if (!replayRejected) {
    throw new Error("The cross-slot replay control was not rejected.");
  }

  const transactionHash = String(proof.transactionId).toUpperCase();
  const outcome = {
    schema_version: 1,
    network: "mainnet",
    asset_id: MAINNET_XRP_ASSET_ID,
    generated_at: new Date().toISOString(),
    git_sha: environment.GITHUB_SHA,
    workflow_run_url: `https://github.com/${environment.GITHUB_REPOSITORY}/actions/runs/${environment.GITHUB_RUN_ID}`,
    state: "verified",
    public_url: MAINNET_XRP_ORIGIN,
    transaction_hash: transactionHash,
    ledger_index: proof.ledgerIndex,
    validated: true,
    transaction_result: "tesSUCCESS",
    amount_drops: state.amount_drops,
    receipt_id: `mainnet:${transactionHash}`,
    proof_digest: String(receipt.proofDigest).toUpperCase(),
    duplicate_rejected: true,
    replay_rejected: true,
    sensitive_values_excluded: true,
  };
  await writeFile(filePaths.outcome, `${JSON.stringify(outcome, null, 2)}\n`, {
    mode: 0o600,
  });
  await recordStage(filePaths.stage, environment, "verified", "verified");
}

async function rollback(environment, dependencies = {}) {
  const runCommand = dependencies.runCommand ?? run;
  const filePaths = paths(environment);
  required(environment, "CLOUDFLARE_API_TOKEN");
  required(environment, "CLOUDFLARE_ACCOUNT_ID");
  const wrangler = parseJsonc(await readFile(filePaths.wranglerSource, "utf8"));
  await recordStage(filePaths.stage, environment, "restore-halted");

  let alreadyHalted = false;
  try {
    await verifyOperationsStatus("halted", 3);
    alreadyHalted = true;
  } catch {
    alreadyHalted = false;
  }

  try {
    if (!alreadyHalted) {
      if (!(await fileExists(filePaths.worker))) {
        throw new Error("The Worker build is unavailable for required halt restoration.");
      }
      await writeSecrets(filePaths.secrets, environment);
      await writeRuntimeConfig({
        source: wrangler,
        path: filePaths.haltedConfig,
        mode: "halted",
        now: new Date(),
      });
      deploy(
        filePaths.haltedConfig,
        filePaths.secrets,
        childEnvironment(environment, "halted"),
        runCommand,
      );
    }
    await verifyOperationsStatus("halted");

    if (await fileExists(filePaths.outcome)) {
      const outcome = JSON.parse(await readFile(filePaths.outcome, "utf8"));
      const report = assertPublicSafeReport({
        ...outcome,
        operations_restored_halted: true,
      });
      await writeFile(filePaths.report, `${JSON.stringify(report, null, 2)}\n`, {
        mode: 0o600,
      });
    }
    await recordStage(filePaths.stage, environment, "halted", "completed");
  } finally {
    await Promise.all([
      unlink(filePaths.secrets).catch(() => undefined),
      unlink(filePaths.enabledConfig).catch(() => undefined),
      unlink(filePaths.verifyOnlyConfig).catch(() => undefined),
      unlink(filePaths.haltedConfig).catch(() => undefined),
      unlink(filePaths.state).catch(() => undefined),
      unlink(filePaths.bundle).catch(() => undefined),
      unlink(filePaths.outcome).catch(() => undefined),
    ]);
  }
}

export async function runMainnetXrpAcceptance({
  phase,
  environment = process.env,
  dependencies,
} = {}) {
  if (phase === "prepare") return prepare(environment, dependencies);
  if (phase === "complete") return complete(environment);
  if (phase === "rollback") return rollback(environment, dependencies);
  throw new Error("Use --phase=prepare, --phase=complete, or --phase=rollback.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const phase = process.argv
    .find((argument) => argument.startsWith("--phase="))
    ?.slice("--phase=".length);
  runMainnetXrpAcceptance({ phase })
    .then(() => console.log(`Controlled XRP phase completed: ${phase}.`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
