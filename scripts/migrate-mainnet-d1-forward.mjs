import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  assertKnownExistingTables,
  extractD1Rows,
  listMigrationFiles,
  validateSchemaSnapshot,
} from "./provision-mainnet-d1.mjs";

const EXPECTED = Object.freeze({
  workerName: "xrpl-group-pay-mainnet",
  origin: "https://xgp.badjoke-lab.com",
  domain: "xgp.badjoke-lab.com",
  binding: "PAYMENTS_DB_MAINNET",
  productionName: "xrpl-group-pay-mainnet",
  previewName: "xrpl-group-pay-mainnet-preview",
  sourceTag: "2171267705",
  inspectConfirmation: "INSPECT FORWARD xrpl-group-pay-mainnet",
  migrateConfirmation:
    "MIGRATE FORWARD xrpl-group-pay-mainnet AND xrpl-group-pay-mainnet-preview",
});

const ALLOWED_STAGES = new Set([
  "live-xrp-acceptance",
  "live-rlusd-acceptance",
  "final-release-audit",
]);

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

function findOne(items, id, context) {
  const matches = items.filter((item) => item.id === id);
  if (matches.length !== 1) {
    throw new Error(`${context} must contain exactly one ${id}.`);
  }
  return matches[0];
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function runWrangler(args) {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(command, ["exec", "wrangler", ...args], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`Wrangler failed: ${args.join(" ")}\n${output}`);
  }
  return result.stdout;
}

function runWranglerJson(args) {
  const output = runWrangler(args).trim();
  if (!output) throw new Error(`Wrangler returned no JSON: ${args.join(" ")}`);
  return JSON.parse(output);
}

function targetArgs(configPath, preview) {
  return [
    "--remote",
    ...(preview ? ["--preview"] : []),
    "--config",
    configPath,
    "--env",
    "mainnet",
  ];
}

function query(configPath, sql, preview) {
  return extractD1Rows(
    runWranglerJson([
      "d1",
      "execute",
      EXPECTED.binding,
      ...targetArgs(configPath, preview),
      "--json",
      "--command",
      sql,
    ]),
  );
}

function applyMigrations(configPath, preview) {
  runWrangler([
    "d1",
    "migrations",
    "apply",
    EXPECTED.binding,
    ...targetArgs(configPath, preview),
  ]);
}

function inspectDatabase(configPath, policy, preview) {
  const tables = query(
    configPath,
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;",
    preview,
  );
  assertKnownExistingTables(tables, policy);

  const migrationCount = tables.some((row) => row.name === "d1_migrations")
    ? Number(
        query(
          configPath,
          "SELECT COUNT(*) AS migration_count FROM d1_migrations;",
          preview,
        )[0]?.migration_count ?? 0,
      )
    : 0;
  const columns = tables.some((row) => row.name === "verified_payment_records")
    ? query(configPath, "PRAGMA table_info(verified_payment_records);", preview)
    : [];

  let schema = {
    required_tables_present: false,
    verified_payment_columns_present: false,
  };
  try {
    schema = validateSchemaSnapshot({ tables, columns }, policy);
  } catch {
    // Inspection must report an incomplete pre-migration schema without hiding it.
  }

  return { migration_count: migrationCount, schema };
}

export function assertForwardMigrationState({
  wrangler,
  releasePlan,
  evidence,
  policy,
}) {
  if (
    releasePlan?.release_decision !== "blocked" ||
    !ALLOWED_STAGES.has(releasePlan?.current_stage)
  ) {
    throw new Error("Forward migration requires a later blocked Mainnet stage.");
  }

  const d1 = findOne(
    evidence?.records ?? [],
    "production-d1-provisioning",
    "Mainnet release evidence",
  );
  const release = findOne(
    evidence?.records ?? [],
    "production-release-configuration",
    "Mainnet release evidence",
  );
  if (
    d1.status !== "accepted" ||
    !Number.isInteger(d1.migration_count) ||
    d1.migration_count < 1 ||
    release.status !== "accepted" ||
    release.operations_mode !== "halted" ||
    release.release_mode !== "internal"
  ) {
    throw new Error("Forward migration requires accepted halted production evidence.");
  }

  const mainnet = wrangler?.env?.mainnet;
  const vars = mainnet?.vars;
  const binding = mainnet?.d1_databases?.find(
    (entry) => entry.binding === EXPECTED.binding,
  );
  const route = mainnet?.routes?.some(
    (entry) => entry.pattern === EXPECTED.domain && entry.custom_domain === true,
  );

  if (
    mainnet?.name !== EXPECTED.workerName ||
    vars?.APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_URL !== EXPECTED.origin ||
    vars?.ALLOW_MAINNET_RUNTIME !== "true" ||
    vars?.MAINNET_GATE_APPROVED !== "true" ||
    vars?.MAINNET_SOURCE_TAG_APPROVED !== "true" ||
    vars?.XRPL_MAINNET_SOURCE_TAG !== EXPECTED.sourceTag ||
    vars?.MAINNET_RELEASE_MODE !== "internal" ||
    vars?.MAINNET_OPERATIONS_MODE !== "halted" ||
    vars?.PAYMENTS_DATABASE_BINDING !== EXPECTED.binding ||
    binding?.database_name !== EXPECTED.productionName ||
    binding?.database_id !== d1.database_id ||
    binding?.preview_database_id !== d1.preview_database_id ||
    binding.database_id === binding.preview_database_id ||
    !route ||
    mainnet?.workers_dev !== false ||
    policy?.binding !== EXPECTED.binding ||
    policy?.production_database_name !== EXPECTED.productionName ||
    policy?.preview_database_name !== EXPECTED.previewName
  ) {
    throw new Error("The committed Mainnet target is not the reviewed halted D1 target.");
  }

  return {
    stage: releasePlan.current_stage,
    acceptedMigrationCount: d1.migration_count,
    productionId: binding.database_id,
    previewId: binding.preview_database_id,
  };
}

