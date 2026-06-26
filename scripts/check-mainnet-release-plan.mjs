import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ALL_EVIDENCE = [
  "production-d1-provisioning",
  "production-provider-attestation",
  "production-release-configuration",
  "assigned-mainnet-source-tag",
  "live-mainnet-xrp-acceptance",
  "live-mainnet-rlusd-acceptance",
  "operational-stop-drill",
];

const FOUNDATIONS = [
  "production-d1-provisioning",
  "assigned-mainnet-source-tag",
  "operational-stop-drill",
];

const REMAINING_ORDER = [
  "production-provider-attestation",
  "production-release-configuration",
  "live-mainnet-xrp-acceptance",
  "live-mainnet-rlusd-acceptance",
];

const STAGE_ORDER = [
  "foundations",
  "provider-attestation",
  "halted-deployment-review",
  "live-xrp-acceptance",
  "live-rlusd-acceptance",
  "final-release-audit",
];

const STAGE_BY_EVIDENCE = {
  "production-provider-attestation": "provider-attestation",
  "production-release-configuration": "halted-deployment-review",
  "live-mainnet-xrp-acceptance": "live-xrp-acceptance",
  "live-mainnet-rlusd-acceptance": "live-rlusd-acceptance",
};

const FINDING_BY_EVIDENCE = {
  "production-provider-attestation": "production-provider-not-attested",
  "production-release-configuration": "production-runtime-not-approved",
  "live-mainnet-xrp-acceptance": "live-xrp-acceptance-not-recorded",
  "live-mainnet-rlusd-acceptance": "live-rlusd-acceptance-not-recorded",
};

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

function indexById(items, context) {
  const result = new Map();
  for (const item of items) {
    if (!item || typeof item.id !== "string") {
      throw new Error(`${context} contains an invalid record.`);
    }
    if (result.has(item.id)) {
      throw new Error(`${context} contains duplicate id ${item.id}.`);
    }
    result.set(item.id, item);
  }
  return result;
}

function assertExactArray(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message);
  }
}

export function deriveMainnetReleaseStage(records) {
  const byId = indexById(records, "Mainnet release evidence");
  for (const id of ALL_EVIDENCE) {
    if (!byId.has(id)) {
      throw new Error(`Mainnet release evidence is missing ${id}.`);
    }
  }
  for (const id of FOUNDATIONS) {
    if (byId.get(id).status !== "accepted") return "foundations";
  }
  for (const id of REMAINING_ORDER) {
    if (byId.get(id).status !== "accepted") return STAGE_BY_EVIDENCE[id];
  }
  return "final-release-audit";
}

