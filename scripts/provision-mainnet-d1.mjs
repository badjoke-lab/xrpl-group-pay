import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

import { z } from "zod";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
const EXPECTED_MAINNET = Object.freeze({
  workerName: "xrpl-group-pay-mainnet",
  origin: "https://xgp.badjoke-lab.com",
  domain: "xgp.badjoke-lab.com",
  sourceTag: "2171267705",
});

const INITIAL_DEFAULTS = Object.freeze({
  ALLOW_MAINNET_RUNTIME: "false",
  MAINNET_GATE_APPROVED: "false",
  MAINNET_SOURCE_TAG_APPROVED: "false",
  MAINNET_RELEASE_MODE: "disabled",
  MAINNET_OPERATIONS_MODE: "halted",
});

const REVIEWED_HALTED_DEFAULTS = Object.freeze({
  ALLOW_MAINNET_RUNTIME: "true",
  MAINNET_GATE_APPROVED: "true",
  MAINNET_SOURCE_TAG_APPROVED: "true",
  MAINNET_RELEASE_MODE: "internal",
  MAINNET_OPERATIONS_MODE: "halted",
});

const policySchema = z
  .object({
    schema_version: z.literal(1),
    network: z.literal("mainnet"),
    binding: z.literal("PAYMENTS_DB_MAINNET"),
    production_database_name: z.string().min(1),
    preview_database_name: z.string().min(1),
    default_location: z.string().min(1),
    allowed_locations: z.array(z.string().min(1)).min(1),
    inspect_confirmation: z.string().min(1),
    provision_confirmation: z.string().min(1),
    required_tables: z.array(z.string().min(1)).min(1),
    required_verified_payment_columns: z.array(z.string().min(1)).min(1),
  })
  .strict();

const databaseSchema = z
  .object({
    name: z.string().min(1),
    id: z.string().regex(UUID_PATTERN),
  })
  .strict();

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

function matchesVariables(variables, expected) {
  return Object.entries(expected).every(([name, value]) => variables[name] === value);
}

export function classifyMainnetD1State(config, policy) {
  const mainnet = config?.env?.mainnet;
  const variables = mainnet?.vars ?? {};
  const bindings = mainnet?.d1_databases?.filter(
    (database) => database.binding === policy.binding,
  );
  if (!mainnet || bindings?.length !== 1) {
    throw new Error(`Wrangler must define exactly one ${policy.binding} binding.`);
  }

  const binding = bindings[0];
  if (binding.database_name !== policy.production_database_name) {
    throw new Error("Mainnet D1 binding uses an unexpected database name.");
  }

  if (matchesVariables(variables, INITIAL_DEFAULTS)) {
    return { kind: "initial-disabled", mainnet, binding };
  }

  const reviewedRoute = mainnet.routes?.some(
    (route) =>
      route.pattern === EXPECTED_MAINNET.domain && route.custom_domain === true,
  );
  if (
    matchesVariables(variables, REVIEWED_HALTED_DEFAULTS) &&
    mainnet.name === EXPECTED_MAINNET.workerName &&
    variables.APP_NETWORK === "mainnet" &&
    variables.NEXT_PUBLIC_APP_NETWORK === "mainnet" &&
    variables.NEXT_PUBLIC_APP_URL === EXPECTED_MAINNET.origin &&
    variables.XRPL_MAINNET_SOURCE_TAG === EXPECTED_MAINNET.sourceTag &&
    variables.PAYMENTS_DATABASE_BINDING === policy.binding &&
    reviewedRoute &&
    mainnet.workers_dev === false &&
    UUID_PATTERN.test(binding.database_id) &&
    UUID_PATTERN.test(binding.preview_database_id) &&
    binding.database_id !== ZERO_UUID &&
    binding.preview_database_id !== ZERO_UUID &&
    binding.database_id !== binding.preview_database_id
  ) {
    return { kind: "reviewed-halted", mainnet, binding };
  }

  throw new Error(
    "D1 operation requires the initial disabled state or the reviewed internal halted state.",
  );
}

function unwrapJsonPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.d1_databases)) return payload.d1_databases;
  return [];
}

export function normalizeD1List(payload) {
  return unwrapJsonPayload(payload).map((entry) =>
    databaseSchema.parse({
      name: entry.name ?? entry.database_name,
      id: entry.uuid ?? entry.id ?? entry.database_id,
    }),
  );
}

