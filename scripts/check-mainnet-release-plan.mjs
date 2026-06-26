import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

const evidenceIds = [
  "production-d1-provisioning",
  "production-provider-attestation",
  "production-release-configuration",
  "assigned-mainnet-source-tag",
  "live-mainnet-xrp-acceptance",
  "live-mainnet-rlusd-acceptance",
  "operational-stop-drill",
];

const foundationIds = [
  "production-d1-provisioning",
  "assigned-mainnet-source-tag",
  "operational-stop-drill",
];

const remainingOrder = [
  "production-provider-attestation",
  "production-release-configuration",
  "live-mainnet-xrp-acceptance",
  "live-mainnet-rlusd-acceptance",
];

const stageOrder = [
  "foundations",
  "provider-attestation",
  "halted-deployment-review",
  "live-xrp-acceptance",
  "live-rlusd-acceptance",
  "final-release-audit",
];

const evidenceToStage = {
  "production-provider-attestation": "provider-attestation",
  "production-release-configuration": "halted-deployment-review",
  "live-mainnet-xrp-acceptance": "live-xrp-acceptance",
  "live-mainnet-rlusd-acceptance": "live-rlusd-acceptance",
};

const evidenceToFinding = {
  "production-provider-attestation": "production-provider-not-attested",
  "production-release-configuration": "production-runtime-not-approved",
  "live-mainnet-xrp-acceptance": "live-xrp-acceptance-not-recorded",
  "live-mainnet-rlusd-acceptance": "live-rlusd-acceptance-not-recorded",
};

const stageSchema = z
  .object({
    id: z.enum(stageOrder),
    position: z.number().int().min(1).max(stageOrder.length),
    status: z.enum(["complete", "blocked", "pending"]),
    requires: z.array(z.enum(evidenceIds)).min(1),
  })
  .strict();

const planSchema = z
  .object({
    schema_version: z.literal(1),
    network: z.literal("mainnet"),
    state: z.literal("blocked"),
    review_status: z.literal("prepared"),
    release_decision: z.literal("blocked"),
    current_stage: z.enum(stageOrder),
    accepted_foundations: z.array(z.enum(evidenceIds)),
    remaining_evidence: z.array(z.enum(evidenceIds)),
    stages: z.array(stageSchema).length(stageOrder.length),
    staged_target: z
      .object({
        committed: z.literal(false),
        public_url_required: z.literal(true),
        app_network: z.literal("mainnet"),
        public_network: z.literal("mainnet"),
        database_binding: z.literal("PAYMENTS_DB_MAINNET"),
        source_tag: z.number().int().min(0).max(4_294_967_295),
        initial_release_mode: z.literal("internal"),
        initial_operations_mode: z.literal("halted"),
      })
      .strict(),
    safe_reset: z
      .object({
        allow_mainnet_build: z.literal(false),
        allow_mainnet_runtime: z.literal(false),
        gate_approved: z.literal(false),
        source_tag_approved: z.literal(false),
        release_mode: z.literal("disabled"),
        operations_mode: z.literal("halted"),
      })
      .strict(),
  })
  .strict();

function parseJsonc(source) {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(
    /(^|[^:])\/\/.*$/gm,
    "$1",
  );
  return JSON.parse(withoutLineComments);
}

function uniqueMap(items, context) {
  const map = new Map();
  for (const item of items) {
    if (map.has(item.id)) {
      throw new Error(`${context} contains duplicate id ${item.id}.`);
    }
    map.set(item.id, item);
  }
  return map;
}

export function deriveMainnetReleaseStage(records) {
  const byId = uniqueMap(records, "Mainnet release evidence");
  for (const id of evidenceIds) {
    if (!byId.has(id)) {
      throw new Error(`Mainnet release evidence is missing ${id}.`);
    }
  }
  for (const id of foundationIds) {
    if (byId.get(id).status !== "accepted") return "foundations";
  }
  for (const id of remainingOrder) {
    if (byId.get(id).status !== "accepted") return evidenceToStage[id];
  }
  return "final-release-audit";
}

