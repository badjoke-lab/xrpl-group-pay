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
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function dropsToXrp(drops) {
  const whole = drops / 1_000_000n;
  const fraction = String(drops % 1_000_000n).padStart(6, "0");
  return `${whole}.${fraction}`;
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
    throw new Error("The standalone acceptance target is not production-only.");
  }

  return target;
}

async function writePrivate(path, content) {
  await writeFile(path, content, { mode: 0o600 });
  await chmod(path, 0o600);
}

const root = process.cwd();
const source = parseJsonc(await readFile(resolve(root, "wrangler.jsonc"), "utf8"));
const { database } = findMainnetDatabase(source);

if (process.argv.includes("--check")) {
  const digest = "a".repeat(64);
  const expiresAt = new Date(Date.now() + WINDOW_MINUTES * 60_000).toISOString();
  for (const mode of MODES) {
    createStandaloneTarget(source, mode, digest, expiresAt);
  }
  console.log(
    `Mainnet XRP acceptance preparation verified: worker=${EXPECTED.workerName}, production_d1=${database.database_id}, preview_excluded=true.`,
  );
  process.exit(0);
}

const destination = readArgument("--destination");
const payer = readArgument("--payer");
const dropsInput = readArgument("--drops") ?? "1";

if (!destination || !isValidClassicAddress(destination)) {
  throw new Error("--destination must be a valid XRPL classic address.");
}
if (!payer || !isValidClassicAddress(payer)) {
  throw new Error("--payer must be a valid XRPL classic address.");
}
if (destination === payer) {
  throw new Error("Destination and payer must be different accounts.");
}
if (!/^[1-9]\d{0,3}$/.test(dropsInput)) {
  throw new Error("--drops must be an integer from 1 through 1000.");
}

const drops = BigInt(dropsInput);
if (drops < 1n || drops > 1_000n) {
  throw new Error("--drops must be between 1 and 1000.");
}

const token = randomBytes(32).toString("base64url");
const digest = createHash("sha256").update(token).digest("hex");
const expiresAt = new Date(
  Date.now() + WINDOW_MINUTES * 60_000,
).toISOString();
const outputDirectory = resolve(root, ".tmp", "mainnet-xrp-acceptance");
await mkdir(outputDirectory, { recursive: true });

for (const mode of MODES) {
  const target = createStandaloneTarget(source, mode, digest, expiresAt);
  await writePrivate(
    resolve(root, `wrangler.acceptance.${mode}.json`),
    `${JSON.stringify(target, null, 2)}\n`,
  );
}

const bill = {
  title: "Controlled Mainnet XRP acceptance",
  destinationAddress: destination,
  settlementAssetId: "xrpl:mainnet:xrp",
  totalAmount: dropsToXrp(drops * 2n),
  creatorShareAmount: "0",
  allocation: { strategy: "custom" },
  participants: [
    {
      participantId: "primary",
      label: "Primary acceptance",
      expectedPayerAddress: payer,
      amount: dropsToXrp(drops),
    },
    {
      participantId: "replay-control",
      label: "Replay control",
      expectedPayerAddress: payer,
      amount: dropsToXrp(drops),
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
    `EXPECTED_PAYER_ADDRESS=${payer}`,
    `AMOUNT_DROPS=${drops}`,
    "",
  ].join("\n"),
);
await writePrivate(
  resolve(outputDirectory, "REVIEW.txt"),
  [
    "XRPL Group Pay — Mainnet XRP acceptance preparation",
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
    `destination: ${destination}`,
    `payer: ${payer}`,
    `primary amount: ${drops} drop${drops === 1n ? "" : "s"}`,
    `replay-control amount: ${drops} drop${drops === 1n ? "" : "s"} (must remain unpaid)`,
    "",
    "Temporary sequence: halted -> enabled -> verify-only -> halted",
    `Temporary window ends: ${expiresAt}`,
    "",
    "Deploy the generated standalone configs without --env.",
    "Run a Wrangler dry-run and confirm the displayed D1 UUID equals the production ID above before any enabled deployment.",
    "Do not share .tmp/mainnet-xrp-acceptance/operator-private.env.",
    "",
  ].join("\n"),
);

console.log("Preparation completed without deployment or API calls.");
console.log(`Production D1: ${database.database_id}`);
console.log("Preview database IDs excluded from all deploy targets.");
console.log(`Output directory: ${outputDirectory}`);
console.log(`Window ends: ${expiresAt}`);
console.log("Review REVIEW.txt. Do not share operator-private.env.");