export function buildForwardMigrationReport({
  mode,
  gitSha,
  generatedAt,
  state,
  migrationFiles,
  before,
  after,
  context,
}) {
  const verified =
    after.production.migration_count === migrationFiles.length &&
    after.preview.migration_count === migrationFiles.length &&
    after.production.schema.required_tables_present === true &&
    after.production.schema.verified_payment_columns_present === true &&
    after.preview.schema.required_tables_present === true &&
    after.preview.schema.verified_payment_columns_present === true;

  return {
    schema_version: 1,
    network: "mainnet",
    operation: "forward-migration",
    mode,
    generated_at: generatedAt,
    git_sha: gitSha,
    state: verified ? "verified" : state,
    release_stage: context.stage,
    databases: {
      production: { name: EXPECTED.productionName, id: context.productionId },
      preview: { name: EXPECTED.previewName, id: context.previewId },
    },
    migrations: {
      accepted_evidence_count: context.acceptedMigrationCount,
      source_count: migrationFiles.length,
      files: migrationFiles,
      production_before_count: before.production.migration_count,
      preview_before_count: before.preview.migration_count,
      production_after_count: after.production.migration_count,
      preview_after_count: after.preview.migration_count,
    },
    schema: {
      production: after.production.schema,
      preview: after.preview.schema,
    },
    safety: {
      release_blocked: true,
      release_internal: true,
      operations_halted: true,
      preview_applied_before_production: mode === "migrate",
      database_ids_unchanged: true,
      worker_deployed: false,
    },
    evidence_patch: verified
      ? {
          id: "production-d1-provisioning",
          status: "accepted",
          recorded_at: generatedAt,
          database_name: EXPECTED.productionName,
          database_id: context.productionId,
          preview_database_id: context.previewId,
          migration_count: migrationFiles.length,
          migrations_applied: true,
          receipt_schema_checked: true,
        }
      : null,
  };
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
    output: values.get("output") ?? resolve(process.cwd(), "mainnet-d1-forward-report.json"),
  };
}

export async function runForwardMigration(options = {}) {
  if (process.env.GITHUB_ACTIONS !== "true") {
    throw new Error("Forward migration may run only in GitHub Actions.");
  }
  requiredEnvironment("CLOUDFLARE_API_TOKEN");
  requiredEnvironment("CLOUDFLARE_ACCOUNT_ID");

  const mode = options.mode ?? "inspect";
  const expectedConfirmation =
    mode === "migrate"
      ? EXPECTED.migrateConfirmation
      : EXPECTED.inspectConfirmation;
  if (!['inspect', 'migrate'].includes(mode) || options.confirmation !== expectedConfirmation) {
    throw new Error("Forward migration confirmation is invalid.");
  }

  const root = process.cwd();
  const configPath = resolve(root, "wrangler.jsonc");
  const [wranglerSource, releasePlan, evidence, policy] = await Promise.all([
    readFile(configPath, "utf8"),
    readFile(resolve(root, "config/mainnet-release-plan.json"), "utf8").then(JSON.parse),
    readFile(resolve(root, "config/mainnet-release-evidence.json"), "utf8").then(JSON.parse),
    readFile(resolve(root, "config/mainnet-d1-provisioning.json"), "utf8").then(JSON.parse),
  ]);
  const context = assertForwardMigrationState({
    wrangler: parseJsonc(wranglerSource),
    releasePlan,
    evidence,
    policy,
  });
  const migrationFiles = await listMigrationFiles();
  if (migrationFiles.length < context.acceptedMigrationCount) {
    throw new Error("Repository migration count is behind accepted Mainnet evidence.");
  }

  const before = {
    production: inspectDatabase(configPath, policy, false),
    preview: inspectDatabase(configPath, policy, true),
  };
  for (const [label, inspection] of Object.entries(before)) {
    if (
      inspection.migration_count < context.acceptedMigrationCount ||
      inspection.migration_count > migrationFiles.length
    ) {
      throw new Error(`${label} D1 migration count is outside the reviewed range.`);
    }
  }

  const after = structuredClone(before);
  if (mode === "migrate") {
    applyMigrations(configPath, true);
    after.preview = inspectDatabase(configPath, policy, true);
    if (
      after.preview.migration_count !== migrationFiles.length ||
      !after.preview.schema.required_tables_present ||
      !after.preview.schema.verified_payment_columns_present
    ) {
      throw new Error("Preview D1 did not reach the complete reviewed schema.");
    }

    applyMigrations(configPath, false);
    after.production = inspectDatabase(configPath, policy, false);
    if (
      after.production.migration_count !== migrationFiles.length ||
      !after.production.schema.required_tables_present ||
      !after.production.schema.verified_payment_columns_present
    ) {
      throw new Error("Production D1 did not reach the complete reviewed schema.");
    }
  }

  const report = buildForwardMigrationReport({
    mode,
    gitSha: process.env.GITHUB_SHA,
    generatedAt: new Date().toISOString(),
    state: "incomplete",
    migrationFiles,
    before,
    after,
    context,
  });
  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  if (mode === "migrate" && report.state !== "verified") {
    throw new Error("Forward migration did not produce verified evidence.");
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArguments(process.argv.slice(2));
  runForwardMigration(options)
    .then((report) => {
      console.log(
        `Mainnet D1 forward migration: mode=${report.mode}, state=${report.state}, migrations=${report.migrations.source_count}`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
