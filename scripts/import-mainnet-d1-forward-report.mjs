import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  validateProvisioningReport,
  validateWorkflowRunUrl,
} from "./import-mainnet-d1-provisioning-report.mjs";

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

function findOne(items, id, label) {
  const matches = items.filter((item) => item.id === id);
  if (matches.length !== 1) {
    throw new Error(`${label} must contain exactly one ${id} entry.`);
  }
  return matches[0];
}

function currentGitSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

function assertReviewedHaltedTarget(wrangler, report) {
  const mainnet = wrangler?.env?.mainnet;
  const vars = mainnet?.vars;
  const binding = mainnet?.d1_databases?.find(
    (entry) => entry.binding === "PAYMENTS_DB_MAINNET",
  );
  const route = mainnet?.routes?.some(
    (entry) =>
      entry.pattern === "xgp.badjoke-lab.com" && entry.custom_domain === true,
  );

  if (
    mainnet?.name !== "xrpl-group-pay-mainnet" ||
    vars?.APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_URL !== "https://xgp.badjoke-lab.com" ||
    vars?.ALLOW_MAINNET_RUNTIME !== "true" ||
    vars?.MAINNET_GATE_APPROVED !== "true" ||
    vars?.MAINNET_SOURCE_TAG_APPROVED !== "true" ||
    vars?.XRPL_MAINNET_SOURCE_TAG !== "2171267705" ||
    vars?.MAINNET_RELEASE_MODE !== "internal" ||
    vars?.MAINNET_OPERATIONS_MODE !== "halted" ||
    vars?.PAYMENTS_DATABASE_BINDING !== "PAYMENTS_DB_MAINNET" ||
    binding?.database_name !== "xrpl-group-pay-mainnet" ||
    binding?.database_id !== report.databases.production.id ||
    binding?.preview_database_id !== report.databases.preview.id ||
    binding.database_id === binding.preview_database_id ||
    !route ||
    mainnet?.workers_dev !== false
  ) {
    throw new Error(
      "Forward D1 evidence import requires the reviewed internal halted target with unchanged database IDs.",
    );
  }
}

export function applyForwardProvisioningReport({
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
  const evidence = structuredClone(rawEvidence);
  const acceptance = structuredClone(rawAcceptance);

  if (
    evidence?.network !== "mainnet" ||
    acceptance?.release_decision !== "blocked"
  ) {
    throw new Error("Forward D1 evidence import requires a blocked Mainnet release.");
  }
  assertReviewedHaltedTarget(wrangler, report);

  const current = findOne(
    evidence.records ?? [],
    "production-d1-provisioning",
    "Mainnet release evidence",
  );
  const release = findOne(
    evidence.records ?? [],
    "production-release-configuration",
    "Mainnet release evidence",
  );
  if (
    current.status !== "accepted" ||
    release.status !== "accepted" ||
    release.release_mode !== "internal" ||
    release.operations_mode !== "halted"
  ) {
    throw new Error("Forward D1 evidence import requires accepted halted evidence.");
  }

  const patch = report.evidence_patch;
  for (const key of [
    "id",
    "status",
    "database_name",
    "database_id",
    "preview_database_id",
    "migrations_applied",
    "receipt_schema_checked",
  ]) {
    if (current[key] !== patch[key]) {
      throw new Error("Forward D1 evidence changes an immutable field.");
    }
  }
  if (patch.migration_count <= current.migration_count) {
    throw new Error("Forward D1 evidence must increase migration_count.");
  }
  if (Date.parse(patch.recorded_at) <= Date.parse(current.recorded_at)) {
    throw new Error("Forward D1 evidence must use a newer recorded_at value.");
  }

  const control = findOne(
    acceptance.controls ?? [],
    "production-d1-provisioning",
    "Mainnet acceptance controls",
  );
  const finding = findOne(
    acceptance.blocking_findings ?? [],
    "production-d1-not-provisioned",
    "Mainnet blocking findings",
  );
  if (control.status !== "passed" || finding.status !== "resolved") {
    throw new Error(
      "Forward D1 evidence requires the existing D1 control to remain passed and resolved.",
    );
  }

  Object.assign(current, patch);
  evidence.updated_at = report.generated_at.slice(0, 10);
  const summary = `GitHub Actions run ${run.url} verified ${report.migrations.source_count} migrations on the unchanged isolated production and preview D1 databases from commit ${report.git_sha}`;
  control.evidence = `${summary}.`;
  finding.evidence = `${summary}; the PAYMENTS_DB_MAINNET database IDs remained unchanged.`;

  return { wrangler, evidence, acceptance, runId: run.runId };
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
    reportPath: values.get("report"),
    workflowRunUrl: values.get("workflow-run-url"),
    expectedGitSha: values.get("expected-git-sha") ?? currentGitSha(),
    wranglerPath:
      values.get("wrangler") ?? resolve(process.cwd(), "wrangler.jsonc"),
    evidencePath:
      values.get("evidence") ??
      resolve(process.cwd(), "config/mainnet-release-evidence.json"),
    acceptancePath:
      values.get("acceptance") ??
      resolve(process.cwd(), "config/mainnet-acceptance.json"),
  };
}

export async function importMainnetD1ForwardReport(options) {
  if (!options.reportPath) throw new Error("--report is required.");
  if (!options.workflowRunUrl) {
    throw new Error("--workflow-run-url is required.");
  }
  const [reportSource, wranglerSource, evidenceSource, acceptanceSource] =
    await Promise.all([
      readFile(options.reportPath, "utf8"),
      readFile(options.wranglerPath, "utf8"),
      readFile(options.evidencePath, "utf8"),
      readFile(options.acceptancePath, "utf8"),
    ]);

  const result = applyForwardProvisioningReport({
    report: JSON.parse(reportSource),
    expectedGitSha: options.expectedGitSha,
    workflowRunUrl: options.workflowRunUrl,
    wrangler: parseJsonc(wranglerSource),
    evidence: JSON.parse(evidenceSource),
    acceptance: JSON.parse(acceptanceSource),
  });
  await Promise.all([
    writeFile(options.evidencePath, `${JSON.stringify(result.evidence, null, 2)}\n`),
    writeFile(
      options.acceptancePath,
      `${JSON.stringify(result.acceptance, null, 2)}\n`,
    ),
  ]);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  importMainnetD1ForwardReport(parseArguments(process.argv.slice(2)))
    .then(() => console.log("Imported verified Mainnet D1 forward evidence."))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
