import { z } from "zod";

const ORIGIN = "https://xgp.badjoke-lab.com";
const ASSET_ID = "xrpl:mainnet:xrp";
const TRANSACTION_HASH = /^[A-F0-9]{64}$/;
const PROOF_DIGEST = /^[A-F0-9]{64}$/;
const FORBIDDEN_KEYS = new Set([
  "seed",
  "family_seed",
  "mnemonic",
  "private_key",
  "signing_key",
  "signed_transaction",
  "signed_blob",
  "capability_token",
  "payment_token",
  "admin_token",
  "public_token",
  "payload_id",
  "payload_uuid",
  "deep_link",
  "qr_png",
  "qr_matrix",
  "websocket_status",
  "xaman_api_key",
  "xaman_api_secret",
  "cloudflare_api_token",
  "mainnet_acceptance_token",
]);

const evidencePatchSchema = z
  .object({
    id: z.literal("live-mainnet-xrp-acceptance"),
    status: z.literal("accepted"),
    recorded_at: z.string().datetime({ offset: false }),
    transaction_hash: z.string().regex(TRANSACTION_HASH),
    ledger_index: z.number().int().positive(),
    validated: z.literal(true),
    transaction_result: z.literal("tesSUCCESS"),
    amount_drops: z.string().regex(/^[1-9]\d*$/),
    receipt_id: z.string().min(1),
    proof_digest: z.string().regex(PROOF_DIGEST),
    duplicate_rejected: z.literal(true),
    replay_rejected: z.literal(true),
  })
  .strict();

const reportSchema = z
  .object({
    schema_version: z.literal(1),
    network: z.literal("mainnet"),
    asset_id: z.literal(ASSET_ID),
    generated_at: z.string().datetime({ offset: false }),
    git_sha: z.string().regex(/^[0-9a-f]{40}$/),
    workflow_run_url: z.string().url(),
    state: z.literal("verified"),
    public_url: z.literal(ORIGIN),
    transaction_hash: z.string().regex(TRANSACTION_HASH),
    ledger_index: z.number().int().positive(),
    validated: z.literal(true),
    transaction_result: z.literal("tesSUCCESS"),
    amount_drops: z.string().regex(/^[1-9]\d*$/),
    receipt_id: z.string().min(1),
    proof_digest: z.string().regex(PROOF_DIGEST),
    duplicate_rejected: z.literal(true),
    replay_rejected: z.literal(true),
    operations_restored_halted: z.literal(true),
    sensitive_values_excluded: z.literal(true),
    evidence_patch: evidencePatchSchema,
  })
  .strict();

function assertNoSensitiveKeys(value) {
  if (Array.isArray(value)) {
    value.forEach(assertNoSensitiveKeys);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error(`Mainnet XRP acceptance report contains forbidden field: ${key}.`);
    }
    assertNoSensitiveKeys(nested);
  }
}

function findOne(items, id, context) {
  const matches = items.filter((item) => item.id === id);
  if (matches.length !== 1) {
    throw new Error(`${context} must contain exactly one ${id}.`);
  }
  return matches[0];
}

export function validateMainnetXrpAcceptanceReport(rawReport, expectedGitSha) {
  assertNoSensitiveKeys(rawReport);
  const report = reportSchema.parse(rawReport);
  const patch = report.evidence_patch;
  const amount = BigInt(report.amount_drops);

  if (report.git_sha !== expectedGitSha) {
    throw new Error("The Mainnet XRP acceptance report commit does not match.");
  }
  if (!report.workflow_run_url.startsWith("https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/")) {
    throw new Error("The Mainnet XRP acceptance workflow reference is invalid.");
  }
  if (amount < 1n || amount > 1000n) {
    throw new Error("The Mainnet XRP acceptance amount is outside the approved range.");
  }
  if (
    patch.recorded_at !== report.generated_at ||
    patch.transaction_hash !== report.transaction_hash ||
    patch.ledger_index !== report.ledger_index ||
    patch.amount_drops !== report.amount_drops ||
    patch.receipt_id !== report.receipt_id ||
    patch.proof_digest !== report.proof_digest
  ) {
    throw new Error("The Mainnet XRP evidence patch does not match the report.");
  }
  if (report.receipt_id !== `mainnet:${report.transaction_hash}`) {
    throw new Error("The Mainnet XRP receipt identity does not match the transaction.");
  }
  return report;
}

