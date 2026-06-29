#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { isValidClassicAddress } from "xrpl";

const EXPECTED = Object.freeze({
  workerName: "xrpl-group-pay-mainnet",
  origin: "https://xgp.badjoke-lab.com",
  sourceTag: "2171267705",
  databaseBinding: "PAYMENTS_DB_MAINNET",
  databaseName: "xrpl-group-pay-mainnet",
  assetId: "xrpl:mainnet:rlusd",
  currency: "524C555344000000000000000000000000000000",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
  precision: 6,
});

const MODES = Object.freeze(["enabled", "verify-only", "halted"]);
const WINDOW_MINUTES = 25;

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function findOne(items, id, context) {
  const matches = items.filter((item) => item.id === id);
  if (matches.length !== 1) {
    throw new Error(`${context} must contain exactly one ${id}.`);
  }
  return matches[0];
}

function formatUnits(units, precision = EXPECTED.precision) {
  const divisor = 10n ** BigInt(precision);
  const whole = units / divisor;
  const fraction = String(units % divisor).padStart(precision, "0");
  return `${whole}.${fraction}`;
}

function parseDestinationTag(value) {
  if (value === undefined || value === "") return null;
  if (!/^\d+$/.test(value)) {
    throw new Error("--destination-tag must be a UInt32 value.");
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 4_294_967_295) {
    throw new Error("--destination-tag must be a UInt32 value.");
  }
  return parsed;
}

function assertContractAndAsset(contract, assetRegistry) {
  if (
    contract?.schema_version !== 1 ||
    contract?.network !== "mainnet" ||
    contract?.stage !== "live-rlusd-acceptance" ||
    contract?.worker_name !== EXPECTED.workerName ||
    contract?.public_origin !== EXPECTED.origin ||
    contract?.database_binding !== EXPECTED.databaseBinding ||
    contract?.source_tag !== Number(EXPECTED.sourceTag) ||
    contract?.asset_id !== EXPECTED.assetId ||
    contract?.currency !== EXPECTED.currency ||
    contract?.issuer !== EXPECTED.issuer ||
    contract?.precision !== EXPECTED.precision ||
    contract?.minimum_amount_units !== 1 ||
    contract?.maximum_amount_units !== 1_000_000 ||
    contract?.participant_slots !== 2 ||
    contract?.recipient_readiness_required !== true ||
    contract?.payer_balance_required !== true ||
    contract?.release_mode !== "internal" ||
    contract?.required_baseline_operations_mode !== "halted" ||
    contract?.required_restore_operations_mode !== "halted"
  ) {
    throw new Error("The committed Mainnet RLUSD acceptance contract is invalid.");
  }

  const asset = findOne(
    assetRegistry?.assets ?? [],
    EXPECTED.assetId,
    "Mainnet Asset registry",
  );
  if (
    assetRegistry?.network !== "mainnet" ||
    assetRegistry?.state !== "identity_verified" ||
    asset.asset_type !== "issued" ||
    asset.currency !== EXPECTED.currency ||
    asset.issuer !== EXPECTED.issuer ||
    asset.precision !== EXPECTED.precision ||
    asset.verification_strategy !== "xrpl-issued-asset-v1" ||
    asset.receipt_contract !== "xrpl-issued-payment-v1"
  ) {
    throw new Error("The committed official Mainnet RLUSD identity is invalid.");
  }
}