export function resolveDatabasePair(databases, policy, { requireBoth = true } = {}) {
  const byName = new Map();
  for (const database of databases) {
    const matches = byName.get(database.name) ?? [];
    matches.push(database);
    byName.set(database.name, matches);
  }

  for (const name of [
    policy.production_database_name,
    policy.preview_database_name,
  ]) {
    const matches = byName.get(name) ?? [];
    if (matches.length > 1) {
      throw new Error(`Multiple D1 databases use the protected name ${name}.`);
    }
  }

  const production = byName.get(policy.production_database_name)?.[0] ?? null;
  const preview = byName.get(policy.preview_database_name)?.[0] ?? null;
  if (requireBoth && (!production || !preview)) {
    const missing = [
      !production ? policy.production_database_name : null,
      !preview ? policy.preview_database_name : null,
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(`Required Mainnet D1 databases are missing: ${missing}.`);
  }
  if (production && preview && production.id === preview.id) {
    throw new Error("Production and preview D1 databases must use different IDs.");
  }
  return { production, preview };
}

export function assertProvisioningRequest(policy, { mode, confirmation, location }) {
  if (!["inspect", "provision"].includes(mode)) {
    throw new Error("Provisioning mode must be inspect or provision.");
  }
  const expected =
    mode === "provision"
      ? policy.provision_confirmation
      : policy.inspect_confirmation;
  if (confirmation !== expected) {
    throw new Error(`Confirmation text does not match the ${mode} operation.`);
  }
  if (!policy.allowed_locations.includes(location)) {
    throw new Error(`Unsupported D1 location hint: ${location}.`);
  }
}

export function createProvisionedWrangler(
  source,
  policy,
  { productionId, previewId },
) {
  if (!UUID_PATTERN.test(productionId) || productionId === ZERO_UUID) {
    throw new Error("Production D1 ID must be a non-placeholder UUID.");
  }
  if (!UUID_PATTERN.test(previewId) || previewId === ZERO_UUID) {
    throw new Error("Preview D1 ID must be a non-placeholder UUID.");
  }
  if (productionId === previewId) {
    throw new Error("Production and preview D1 IDs must be different.");
  }

  const config = parseJsonc(source);
  const state = classifyMainnetD1State(config, policy);
  if (
    state.kind === "reviewed-halted" &&
    (state.binding.database_id !== productionId ||
      state.binding.preview_database_id !== previewId)
  ) {
    throw new Error("Reviewed Mainnet D1 IDs must not change during forward migration.");
  }

  state.binding.database_id = productionId;
  state.binding.preview_database_id = previewId;
  return `${JSON.stringify(config, null, 2)}\n`;
}

async function walkSqlFiles(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkSqlFiles(path, root)));
    } else if (entry.isFile() && entry.name.endsWith(".sql")) {
      files.push(relative(root, path).replaceAll("\\", "/"));
    }
  }
  return files;
}

export async function listMigrationFiles(
  directory = resolve(process.cwd(), "migrations"),
) {
  return (await walkSqlFiles(directory)).sort((left, right) =>
    left.localeCompare(right),
  );
}

export function extractD1Rows(payload) {
  const candidates = Array.isArray(payload) ? payload : [payload];
  const rows = [];
  for (const candidate of candidates) {
    if (Array.isArray(candidate?.results)) rows.push(...candidate.results);
    if (Array.isArray(candidate?.result)) rows.push(...candidate.result);
    if (Array.isArray(candidate)) rows.push(...candidate);
  }
  return rows;
}

export function validateSchemaSnapshot({ tables, columns }, policy) {
  const tableNames = new Set(
    tables.map((row) => String(row.name ?? row.tbl_name ?? "")),
  );
  const missingTables = policy.required_tables.filter(
    (table) => !tableNames.has(table),
  );
  if (missingTables.length > 0) {
    throw new Error(`D1 schema is missing tables: ${missingTables.join(", ")}.`);
  }

  const columnNames = new Set(columns.map((row) => String(row.name ?? "")));
  const missingColumns = policy.required_verified_payment_columns.filter(
    (column) => !columnNames.has(column),
  );
  if (missingColumns.length > 0) {
    throw new Error(
      `verified_payment_records is missing columns: ${missingColumns.join(", ")}.`,
    );
  }
  return {
    required_tables_present: true,
    verified_payment_columns_present: true,
  };
}

export function assertKnownExistingTables(tables, policy) {
  const allowed = new Set([
    ...policy.required_tables,
    "d1_migrations",
    "verified_payment_receipts",
  ]);
  const unknown = tables
    .map((row) => String(row.name ?? ""))
    .filter((name) => name && !name.startsWith("sqlite_") && !allowed.has(name));
  if (unknown.length > 0) {
    throw new Error(
      `Existing protected-name D1 contains unknown tables: ${unknown.join(", ")}.`,
    );
  }
}

