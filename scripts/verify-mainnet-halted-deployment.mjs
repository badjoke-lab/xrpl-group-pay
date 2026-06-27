import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import {
  readGitHubContext,
  requireText,
} from "./mainnet-xaman-attestation-context.mjs";

const ORIGIN = "https://xgp.badjoke-lab.com";
const CUSTOM_DOMAIN = "xgp.badjoke-lab.com";
const WORKER_NAME = "xrpl-group-pay-mainnet";
const DATABASE_BINDING = "PAYMENTS_DB_MAINNET";
const SOURCE_TAG = "2171267705";
const CONFIRMATION = "DEPLOY XRPL GROUP PAY MAINNET HALTED";

const evidencePatchSchema = z
  .object({
    id: z.literal("production-release-configuration"),
    status: z.literal("accepted"),
    recorded_at: z.string().datetime({ offset: false }),
    public_url: z.literal(ORIGIN),
    app_network: z.literal("mainnet"),
    public_network: z.literal("mainnet"),
    database_binding: z.literal(DATABASE_BINDING),
    runtime_allowed: z.literal(true),
    gate_approved: z.literal(true),
    source_tag_approved: z.literal(true),
    release_mode: z.literal("internal"),
    operations_mode: z.literal("halted"),
  })
  .strict();

const reportSchema = z
  .object({
    schema_version: z.literal(1),
    network: z.literal("mainnet"),
    generated_at: z.string().datetime({ offset: false }),
    git_sha: z.string().regex(/^[0-9a-f]{40}$/),
    state: z.literal("verified"),
    workflow_run_url: z.string().url(),
    public_url: z.literal(ORIGIN),
    worker_name: z.literal(WORKER_NAME),
    configuration_digest: z.string().regex(/^[0-9a-f]{64}$/),
    checks: z
      .object({
        deployment_reachable: z.literal(true),
        custom_domain_https_checked: z.literal(true),
        runtime_configuration_checked: z.literal(true),
        release_mode_internal: z.literal(true),
        operations_halted: z.literal(true),
        payment_creation_blocked: z.literal(true),
        payment_verification_blocked: z.literal(true),
        callback_route_checked: z.literal(true),
        callback_verification_ready: z.literal(true),
        sensitive_values_excluded: z.literal(true),
      })
      .strict(),
    evidence_patch: evidencePatchSchema,
  })
  .strict();

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

export function assertHaltedMainnetRuntimeConfiguration(source) {
  const wrangler = parseJsonc(source);
  const mainnet = wrangler?.env?.mainnet;
  const vars = mainnet?.vars;
  const database = mainnet?.d1_databases?.find(
    (candidate) => candidate.binding === DATABASE_BINDING,
  );
  const route = mainnet?.routes?.find(
    (candidate) =>
      candidate.pattern === CUSTOM_DOMAIN && candidate.custom_domain === true,
  );

  if (
    mainnet?.name !== WORKER_NAME ||
    vars?.APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_URL !== ORIGIN ||
    vars?.ALLOW_MAINNET_RUNTIME !== "true" ||
    vars?.MAINNET_GATE_APPROVED !== "true" ||
    vars?.MAINNET_SOURCE_TAG_APPROVED !== "true" ||
    vars?.XRPL_MAINNET_SOURCE_TAG !== SOURCE_TAG ||
    vars?.MAINNET_RELEASE_MODE !== "internal" ||
    vars?.MAINNET_OPERATIONS_MODE !== "halted" ||
    vars?.PAYMENTS_DATABASE_BINDING !== DATABASE_BINDING ||
    !database ||
    !route ||
    mainnet?.workers_dev !== false
  ) {
    throw new Error("The staged Mainnet runtime configuration is invalid.");
  }

  return {
    workerName: mainnet.name,
    publicOrigin: vars.NEXT_PUBLIC_APP_URL,
    databaseBinding: database.binding,
    releaseMode: vars.MAINNET_RELEASE_MODE,
    operationsMode: vars.MAINNET_OPERATIONS_MODE,
  };
}