function assertOperationalStage(releasePlan, evidence, acceptance) {
  if (
    releasePlan?.network !== "mainnet" ||
    releasePlan?.current_stage !== "live-rlusd-acceptance" ||
    releasePlan?.release_decision !== "blocked" ||
    JSON.stringify(releasePlan.remaining_evidence) !==
      JSON.stringify(["live-mainnet-rlusd-acceptance"])
  ) {
    throw new Error("The release plan is not at controlled Mainnet RLUSD acceptance.");
  }

  const xrp = findOne(
    evidence.records,
    "live-mainnet-xrp-acceptance",
    "Mainnet release evidence",
  );
  const rlusd = findOne(
    evidence.records,
    "live-mainnet-rlusd-acceptance",
    "Mainnet release evidence",
  );
  if (xrp.status !== "accepted" || rlusd.status !== "pending") {
    throw new Error("The Mainnet evidence state is not ready for RLUSD preparation.");
  }

  const open = acceptance.blocking_findings
    .filter((finding) => finding.status === "open")
    .map((finding) => finding.id);
  if (
    JSON.stringify(open) !==
    JSON.stringify(["live-rlusd-acceptance-not-recorded"])
  ) {
    throw new Error("The open Mainnet finding does not match RLUSD preparation.");
  }
}

function findMainnetDatabase(source) {
  const mainnet = source?.env?.mainnet;
  const database = mainnet?.d1_databases?.find(
    (entry) => entry.binding === EXPECTED.databaseBinding,
  );

  if (
    mainnet?.name !== EXPECTED.workerName ||
    mainnet?.vars?.APP_NETWORK !== "mainnet" ||
    mainnet?.vars?.NEXT_PUBLIC_APP_NETWORK !== "mainnet" ||
    mainnet?.vars?.NEXT_PUBLIC_APP_URL !== EXPECTED.origin ||
    mainnet?.vars?.MAINNET_RELEASE_MODE !== "internal" ||
    mainnet?.vars?.MAINNET_OPERATIONS_MODE !== "halted" ||
    mainnet?.vars?.XRPL_MAINNET_SOURCE_TAG !== EXPECTED.sourceTag ||
    mainnet?.vars?.PAYMENTS_DATABASE_BINDING !== EXPECTED.databaseBinding ||
    database?.database_name !== EXPECTED.databaseName ||
    typeof database?.database_id !== "string" ||
    !/^[a-f0-9-]{36}$/i.test(database.database_id) ||
    database.database_id === database.preview_database_id
  ) {
    throw new Error(
      "wrangler.jsonc is not the reviewed internal/halted Mainnet production target.",
    );
  }

  return { mainnet, database };
}

function assertNoPreviewDatabaseId(value, path = "config") {
  if (!value || typeof value !== "object") return;
  if (Object.hasOwn(value, "preview_database_id")) {
    throw new Error(`${path} must not contain preview_database_id.`);
  }
  for (const [key, child] of Object.entries(value)) {
    assertNoPreviewDatabaseId(child, `${path}.${key}`);
  }
}

function createStandaloneTarget(source, mode, digest, expiresAt) {
  const { mainnet, database } = findMainnetDatabase(source);
  const vars = { ...mainnet.vars, MAINNET_OPERATIONS_MODE: mode };

  if (mode === "halted") {
    delete vars.MAINNET_ACCEPTANCE_AUTH_DIGEST;
    delete vars.MAINNET_ACCEPTANCE_EXPIRES_AT;
  } else {
    vars.MAINNET_ACCEPTANCE_AUTH_DIGEST = digest;
    vars.MAINNET_ACCEPTANCE_EXPIRES_AT = expiresAt;
  }

  const target = {
    $schema: source.$schema,
    name: mainnet.name,
    main: source.main,
    compatibility_date: source.compatibility_date,
    compatibility_flags: source.compatibility_flags,
    assets: source.assets,
    vars,
    d1_databases: [
      {
        binding: database.binding,
        database_name: database.database_name,
        database_id: database.database_id,
        ...(database.migrations_dir
          ? { migrations_dir: database.migrations_dir }
          : {}),
      },
    ],
    routes: mainnet.routes,
    workers_dev: mainnet.workers_dev,
    observability: source.observability,
  };

  assertNoPreviewDatabaseId(target);

  if (
    target.d1_databases.length !== 1 ||
    target.d1_databases[0].database_id !== database.database_id ||
    target.d1_databases[0].binding !== EXPECTED.databaseBinding ||
    Object.hasOwn(target, "env")
  ) {
    throw new Error("The standalone RLUSD acceptance target is not production-only.");
  }

  return target;
}