export function buildProvisioningReport({
  mode,
  gitSha,
  location,
  policy,
  pair,
  migrationFiles,
  productionInspection,
  previewInspection,
  generatedAt,
}) {
  const complete = Boolean(
    pair.production &&
      pair.preview &&
      productionInspection?.migration_count === migrationFiles.length &&
      previewInspection?.migration_count === migrationFiles.length &&
      productionInspection?.schema?.required_tables_present &&
      productionInspection?.schema?.verified_payment_columns_present &&
      previewInspection?.schema?.required_tables_present &&
      previewInspection?.schema?.verified_payment_columns_present,
  );
  return {
    schema_version: 1,
    network: "mainnet",
    mode,
    generated_at: generatedAt,
    git_sha: gitSha,
    location_hint: location,
    state: complete ? "verified" : "incomplete",
    databases: { production: pair.production, preview: pair.preview },
    migrations: {
      source_count: migrationFiles.length,
      files: migrationFiles,
      production_applied_count: productionInspection?.migration_count ?? null,
      preview_applied_count: previewInspection?.migration_count ?? null,
    },
    schema: {
      production: productionInspection?.schema ?? null,
      preview: previewInspection?.schema ?? null,
    },
    safe_defaults_preserved: true,
    evidence_patch: complete
      ? {
          id: "production-d1-provisioning",
          status: "accepted",
          recorded_at: generatedAt,
          database_name: policy.production_database_name,
          database_id: pair.production.id,
          preview_database_id: pair.preview.id,
          migration_count: migrationFiles.length,
          migrations_applied: true,
          receipt_schema_checked: true,
        }
      : null,
  };
}

function runCommand(args) {
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(pnpm, ["exec", "wrangler", ...args], {
    encoding: "utf8",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`Wrangler command failed: wrangler ${args.join(" ")}\n${output}`);
  }
  return result;
}

function runJsonCommand(args) {
  const source = runCommand(args).stdout.trim();
  if (!source) {
    throw new Error(`Wrangler returned no JSON for: wrangler ${args.join(" ")}`);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(
      `Wrangler returned invalid JSON for: wrangler ${args.join(" ")}`,
      { cause: error },
    );
  }
}

function targetArgs(configPath, preview = false) {
  return [
    "--remote",
    ...(preview ? ["--preview"] : []),
    "--config",
    configPath,
    "--env",
    "mainnet",
  ];
}

function listRemoteDatabases() {
  return normalizeD1List(runJsonCommand(["d1", "list", "--json"]));
}

function createRemoteDatabase(name, location) {
  runCommand(["d1", "create", name, "--location", location]);
}

function queryDatabase(configPath, sql, preview = false) {
  return extractD1Rows(
    runJsonCommand([
      "d1",
      "execute",
      "PAYMENTS_DB_MAINNET",
      ...targetArgs(configPath, preview),
      "--json",
      "--command",
      sql,
    ]),
  );
}

function applyMigrations(configPath, preview = false) {
  runCommand([
    "d1",
    "migrations",
    "apply",
    "PAYMENTS_DB_MAINNET",
    ...targetArgs(configPath, preview),
  ]);
}

