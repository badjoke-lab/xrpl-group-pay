import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
const REPOSITORY = "badjoke-lab/xrpl-group-pay";

const databaseSchema = z
  .object({
    name: z.string().min(1),
    id: z.string().regex(UUID_PATTERN),
  })
  .strict();

const schemaCheckSchema = z
  .object({
    required_tables_present: z.literal(true),
    verified_payment_columns_present: z.literal(true),
  })
  .strict();

const evidencePatchSchema = z
  .object({
    id: z.literal("production-d1-provisioning"),
    status: z.literal("accepted"),
    recorded_at: z.string().datetime({ offset: false }),
    database_name: z.literal("xrpl-group-pay-mainnet"),
    database_id: z.string().regex(UUID_PATTERN),
    preview_database_id: z.string().regex(UUID_PATTERN),
    migration_count: z.number().int().positive(),
    migrations_applied: z.literal(true),
    receipt_schema_checked: z.literal(true),
  })
  .strict();

const reportSchema = z
  .object({
    schema_version: z.literal(1),
    network: z.literal("mainnet"),
    mode: z.literal("provision"),
    generated_at: z.string().datetime({ offset: false }),
    git_sha: z.string().regex(SHA_PATTERN),
    location_hint: z.string().min(1),
    state: z.literal("verified"),
    databases: z
      .object({
        production: databaseSchema,
        preview: databaseSchema,
      })
      .strict(),
    migrations: z
      .object({
        source_count: z.number().int().positive(),
        files: z.array(z.string().regex(/^\d{4}_[A-Za-z0-9_.-]+\.sql$/)).min(1),
        production_applied_count: z.number().int().positive(),
        preview_applied_count: z.number().int().positive(),
      })
      .strict(),
    schema: z
      .object({
        production: schemaCheckSchema,
        preview: schemaCheckSchema,
      })
      .strict(),
    safe_defaults_preserved: z.literal(true),
    evidence_patch: evidencePatchSchema,
  })
  .strict();

const acceptanceSchema = z.object({
  schema_version: z.literal(1),
  audit_status: z.literal("completed"),
  release_decision: z.literal("blocked"),
  audited_at: z.string(),
  controls: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["passed", "pending", "failed"]),
      evidence: z.string(),
    }),
  ),
  blocking_findings: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["open", "resolved"]),
      evidence: z.string(),
    }),
  ),
});

const evidenceDocumentSchema = z.object({
  schema_version: z.literal(1),
  network: z.literal("mainnet"),
  updated_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(z.object({ id: z.string() }).passthrough()),
});

function parseJsonc(source) {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(
    /(^|[^:])\/\/.*$/gm,
    "$1",
  );
  return JSON.parse(withoutLineComments);
}

function findOne(items, id, label) {
  const matches = items.filter((item) => item.id === id);
  if (matches.length !== 1) {
    throw new Error(`${label} must contain exactly one ${id} entry.`);
  }
  return matches[0];
}

function assertPlaceholderOrSame(current, expected, label) {
  if (current !== ZERO_UUID && current !== expected) {
    throw new Error(`${label} already contains a different non-placeholder D1 ID.`);
  }
}

export function validateWorkflowRunUrl(runUrl) {
  let parsed;
  try {
    parsed = new URL(runUrl);
  } catch {
    throw new Error("Workflow run URL must be a valid URL.");
  }
  const match = parsed.pathname.match(
    /^\/badjoke-lab\/xrpl-group-pay\/actions\/runs\/([1-9]\d*)\/?$/,
  );
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "github.com" ||
    !match ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      `Workflow run URL must identify a ${REPOSITORY} GitHub Actions run.`,
    );
  }
  return { url: parsed.toString().replace(/\/$/, ""), runId: match[1] };
}

export function validateProvisioningReport(rawReport, expectedGitSha) {
  const report = reportSchema.parse(rawReport);
  if (report.git_sha !== expectedGitSha) {
    throw new Error(
      `Provisioning report commit ${report.git_sha} does not match expected commit ${expectedGitSha}.`,
    );
  }

  const { production, preview } = report.databases;
  if (production.name !== "xrpl-group-pay-mainnet") {
    throw new Error("Provisioning report uses an unexpected production database name.");
  }
  if (preview.name !== "xrpl-group-pay-mainnet-preview") {
    throw new Error("Provisioning report uses an unexpected preview database name.");
  }
  if (production.id === ZERO_UUID || preview.id === ZERO_UUID) {
    throw new Error("Provisioning report contains a placeholder D1 ID.");
  }
  if (production.id === preview.id) {
    throw new Error("Provisioning report reuses one D1 ID for production and preview.");
  }

  const migrationCount = report.migrations.source_count;
  if (
    report.migrations.files.length !== migrationCount ||
    new Set(report.migrations.files).size !== migrationCount ||
    report.migrations.production_applied_count !== migrationCount ||
    report.migrations.preview_applied_count !== migrationCount
  ) {
    throw new Error("Provisioning report migration counts are inconsistent.");
  }

  const patch = report.evidence_patch;
  if (
    patch.recorded_at !== report.generated_at ||
    patch.database_id !== production.id ||
    patch.preview_database_id !== preview.id ||
    patch.migration_count !== migrationCount
  ) {
    throw new Error("Provisioning report evidence patch does not match the report.");
  }

  return report;
}