async function writePrivate(path, content) {
  await writeFile(path, content, { mode: 0o600 });
  await chmod(path, 0o600);
}

const root = process.cwd();
const [
  sourceText,
  contract,
  assetRegistry,
  releasePlan,
  evidence,
  acceptance,
] = await Promise.all([
  readFile(resolve(root, "wrangler.jsonc"), "utf8"),
  readFile(resolve(root, "config/mainnet-rlusd-acceptance.json"), "utf8").then(
    JSON.parse,
  ),
  readFile(resolve(root, "config/xrpl-mainnet-assets.json"), "utf8").then(
    JSON.parse,
  ),
  readFile(resolve(root, "config/mainnet-release-plan.json"), "utf8").then(
    JSON.parse,
  ),
  readFile(resolve(root, "config/mainnet-release-evidence.json"), "utf8").then(
    JSON.parse,
  ),
  readFile(resolve(root, "config/mainnet-acceptance.json"), "utf8").then(
    JSON.parse,
  ),
]);

const source = parseJsonc(sourceText);
const { database } = findMainnetDatabase(source);
assertContractAndAsset(contract, assetRegistry);

if (process.argv.includes("--check")) {
  const digest = "a".repeat(64);
  const expiresAt = new Date(Date.now() + WINDOW_MINUTES * 60_000).toISOString();
  for (const mode of MODES) {
    createStandaloneTarget(source, mode, digest, expiresAt);
  }
  console.log(
    `Mainnet RLUSD acceptance preparation verified: worker=${EXPECTED.workerName}, production_d1=${database.database_id}, preview_excluded=true, asset=${EXPECTED.assetId}.`,
  );
  process.exit(0);
}

assertOperationalStage(releasePlan, evidence, acceptance);

const destination = readArgument("--destination");
const payer = readArgument("--payer");
const unitsInput = readArgument("--units") ?? "1";
const destinationTag = parseDestinationTag(readArgument("--destination-tag"));

if (!destination || !isValidClassicAddress(destination)) {
  throw new Error("--destination must be a valid XRPL classic address.");
}
if (!payer || !isValidClassicAddress(payer)) {
  throw new Error("--payer must be a valid XRPL classic address.");
}
if (destination === payer) {
  throw new Error("Destination and payer must be different accounts.");
}
if (!/^[1-9]\d*$/.test(unitsInput)) {
  throw new Error("--units must be a canonical positive integer.");
}

const units = BigInt(unitsInput);
if (
  units < BigInt(contract.minimum_amount_units) ||
  units > BigInt(contract.maximum_amount_units)
) {
  throw new Error(
    `--units must be between ${contract.minimum_amount_units} and ${contract.maximum_amount_units}.`,
  );
}

const billTotalUnits = units * BigInt(contract.participant_slots);
const primaryValue = formatUnits(units);
const billTotalValue = formatUnits(billTotalUnits);
const token = randomBytes(32).toString("base64url");
const digest = createHash("sha256").update(token).digest("hex");
const expiresAt = new Date(
  Date.now() + WINDOW_MINUTES * 60_000,
).toISOString();
const outputDirectory = resolve(root, ".tmp", "mainnet-rlusd-acceptance");
await mkdir(outputDirectory, { recursive: true });

for (const mode of MODES) {
  const target = createStandaloneTarget(source, mode, digest, expiresAt);
  await writePrivate(
    resolve(root, `wrangler.acceptance.${mode}.json`),
    `${JSON.stringify(target, null, 2)}\n`,
  );
}