export function assertMainnetReleasePlan({
  plan,
  evidence,
  acceptance,
  gate,
  wranglerSource,
  sourceTag,
}) {
  if (
    plan.schema_version !== 1 ||
    plan.network !== "mainnet" ||
    plan.state !== "blocked" ||
    plan.review_status !== "prepared" ||
    plan.release_decision !== "blocked"
  ) {
    throw new Error("Mainnet release plan header is invalid.");
  }

  const evidenceById = indexById(
    evidence.records,
    "Mainnet release evidence",
  );
  const controls = indexById(
    acceptance.controls,
    "Mainnet acceptance controls",
  );
  indexById(acceptance.blocking_findings, "Mainnet blocking findings");
  const gateChecks = indexById(gate.checks, "Mainnet gate checks");

  const currentStage = deriveMainnetReleaseStage(evidence.records);
  if (plan.current_stage !== currentStage) {
    throw new Error(
      `Mainnet release plan stage is stale: expected ${currentStage}.`,
    );
  }

  assertExactArray(
    plan.accepted_foundations,
    FOUNDATIONS,
    "Mainnet release foundations are stale.",
  );
  const pendingEvidence = REMAINING_ORDER.filter(
    (id) => evidenceById.get(id).status !== "accepted",
  );
  assertExactArray(
    plan.remaining_evidence,
    pendingEvidence,
    "Mainnet release remaining evidence is stale.",
  );

  if (!Array.isArray(plan.stages) || plan.stages.length !== STAGE_ORDER.length) {
    throw new Error("Mainnet release stages are incomplete.");
  }
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  plan.stages.forEach((stage, index) => {
    if (stage.id !== STAGE_ORDER[index] || stage.position !== index + 1) {
      throw new Error("Mainnet release stages are out of order.");
    }
    const expectedStatus =
      index < currentIndex
        ? "complete"
        : index === currentIndex && currentStage !== "final-release-audit"
          ? "blocked"
          : "pending";
    if (stage.status !== expectedStatus) {
      throw new Error(`Mainnet release stage ${stage.id} must be ${expectedStatus}.`);
    }
  });

  if (acceptance.release_decision !== "blocked" || gate.state !== "blocked") {
    throw new Error("Prepared release plan requires blocked release state.");
  }
  const auditCheck = gateChecks.get("mainnet-acceptance-audit");
  if (!auditCheck || auditCheck.status !== "failed") {
    throw new Error("Blocked release state requires a failed acceptance audit.");
  }

  const expectedFindings = pendingEvidence.map(
    (id) => FINDING_BY_EVIDENCE[id],
  );
  const actualFindings = acceptance.blocking_findings
    .filter((finding) => finding.status === "open")
    .map((finding) => finding.id);
  assertExactArray(
    [...actualFindings].sort(),
    [...expectedFindings].sort(),
    "Open Mainnet findings do not match remaining evidence.",
  );
  for (const id of pendingEvidence) {
    if (controls.get(id)?.status !== "pending") {
      throw new Error(`Pending evidence requires a pending control: ${id}.`);
    }
  }
  for (const id of expectedFindings) {
    if (!auditCheck.evidence.includes(id)) {
      throw new Error(`Acceptance gate evidence is missing ${id}.`);
    }
  }

  const wrangler = parseJsonc(wranglerSource);
  const vars = wrangler?.env?.mainnet?.vars;
  if (!vars) throw new Error("Wrangler Mainnet variables are missing.");
  const closedValues = {
    ALLOW_MAINNET_RUNTIME: "false",
    MAINNET_GATE_APPROVED: "false",
    MAINNET_SOURCE_TAG_APPROVED: "false",
    MAINNET_RELEASE_MODE: "disabled",
    MAINNET_OPERATIONS_MODE: "halted",
    PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
  };
  for (const [name, value] of Object.entries(closedValues)) {
    if (vars[name] !== value) {
      throw new Error(`Prepared release plan requires ${name}=${value}.`);
    }
  }
  if (vars.ALLOW_MAINNET_BUILD && vars.ALLOW_MAINNET_BUILD !== "false") {
    throw new Error("Prepared release plan requires Mainnet build access closed.");
  }
  if (
    Number(vars.XRPL_MAINNET_SOURCE_TAG) !== sourceTag.source_tag ||
    plan.staged_target?.source_tag !== sourceTag.source_tag
  ) {
    throw new Error("Mainnet release plan Source Tag is inconsistent.");
  }
  if (
    plan.staged_target?.committed !== false ||
    plan.staged_target?.public_url_required !== true ||
    plan.staged_target?.initial_release_mode !== "internal" ||
    plan.staged_target?.initial_operations_mode !== "halted"
  ) {
    throw new Error("Mainnet staged target is unsafe.");
  }
  const reset = plan.safe_reset;
  if (
    reset?.allow_mainnet_build !== false ||
    reset?.allow_mainnet_runtime !== false ||
    reset?.gate_approved !== false ||
    reset?.source_tag_approved !== false ||
    reset?.release_mode !== "disabled" ||
    reset?.operations_mode !== "halted"
  ) {
    throw new Error("Mainnet safe reset is incomplete.");
  }

  return {
    state: "blocked",
    currentStage,
    acceptedEvidence: ALL_EVIDENCE.length - pendingEvidence.length,
    pendingEvidence,
    openFindings: expectedFindings,
  };
}

export async function runMainnetReleasePlanCheck(options = {}) {
  const root = process.cwd();
  const paths = {
    plan: options.planPath ?? resolve(root, "config/mainnet-release-plan.json"),
    evidence:
      options.evidencePath ?? resolve(root, "config/mainnet-release-evidence.json"),
    acceptance:
      options.acceptancePath ?? resolve(root, "config/mainnet-acceptance.json"),
    gate: options.gatePath ?? resolve(root, "config/mainnet-gate.json"),
    wrangler: options.wranglerPath ?? resolve(root, "wrangler.jsonc"),
    sourceTag:
      options.sourceTagPath ?? resolve(root, "config/mainnet-source-tag.json"),
  };
  const [plan, evidence, acceptance, gate, wranglerSource, sourceTag] =
    await Promise.all([
      readFile(paths.plan, "utf8").then((value) => JSON.parse(value)),
      readFile(paths.evidence, "utf8").then((value) => JSON.parse(value)),
      readFile(paths.acceptance, "utf8").then((value) => JSON.parse(value)),
      readFile(paths.gate, "utf8").then((value) => JSON.parse(value)),
      readFile(paths.wrangler, "utf8"),
      readFile(paths.sourceTag, "utf8").then((value) => JSON.parse(value)),
    ]);
  return assertMainnetReleasePlan({
    plan,
    evidence,
    acceptance,
    gate,
    wranglerSource,
    sourceTag,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMainnetReleasePlanCheck()
    .then((summary) => {
      console.log(
        `Mainnet release plan verified: stage=${summary.currentStage}, accepted=${summary.acceptedEvidence}/${ALL_EVIDENCE.length}, open=${summary.openFindings.length}.`,
      );
    })
    .catch((error) => {
      console.error(
        `Mainnet release plan check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    });
}
