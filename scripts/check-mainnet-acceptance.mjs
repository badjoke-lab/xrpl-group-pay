import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import { readMainnetGate } from "./check-mainnet-gate.mjs";

const controlSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    status: z.enum(["passed", "pending", "failed"]),
    evidence: z.string().min(1),
  })
  .strict();

const findingSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    status: z.enum(["open", "resolved"]),
    evidence: z.string().min(1),
  })
  .strict();

const acceptanceSchema = z
  .object({
    schema_version: z.literal(1),
    audit_status: z.literal("completed"),
    release_decision: z.enum(["blocked", "approved"]),
    audited_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    controls: z.array(controlSchema).min(1),
    blocking_findings: z.array(findingSchema),
  })
  .strict();

export const REQUIRED_ACCEPTANCE_CONTROL_IDS = [
  "repository-gate-controls",
  "build-and-runtime-boundaries",
  "mainnet-data-isolation",
  "mainnet-payment-pipeline",
  "mainnet-operational-controls",
  "regression-and-build-suite",
  "production-d1-provisioning",
  "production-release-configuration",
  "production-provider-attestation",
  "assigned-mainnet-source-tag",
  "live-mainnet-xrp-acceptance",
  "live-mainnet-rlusd-acceptance",
  "operational-stop-drill",
];

export const REQUIRED_ACCEPTANCE_FINDING_IDS = [
  "production-d1-not-provisioned",
  "production-runtime-not-approved",
  "production-provider-not-attested",
  "mainnet-source-tag-not-assigned",
  "live-xrp-acceptance-not-recorded",
  "live-rlusd-acceptance-not-recorded",
  "operational-stop-drill-not-recorded",
];

function assertUnique(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`${label} IDs must be unique: ${item.id}`);
    }
    seen.add(item.id);
  }
}