const bill = {
  title: "Controlled Mainnet RLUSD acceptance",
  destinationAddress: destination,
  ...(destinationTag === null ? {} : { destinationTag }),
  settlementAssetId: EXPECTED.assetId,
  totalAmount: billTotalValue,
  creatorShareAmount: "0",
  allocation: { strategy: "custom" },
  participants: [
    {
      participantId: "primary",
      label: "Primary acceptance",
      expectedPayerAddress: payer,
      amount: primaryValue,
    },
    {
      participantId: "replay-control",
      label: "Replay control",
      expectedPayerAddress: payer,
      amount: primaryValue,
    },
  ],
};

await writePrivate(
  resolve(outputDirectory, "bill.json"),
  `${JSON.stringify(bill, null, 2)}\n`,
);
await writePrivate(
  resolve(outputDirectory, "operator-private.env"),
  [
    "# PRIVATE: do not commit, print, or paste into chat",
    `MAINNET_ACCEPTANCE_TOKEN=${token}`,
    `MAINNET_ACCEPTANCE_AUTH_DIGEST=${digest}`,
    `MAINNET_ACCEPTANCE_EXPIRES_AT=${expiresAt}`,
    `DESTINATION_ADDRESS=${destination}`,
    `DESTINATION_TAG=${destinationTag ?? ""}`,
    `EXPECTED_PAYER_ADDRESS=${payer}`,
    `AMOUNT_UNITS=${units}`,
    `AMOUNT_VALUE=${primaryValue}`,
    `BILL_TOTAL_UNITS=${billTotalUnits}`,
    `BILL_TOTAL_VALUE=${billTotalValue}`,
    "",
  ].join("\n"),
);
await writePrivate(
  resolve(outputDirectory, "REVIEW.txt"),
  [
    "XRPL Group Pay — Mainnet RLUSD acceptance preparation",
    "",
    "No deployment or API request was executed.",
    "",
    `worker: ${EXPECTED.workerName}`,
    "network: mainnet",
    "release mode: internal",
    "baseline operations mode: halted",
    `origin: ${EXPECTED.origin}`,
    `Source Tag: ${EXPECTED.sourceTag}`,
    `production D1 binding: ${EXPECTED.databaseBinding}`,
    `production D1 database ID: ${database.database_id}`,
    "preview_database_id included in deploy targets: false",
    `Asset ID: ${EXPECTED.assetId}`,
    `currency: ${EXPECTED.currency}`,
    `issuer: ${EXPECTED.issuer}`,
    `destination: ${destination}`,
    `Destination Tag: ${destinationTag ?? "none"}`,
    `payer: ${payer}`,
    `primary amount: ${primaryValue} RLUSD (${units} units)`,
    `Bill total: ${billTotalValue} RLUSD (${billTotalUnits} units)`,
    `replay-control amount: ${primaryValue} RLUSD (must remain unpaid)`,
    "",
    "Recipient readiness must confirm exact official RLUSD trust-line capacity for the full Bill total.",
    "Payer readiness must confirm the exact official RLUSD balance covers the primary amount and XRP covers reserve and fee requirements.",
    "Do not deploy until both readiness results are reviewed by the operator.",
    "",
    "Temporary sequence: halted -> enabled -> verify-only -> halted",
    `Temporary window ends: ${expiresAt}`,
    "",
    "Deploy generated standalone configs without --env.",
    "Run Wrangler dry-run and confirm the displayed D1 UUID equals the production ID above before any enabled deployment.",
    "Do not share .tmp/mainnet-rlusd-acceptance/operator-private.env.",
    "",
  ].join("\n"),
);

console.log("RLUSD preparation completed without deployment or API calls.");
console.log(`Production D1: ${database.database_id}`);
console.log("Preview database IDs excluded from all deploy targets.");
console.log(`Asset: ${EXPECTED.assetId}`);
console.log(`Amount: ${primaryValue} RLUSD`);
console.log(`Output directory: ${outputDirectory}`);
console.log(`Window ends: ${expiresAt}`);
console.log("Review REVIEW.txt. Do not share operator-private.env.");