export function applyProvisioningReport({
  report: rawReport,
  expectedGitSha,
  workflowRunUrl,
  wrangler: rawWrangler,
  evidence: rawEvidence,
  acceptance: rawAcceptance,
}) {
  const report = validateProvisioningReport(rawReport, expectedGitSha);
  const run = validateWorkflowRunUrl(workflowRunUrl);
  const wrangler = structuredClone(rawWrangler);
  const evidence = evidenceDocumentSchema.parse(structuredClone(rawEvidence));
  const acceptance = acceptanceSchema.parse(structuredClone(rawAcceptance));

  const mainnet = wrangler?.env?.mainnet;
  if (!mainnet || !Array.isArray(mainnet.d1_databases)) {
    throw new Error("Wrangler must define env.mainnet.d1_databases.");
  }
  const bindings = mainnet.d1_databases.filter(
    (database) => database.binding === "PAYMENTS_DB_MAINNET",
  );
  if (bindings.length !== 1) {
    throw new Error("Wrangler must contain exactly one PAYMENTS_DB_MAINNET binding.");
  }
  const binding = bindings[0];
  if (binding.database_name !== report.databases.production.name) {
    throw new Error("Wrangler Mainnet database name does not match the report.");
  }
  assertPlaceholderOrSame(
    binding.database_id,
    report.databases.production.id,
    "Wrangler production binding",
  );
  assertPlaceholderOrSame(
    binding.preview_database_id,
    report.databases.preview.id,
    "Wrangler preview binding",
  );

  const safeVariables = {
    ALLOW_MAINNET_RUNTIME: "false",
    MAINNET_GATE_APPROVED: "false",
    MAINNET_SOURCE_TAG_APPROVED: "false",
    MAINNET_RELEASE_MODE: "disabled",
    MAINNET_OPERATIONS_MODE: "halted",
    PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
  };
  for (const [name, expected] of Object.entries(safeVariables)) {
    if (mainnet.vars?.[name] !== expected) {
      throw new Error(`Import requires safe Mainnet value ${name}=${expected}.`);
    }
  }

  const evidenceRecord = findOne(
    evidence.records,
    "production-d1-provisioning",
    "Mainnet release evidence",
  );
  if (evidenceRecord.status === "accepted") {
    const expected = report.evidence_patch;
    for (const [key, value] of Object.entries(expected)) {
      if (evidenceRecord[key] !== value) {
        throw new Error(
          "Existing accepted D1 evidence differs from the provisioning report.",
        );
      }
    }
  } else if (evidenceRecord.status !== "pending") {
    throw new Error("D1 evidence must be pending or an exact accepted replay.");
  }

  const control = findOne(
    acceptance.controls,
    "production-d1-provisioning",
    "Mainnet acceptance controls",
  );
  const finding = findOne(
    acceptance.blocking_findings,
    "production-d1-not-provisioned",
    "Mainnet blocking findings",
  );
  if (
    !(
      (control.status === "pending" && finding.status === "open") ||
      (control.status === "passed" && finding.status === "resolved")
    )
  ) {
    throw new Error("D1 acceptance control and finding are not in a valid pair.");
  }

  binding.database_id = report.databases.production.id;
  binding.preview_database_id = report.databases.preview.id;

  Object.assign(evidenceRecord, report.evidence_patch);
  evidence.updated_at = report.generated_at.slice(0, 10);

  const evidenceSummary = [
    `GitHub Actions run ${run.url}`,
    `verified ${report.migrations.source_count} migrations on isolated production and preview D1 databases`,
    `from commit ${report.git_sha}`,
  ].join(" ");
  control.status = "passed";
  control.evidence = `${evidenceSummary}.`;
  finding.status = "resolved";
  finding.evidence = `${evidenceSummary}; the committed PAYMENTS_DB_MAINNET IDs now match the verified report.`;

  return { wrangler, evidence, acceptance, runId: run.runId };
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const name = argument.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${name}.`);
    }
    values.set(name, value);
    index += 1;
  }
  return {
    reportPath: values.get("report"),
    workflowRunUrl: values.get("workflow-run-url"),
    expectedGitSha: values.get("expected-git-sha"),
    wranglerPath: values.get("wrangler") ?? resolve(process.cwd(), "wrangler.jsonc"),
    evidencePath:
      values.get("evidence") ??
      resolve(process.cwd(), "config/mainnet-release-evidence.json"),
    acceptancePath:
      values.get("acceptance") ??
      resolve(process.cwd(), "config/mainnet-acceptance.json"),
  };
}

function currentGitSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

export async function importMainnetD1ProvisioningReport(options) {
  if (!options.reportPath) {
    throw new Error("--report is required.");
  }
  if (!options.workflowRunUrl) {
    throw new Error("--workflow-run-url is required.");
  }
  const expectedGitSha = options.expectedGitSha ?? currentGitSha();
  const [reportSource, wranglerSource, evidenceSource, acceptanceSource] =
    await Promise.all([
      readFile(options.reportPath, "utf8"),
      readFile(options.wranglerPath, "utf8"),
      readFile(options.evidencePath, "utf8"),
      readFile(options.acceptancePath, "utf8"),
    ]);

  const result = applyProvisioningReport({
    report: JSON.parse(reportSource),
    expectedGitSha,
    workflowRunUrl: options.workflowRunUrl,
    wrangler: parseJsonc(wranglerSource),
    evidence: JSON.parse(evidenceSource),
    acceptance: JSON.parse(acceptanceSource),
  });

  await Promise.all([
    writeFile(options.wranglerPath, `${JSON.stringify(result.wrangler, null, 2)}\n`),
    writeFile(options.evidencePath, `${JSON.stringify(result.evidence, null, 2)}\n`),
    writeFile(
      options.acceptancePath,
      `${JSON.stringify(result.acceptance, null, 2)}\n`,
    ),
  ]);

  return result;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const result = await importMainnetD1ProvisioningReport(options);
  console.log(
    `Imported Mainnet D1 provisioning evidence from workflow run ${result.runId}. Mainnet release remains blocked.`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Mainnet D1 evidence import failed: ${message}`);
    process.exit(1);
  });
}