export function assertMainnetReleasePlan({
  rawPlan,
  evidence,
  acceptance,
  gate,
  wranglerSource,
  sourceTag,
}) {
  const plan = planSchema.parse(rawPlan);
  const evidenceById = uniqueMap(evidence.records, "Mainnet release evidence");
  const controlById = uniqueMap(acceptance.controls, "Mainnet acceptance controls");
  const findingById = uniqueMap(
    acceptance.blocking_findings,
    "Mainnet blocking findings",
  );
  const gateById = uniqueMap(gate.checks, "Mainnet gate checks");

  const expectedStage = deriveMainnetReleaseStage(evidence.records);
  if (plan.current_stage !== expectedStage) {
    throw new Error(
      `Mainnet release plan stage is stale: expected ${expectedStage}, received ${plan.current_stage}.`,
    );
  }

  if (JSON.stringify(plan.accepted_foundations) !== JSON.stringify(foundationIds)) {
    throw new Error("Mainnet release plan foundations must use the canonical order.");
  }
  const pendingEvidence = remainingOrder.filter(
    (id) => evidenceById.get(id).status !== "accepted",
  );
  if (JSON.stringify(plan.remaining_evidence) !== JSON.stringify(pendingEvidence)) {
    throw new Error("Mainnet release plan remaining evidence is stale.");
  }

  for (let index = 0; index < plan.stages.length; index += 1) {
    const stage = plan.stages[index];
    if (stage.id !== stageOrder[index] || stage.position !== index + 1) {
      throw new Error("Mainnet release plan stages must use the canonical order.");
    }
  }
  const currentIndex = stageOrder.indexOf(expectedStage);
  for (let index = 0; index < plan.stages.length; index += 1) {
    const expectedStatus =
      index < currentIndex
        ? "complete"
        : index === currentIndex && expectedStage !== "final-release-audit"
          ? "blocked"
          : "pending";
    if (plan.stages[index].status !== expectedStatus) {
      throw new Error(
        `Mainnet release stage ${plan.stages[index].id} must be ${expectedStatus}.`,
      );
    }
  }

  if (acceptance.release_decision !== "blocked" || gate.state !== "blocked") {
    throw new Error("The prepared Mainnet release plan requires blocked release state.");
  }
  const auditCheck = gateById.get("mainnet-acceptance-audit");
  if (!auditCheck || auditCheck.status !== "failed") {
    throw new Error("Blocked release state requires a failed acceptance-audit gate check.");
  }

  const expectedOpenFindings = pendingEvidence.map((id) => evidenceToFinding[id]);
  const actualOpenFindings = acceptance.blocking_findings
    .filter((finding) => finding.status === "open")
    .map((finding) => finding.id);
  if (JSON.stringify(actualOpenFindings) !== JSON.stringify(expectedOpenFindings)) {
    throw new Error("Open Mainnet findings do not match the remaining evidence order.");
  }
  for (const id of pendingEvidence) {
    if (controlById.get(id)?.status !== "pending") {
      throw new Error(`Pending evidence requires a pending control: ${id}.`);
    }
  }
  for (const findingId of expectedOpenFindings) {
    if (!auditCheck.evidence.includes(findingId)) {
      throw new Error(`Acceptance-audit gate evidence is missing ${findingId}.`);
    }
  }

  const wrangler = parseJsonc(wranglerSource);
  const vars = wrangler?.env?.mainnet?.vars;
  if (!vars) throw new Error("Wrangler must define Mainnet variables.");
  const safeDefaults = {
    ALLOW_MAINNET_RUNTIME: "false",
    MAINNET_GATE_APPROVED: "false",
    MAINNET_SOURCE_TAG_APPROVED: "false",
    MAINNET_RELEASE_MODE: "disabled",
    MAINNET_OPERATIONS_MODE: "halted",
    PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
  };
  for (const [name, expected] of Object.entries(safeDefaults)) {
    if (vars[name] !== expected) {
      throw new Error(`Prepared Mainnet release plan requires ${name}=${expected}.`);
    }
  }
  if (vars.ALLOW_MAINNET_BUILD !== undefined && vars.ALLOW_MAINNET_BUILD !== "false") {
    throw new Error("Prepared Mainnet release plan requires ALLOW_MAINNET_BUILD=false or unset.");
  }
  if (
    Number(vars.XRPL_MAINNET_SOURCE_TAG) !== sourceTag.source_tag ||
    plan.staged_target.source_tag !== sourceTag.source_tag
  ) {
    throw new Error("Mainnet release plan Source Tag does not match the assignment.");
  }

  return {
    state: "blocked",
    currentStage: expectedStage,
    acceptedEvidence: evidenceIds.length - pendingEvidence.length,
    pendingEvidence,
    openFindings: expectedOpenFindings,
  };
}

export async function runMainnetReleasePlanCheck({
  planPath = resolve(process.cwd(), "config/mainnet-release-plan.json"),
  evidencePath = resolve(process.cwd(), "config/mainnet-release-evidence.json"),
  acceptancePath = resolve(process.cwd(), "config/mainnet-acceptance.json"),
  gatePath = resolve(process.cwd(), "config/mainnet-gate.json"),
  wranglerPath = resolve(process.cwd(), "wrangler.jsonc"),
  sourceTagPath = resolve(process.cwd(), "config/mainnet-source-tag.json"),
} = {}) {
  const [plan, evidence, acceptance, gate, wranglerSource, sourceTag] =
    await Promise.all([
      readFile(planPath, "utf8").then(JSON.parse),
      readFile(evidencePath, "utf8").then(JSON.parse),
      readFile(acceptancePath, "utf8").then(JSON.parse),
      readFile(gatePath, "utf8").then(JSON.parse),
      readFile(wranglerPath, "utf8"),
      readFile(sourceTagPath, "utf8").then(JSON.parse),
    ]);
  return assertMainnetReleasePlan({
    rawPlan: plan,
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
        `Mainnet release plan verified: stage=${summary.currentStage}, accepted=${summary.acceptedEvidence}/${evidenceIds.length}, open=${summary.openFindings.length}.`,
      );
    })
    .catch((error) => {
      console.error(
        `Mainnet release plan check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    });
}