function updateReleasePlan(plan, evidence) {
  const xrp = findOne(evidence.records, "live-mainnet-xrp-acceptance", "Mainnet release evidence");
  const rlusd = findOne(evidence.records, "live-mainnet-rlusd-acceptance", "Mainnet release evidence");
  if (xrp.status !== "accepted" || rlusd.status !== "pending") {
    throw new Error("Mainnet evidence cannot advance to RLUSD acceptance.");
  }
  plan.current_stage = "live-rlusd-acceptance";
  plan.remaining_evidence = ["live-mainnet-rlusd-acceptance"];
  const statuses = {
    foundations: "complete",
    "provider-attestation": "complete",
    "halted-deployment-review": "complete",
    "live-xrp-acceptance": "complete",
    "live-rlusd-acceptance": "blocked",
    "final-release-audit": "pending",
  };
  plan.stages.forEach((stage) => {
    stage.status = statuses[stage.id];
  });
}

function assertHaltedInternalTarget(wrangler, productionTarget) {
  const vars = wrangler?.env?.mainnet?.vars;
  if (
    vars?.APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_URL !== ORIGIN ||
    vars?.ALLOW_MAINNET_RUNTIME !== "true" ||
    vars?.MAINNET_GATE_APPROVED !== "true" ||
    vars?.MAINNET_SOURCE_TAG_APPROVED !== "true" ||
    vars?.MAINNET_RELEASE_MODE !== "internal" ||
    vars?.MAINNET_OPERATIONS_MODE !== "halted" ||
    vars?.PAYMENTS_DATABASE_BINDING !== "PAYMENTS_DB_MAINNET" ||
    productionTarget?.network !== "mainnet" ||
    productionTarget?.public_origin !== ORIGIN ||
    productionTarget?.deployment !== "deployed" ||
    productionTarget?.release_mode !== "internal" ||
    productionTarget?.operations_mode !== "halted"
  ) {
    throw new Error("Mainnet XRP evidence import requires the restored halted target.");
  }
}

export function applyMainnetXrpAcceptanceReport({
  report: rawReport,
  expectedGitSha,
  evidence: rawEvidence,
  acceptance: rawAcceptance,
  releasePlan: rawReleasePlan,
  wrangler: rawWrangler,
  productionTarget: rawProductionTarget,
}) {
  const report = validateMainnetXrpAcceptanceReport(rawReport, expectedGitSha);
  const patch = report.evidence_patch;
  const evidence = structuredClone(rawEvidence);
  const acceptance = structuredClone(rawAcceptance);
  const releasePlan = structuredClone(rawReleasePlan);
  const wrangler = structuredClone(rawWrangler);
  const productionTarget = structuredClone(rawProductionTarget);

  if (
    acceptance.release_decision !== "blocked" ||
    releasePlan.release_decision !== "blocked" ||
    releasePlan.current_stage !== "live-xrp-acceptance"
  ) {
    throw new Error("Mainnet XRP import requires the blocked XRP acceptance stage.");
  }
  assertHaltedInternalTarget(wrangler, productionTarget);

  const record = findOne(evidence.records, "live-mainnet-xrp-acceptance", "Mainnet release evidence");
  const control = findOne(acceptance.controls, "live-mainnet-xrp-acceptance", "Mainnet acceptance controls");
  const finding = findOne(acceptance.blocking_findings, "live-xrp-acceptance-not-recorded", "Mainnet blocking findings");
  const pending = record.status === "pending" && control.status === "pending" && finding.status === "open";
  const replay = record.status === "accepted" && control.status === "passed" && finding.status === "resolved";
  if (!pending && !replay) {
    throw new Error("Mainnet XRP evidence, control, and finding are inconsistent.");
  }
  if (replay) {
    for (const [key, value] of Object.entries(patch)) {
      if (record[key] !== value) {
        throw new Error("Existing Mainnet XRP evidence differs from the report.");
      }
    }
  }

  Object.assign(record, patch);
  evidence.updated_at = report.generated_at.slice(0, 10);
  const summary = `GitHub Actions run ${report.workflow_run_url} verified controlled Mainnet XRP transaction ${report.transaction_hash} in validated ledger ${report.ledger_index}, recorded receipt ${report.receipt_id}, rejected duplicate and cross-slot replay, and restored halted operations from commit ${report.git_sha}`;
  control.status = "passed";
  control.evidence = `${summary}.`;
  finding.status = "resolved";
  finding.evidence = `${summary}; the release remains internal and blocked pending live RLUSD acceptance.`;
  updateReleasePlan(releasePlan, evidence);

  return { evidence, acceptance, releasePlan, wrangler, productionTarget };
}