function assertRequiredIds(items, requiredIds, label) {
  const ids = new Set(items.map((item) => item.id));
  for (const id of requiredIds) {
    if (!ids.has(id)) {
      throw new Error(`${label} is missing: ${id}`);
    }
  }

  const unknown = items.filter((item) => !requiredIds.includes(item.id));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown ${label.toLowerCase()}s: ${unknown
        .map((item) => item.id)
        .join(", ")}`,
    );
  }
}

function parseJsonc(source) {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(
    /(^|[^:])\/\/.*$/gm,
    "$1",
  );
  return JSON.parse(withoutLineComments);
}

export async function readMainnetAcceptance(
  path = resolve(process.cwd(), "config/mainnet-acceptance.json"),
) {
  const raw = await readFile(path, "utf8");
  return acceptanceSchema.parse(JSON.parse(raw));
}

export function assertMainnetAcceptanceDocument(acceptance) {
  assertUnique(acceptance.controls, "Mainnet acceptance control");
  assertUnique(acceptance.blocking_findings, "Mainnet acceptance finding");
  assertRequiredIds(
    acceptance.controls,
    REQUIRED_ACCEPTANCE_CONTROL_IDS,
    "Mainnet acceptance control",
  );
  assertRequiredIds(
    acceptance.blocking_findings,
    REQUIRED_ACCEPTANCE_FINDING_IDS,
    "Mainnet acceptance finding",
  );

  const incomplete = acceptance.controls.filter(
    (control) => control.status !== "passed",
  );
  const openFindings = acceptance.blocking_findings.filter(
    (finding) => finding.status === "open",
  );

  if (acceptance.release_decision === "approved") {
    if (incomplete.length > 0) {
      throw new Error(
        `Approved Mainnet acceptance requires every control to pass: ${incomplete
          .map((control) => `${control.id}:${control.status}`)
          .join(", ")}`,
      );
    }
    if (openFindings.length > 0) {
      throw new Error(
        `Approved Mainnet acceptance cannot contain open findings: ${openFindings
          .map((finding) => finding.id)
          .join(", ")}`,
      );
    }
    return;
  }

  if (openFindings.length === 0) {
    throw new Error(
      "A blocked Mainnet release decision must record at least one open finding.",
    );
  }
}

export function assertMainnetAcceptanceMatchesGate(acceptance, gate) {
  const acceptanceCheck = gate.checks.find(
    (check) => check.id === "mainnet-acceptance-audit",
  );
  if (!acceptanceCheck) {
    throw new Error("Mainnet gate is missing mainnet-acceptance-audit.");
  }

  if (acceptance.release_decision === "approved") {
    const incompleteGateChecks = gate.checks.filter(
      (check) => check.status !== "passed",
    );
    if (
      gate.state !== "ready" ||
      acceptanceCheck.status !== "passed" ||
      incompleteGateChecks.length > 0
    ) {
      throw new Error(
        "Approved Mainnet acceptance requires a ready gate with every check passed.",
      );
    }
    return;
  }

  if (gate.state !== "blocked") {
    throw new Error("A blocked Mainnet acceptance decision requires a blocked gate.");
  }
  if (acceptanceCheck.status === "passed") {
    throw new Error(
      "The Mainnet acceptance gate check cannot pass while release is blocked.",
    );
  }
}

export function assertBlockedReleaseEvidence(acceptance, wranglerSource) {
  if (acceptance.release_decision !== "blocked") return;

  const wrangler = parseJsonc(wranglerSource);
  const mainnet = wrangler?.env?.mainnet;
  const variables = mainnet?.vars;
  if (!mainnet || !variables) {
    throw new Error("Wrangler must define an explicit Mainnet environment.");
  }

  const requiredSafeDefaults = {
    ALLOW_MAINNET_RUNTIME: "false",
    MAINNET_GATE_APPROVED: "false",
    MAINNET_SOURCE_TAG_APPROVED: "false",
    MAINNET_RELEASE_MODE: "disabled",
    MAINNET_OPERATIONS_MODE: "halted",
  };
  for (const [name, expected] of Object.entries(requiredSafeDefaults)) {
    if (variables[name] !== expected) {
      throw new Error(
        `Blocked Mainnet acceptance requires ${name}=${expected} in the committed Mainnet environment.`,
      );
    }
  }

  const mainnetDatabase = mainnet.d1_databases?.find(
    (database) => database.binding === "PAYMENTS_DB_MAINNET",
  );
  if (!mainnetDatabase) {
    throw new Error("Wrangler must define the PAYMENTS_DB_MAINNET binding.");
  }

  const placeholder = "00000000-0000-0000-0000-000000000000";
  const d1Control = acceptance.controls.find(
    (control) => control.id === "production-d1-provisioning",
  );
  const d1Finding = acceptance.blocking_findings.find(
    (finding) => finding.id === "production-d1-not-provisioned",
  );
  const d1StillBlocked =
    d1Control.status !== "passed" || d1Finding.status === "open";

  if (d1StillBlocked) {
    if (
      mainnetDatabase.database_id !== placeholder ||
      mainnetDatabase.preview_database_id !== placeholder
    ) {
      throw new Error(
        "The production D1 blocker no longer matches the committed Wrangler evidence.",
      );
    }
    return;
  }

  if (
    mainnetDatabase.database_id === placeholder ||
    mainnetDatabase.preview_database_id === placeholder
  ) {
    throw new Error(
      "Resolved production D1 acceptance requires non-placeholder Mainnet identifiers.",
    );
  }
}

export async function runMainnetAcceptanceAudit({
  acceptancePath = resolve(process.cwd(), "config/mainnet-acceptance.json"),
  gatePath = resolve(process.cwd(), "config/mainnet-gate.json"),
  wranglerPath = resolve(process.cwd(), "wrangler.jsonc"),
  requireReady = false,
} = {}) {
  const acceptance = await readMainnetAcceptance(acceptancePath);
  const gate = await readMainnetGate(gatePath);
  const wranglerSource = await readFile(wranglerPath, "utf8");

  assertMainnetAcceptanceDocument(acceptance);
  assertMainnetAcceptanceMatchesGate(acceptance, gate);
  assertBlockedReleaseEvidence(acceptance, wranglerSource);

  if (requireReady && acceptance.release_decision !== "approved") {
    const openFindings = acceptance.blocking_findings
      .filter((finding) => finding.status === "open")
      .map((finding) => finding.id)
      .join(", ");
    throw new Error(
      `Mainnet acceptance is blocked${openFindings ? ` (${openFindings})` : ""}.`,
    );
  }

  return acceptance;
}

async function main() {
  const acceptance = await runMainnetAcceptanceAudit({
    requireReady: process.argv.includes("--require-ready"),
  });
  const passed = acceptance.controls.filter(
    (control) => control.status === "passed",
  ).length;
  const open = acceptance.blocking_findings.filter(
    (finding) => finding.status === "open",
  ).length;

  console.log(
    `Mainnet acceptance audit: decision=${acceptance.release_decision}, controls=${passed}/${acceptance.controls.length}, open_findings=${open}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Mainnet acceptance audit failed: ${message}`);
    process.exit(1);
  });
}