async function request(fetcher, url, init = {}) {
  return fetcher(url, {
    ...init,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
}

export function validateMainnetHaltedDeploymentReport(raw, expectedGitSha) {
  const report = reportSchema.parse(raw);
  if (report.git_sha !== expectedGitSha) {
    throw new Error("The halted deployment report commit does not match.");
  }
  if (report.generated_at !== report.evidence_patch.recorded_at) {
    throw new Error("The halted deployment evidence timestamp does not match.");
  }
  return report;
}

export async function verifyMainnetHaltedDeployment({
  environment = process.env,
  fetcher = fetch,
  now = () => new Date(),
} = {}) {
  const confirmation = requireText(
    environment.MAINNET_HALTED_DEPLOYMENT_CONFIRMATION,
    "MAINNET_HALTED_DEPLOYMENT_CONFIRMATION",
  );
  if (confirmation !== CONFIRMATION) {
    throw new Error("The halted deployment confirmation is invalid.");
  }

  const context = readGitHubContext(environment);
  const configPath = resolve(
    requireText(
      environment.MAINNET_HALTED_WRANGLER_PATH,
      "MAINNET_HALTED_WRANGLER_PATH",
    ),
  );
  const configurationSource = await readFile(configPath, "utf8");
  assertHaltedMainnetRuntimeConfiguration(configurationSource);
  const configurationDigest = sha256(configurationSource);

  const home = await request(fetcher, `${ORIGIN}/`);
  if (!home.ok) {
    throw new Error(`The production origin returned status ${home.status}.`);
  }

  const statusResponse = await request(
    fetcher,
    `${ORIGIN}/api/status/payments`,
  );
  const status = await statusResponse.json().catch(() => null);
  if (
    !statusResponse.ok ||
    status?.schemaVersion !== 1 ||
    status?.network !== "mainnet" ||
    status?.status !== "halted" ||
    status?.mode !== "halted" ||
    status?.operations?.create !== false ||
    status?.operations?.verify !== false
  ) {
    throw new Error("The production payment operations endpoint is not safely halted.");
  }

  const callbackResponse = await request(
    fetcher,
    `${ORIGIN}/api/xaman/callback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
  );
  const callback = await callbackResponse.json().catch(() => null);
  if (
    callbackResponse.status !== 401 ||
    callback?.error?.code !== "INVALID_XAMAN_SIGNATURE"
  ) {
    throw new Error("The production callback route did not reject unsigned input.");
  }

  const generatedAt = now().toISOString();
  return validateMainnetHaltedDeploymentReport(
    {
      schema_version: 1,
      network: "mainnet",
      generated_at: generatedAt,
      git_sha: context.gitSha,
      state: "verified",
      workflow_run_url: context.workflowRunUrl,
      public_url: ORIGIN,
      worker_name: WORKER_NAME,
      configuration_digest: configurationDigest,
      checks: {
        deployment_reachable: true,
        custom_domain_https_checked: true,
        runtime_configuration_checked: true,
        release_mode_internal: true,
        operations_halted: true,
        payment_creation_blocked: true,
        payment_verification_blocked: true,
        callback_route_checked: true,
        callback_verification_ready: true,
        sensitive_values_excluded: true,
      },
      evidence_patch: {
        id: "production-release-configuration",
        status: "accepted",
        recorded_at: generatedAt,
        public_url: ORIGIN,
        app_network: "mainnet",
        public_network: "mainnet",
        database_binding: DATABASE_BINDING,
        runtime_allowed: true,
        gate_approved: true,
        source_tag_approved: true,
        release_mode: "internal",
        operations_mode: "halted",
      },
    },
    context.gitSha,
  );
}

export async function executeMainnetHaltedDeploymentVerification({
  environment = process.env,
  fetcher = fetch,
  now = () => new Date(),
} = {}) {
  const report = await verifyMainnetHaltedDeployment({
    environment,
    fetcher,
    now,
  });
  const outputPath = resolve(
    requireText(
      environment.MAINNET_HALTED_DEPLOYMENT_REPORT_PATH,
      "MAINNET_HALTED_DEPLOYMENT_REPORT_PATH",
    ),
  );
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
    mode: 0o600,
  });
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  executeMainnetHaltedDeploymentVerification()
    .then(() => console.log("Verified the halted Mainnet deployment."))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