function inspectDatabase(configPath, policy, preview = false) {
  const tables = queryDatabase(
    configPath,
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;",
    preview,
  );
  assertKnownExistingTables(tables, policy);
  const migrationCount = tables.some((row) => row.name === "d1_migrations")
    ? Number(
        queryDatabase(
          configPath,
          "SELECT COUNT(*) AS migration_count FROM d1_migrations;",
          preview,
        )[0]?.migration_count ?? 0,
      )
    : 0;
  const columns = tables.some((row) => row.name === "verified_payment_records")
    ? queryDatabase(configPath, "PRAGMA table_info(verified_payment_records);", preview)
    : [];
  let schema = {
    required_tables_present: false,
    verified_payment_columns_present: false,
  };
  try {
    schema = validateSchemaSnapshot({ tables, columns }, policy);
  } catch {
    // Inspect mode must still emit the incomplete state.
  }
  return { tables, columns, migration_count: migrationCount, schema };
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}.`);
    }
    values.set(argument.slice(2), value);
    index += 1;
  }
  return {
    mode: values.get("mode") ?? "inspect",
    confirmation: values.get("confirmation") ?? "",
    location: values.get("location"),
    output: values.get("output") ?? resolve(process.cwd(), "mainnet-d1-report.json"),
    configOutput:
      values.get("config-output") ??
      resolve(process.cwd(), ".tmp/wrangler.mainnet-provisioned.jsonc"),
    policyPath:
      values.get("policy") ??
      resolve(process.cwd(), "config/mainnet-d1-provisioning.json"),
    wranglerPath:
      values.get("wrangler") ?? resolve(process.cwd(), "wrangler.jsonc"),
  };
}

function assertCloudflareCredentials() {
  for (const name of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]) {
    if (!process.env[name]) {
      throw new Error(`${name} is required for remote D1 inspection.`);
    }
  }
}

export async function runMainnetD1Provisioning(options = {}) {
  const policyPath =
    options.policyPath ??
    resolve(process.cwd(), "config/mainnet-d1-provisioning.json");
  const wranglerPath =
    options.wranglerPath ?? resolve(process.cwd(), "wrangler.jsonc");
  const output =
    options.output ?? resolve(process.cwd(), "mainnet-d1-report.json");
  const configOutput =
    options.configOutput ??
    resolve(process.cwd(), ".tmp/wrangler.mainnet-provisioned.jsonc");
  const mode = options.mode ?? "inspect";
  const gitSha = options.gitSha ?? process.env.GITHUB_SHA ?? "local";
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  const [policy, wranglerSource] = await Promise.all([
    readFile(policyPath, "utf8").then(JSON.parse).then(policySchema.parse),
    readFile(wranglerPath, "utf8"),
  ]);
  const location = options.location ?? policy.default_location;
  assertProvisioningRequest(policy, {
    mode,
    confirmation: options.confirmation ?? "",
    location,
  });
  assertCloudflareCredentials();

  const committedState = classifyMainnetD1State(
    parseJsonc(wranglerSource),
    policy,
  );
  let databases = listRemoteDatabases();
  let pair = resolveDatabasePair(databases, policy, { requireBoth: false });

  if (mode === "provision" && committedState.kind === "initial-disabled") {
    if (!pair.production) {
      createRemoteDatabase(policy.production_database_name, location);
    }
    if (!pair.preview) {
      createRemoteDatabase(policy.preview_database_name, location);
    }
    databases = listRemoteDatabases();
    pair = resolveDatabasePair(databases, policy, { requireBoth: true });
  } else if (committedState.kind === "reviewed-halted") {
    pair = resolveDatabasePair(databases, policy, { requireBoth: true });
    if (
      pair.production.id !== committedState.binding.database_id ||
      pair.preview.id !== committedState.binding.preview_database_id
    ) {
      throw new Error("Remote protected D1 IDs differ from the reviewed binding.");
    }
  }

  const migrationFiles = await listMigrationFiles();
  let productionInspection = null;
  let previewInspection = null;
  if (pair.production && pair.preview) {
    const provisionedConfig = createProvisionedWrangler(wranglerSource, policy, {
      productionId: pair.production.id,
      previewId: pair.preview.id,
    });
    await mkdir(dirname(configOutput), { recursive: true });
    await writeFile(configOutput, provisionedConfig);

    productionInspection = inspectDatabase(configOutput, policy, false);
    previewInspection = inspectDatabase(configOutput, policy, true);
    if (mode === "provision") {
      applyMigrations(configOutput, true);
      previewInspection = inspectDatabase(configOutput, policy, true);
      if (previewInspection.migration_count !== migrationFiles.length) {
        throw new Error("Preview D1 migration count does not match the repository.");
      }
      validateSchemaSnapshot(previewInspection, policy);

      applyMigrations(configOutput, false);
      productionInspection = inspectDatabase(configOutput, policy, false);
      if (productionInspection.migration_count !== migrationFiles.length) {
        throw new Error("Production D1 migration count does not match the repository.");
      }
      validateSchemaSnapshot(productionInspection, policy);
    }
  }

  const report = buildProvisioningReport({
    mode,
    gitSha,
    location,
    policy,
    pair,
    migrationFiles,
    productionInspection,
    previewInspection,
    generatedAt,
  });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  if (mode === "provision" && report.state !== "verified") {
    throw new Error("Mainnet D1 provisioning did not produce verified evidence.");
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMainnetD1Provisioning({
    ...parseArguments(process.argv.slice(2)),
    gitSha: process.env.GITHUB_SHA,
  })
    .then((report) => {
      console.log(
        `Mainnet D1 provisioning: mode=${report.mode}, state=${report.state}, migrations=${report.migrations.source_count}`,
      );
    })
    .catch((error) => {
      console.error(
        `Mainnet D1 provisioning failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    });
}
