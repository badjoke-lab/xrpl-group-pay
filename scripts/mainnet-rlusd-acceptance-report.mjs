import { z } from "zod";

const ORIGIN = "https://xgp.badjoke-lab.com";
const ASSET_ID = "xrpl:mainnet:rlusd";
const CURRENCY = "524C555344000000000000000000000000000000";
const ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
const SOURCE_TAG = 2171267705;
const ISSUE_URL =
  "https://github.com/badjoke-lab/xrpl-group-pay/issues/104";
const HASH = /^[A-F0-9]{64}$/;
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
    id: z.literal("live-mainnet-rlusd-acceptance"),
    status: z.literal("accepted"),
    recorded_at: z.string().datetime({ offset: false }),
    transaction_hash: z.string().regex(HASH),
    ledger_index: z.number().int().positive(),
    validated: z.literal(true),
    transaction_result: z.literal("tesSUCCESS"),
    currency: z.literal(CURRENCY),
    issuer: z.literal(ISSUER),
    amount_value: z.literal("0.000001"),
    receipt_id: z.string().regex(/^mainnet:[A-F0-9]{64}$/),
    proof_digest: z.string().regex(HASH),
    recipient_readiness_checked: z.literal(true),
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
    workflow_run_url: z.string().url().optional(),
    ceremony_reference: z.string().trim().min(1).max(200).optional(),
    incident_reference: z.literal(ISSUE_URL),
    state: z.literal("verified"),
    public_url: z.literal(ORIGIN),
    transaction_hash: z.string().regex(HASH),
    ledger_index: z.number().int().positive(),
    validated: z.literal(true),
    transaction_result: z.literal("tesSUCCESS"),
    invoice_id: z.string().regex(HASH),
    payer: z.string().min(25).max(40),
    destination: z.string().min(25).max(40),
    destination_tag: z.null(),
    source_tag: z.literal(SOURCE_TAG),
    currency: z.literal(CURRENCY),
    issuer: z.literal(ISSUER),
    amount_units: z.literal("1"),
    amount_scale: z.literal(6),
    amount_value: z.literal("0.000001"),
    receipt_id: z.string().regex(/^mainnet:[A-F0-9]{64}$/),
    proof_digest: z.string().regex(HASH),
    original_receipt_status: z.literal("recorded"),
    retry_receipt_status: z.literal("existing"),
    receipt_identity_preserved: z.literal(true),
    receipt_digest_preserved: z.literal(true),
    receipt_count: z.literal(1),
    recipient_readiness_checked: z.literal(true),
    duplicate_rejected: z.literal(true),
    duplicate_semantics: z.literal("idempotent-existing-receipt"),
    primary_slot_status: z.literal("paid"),
    primary_handoff_count: z.literal(1),
    replay_rejected: z.literal(true),
    replay_slot_status: z.literal("unpaid"),
    replay_handoff_count: z.literal(0),
    replay_receipt_count: z.literal(0),
    bill_status: z.literal("partially_paid"),
    operations_restored_halted: z.literal(true),
    final_release_mode: z.literal("internal"),
    final_operations_mode: z.literal("halted"),
    new_transaction_during_reverification: z.literal(false),
    new_handoff_during_reverification: z.literal(false),
    sensitive_values_excluded: z.literal(true),
    remediation: z
      .object({
        one_shot_handoff_pr: z.literal(105),
        reconciliation_pr: z.literal(108),
        idempotent_reverification_pr: z.literal(116),
      })
      .strict(),
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
      throw new Error(
        `Mainnet RLUSD acceptance report contains forbidden field: ${key}.`,
      );
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

function executionReference(report) {
  const hasWorkflow = report.workflow_run_url !== undefined;
  const hasCeremony = report.ceremony_reference !== undefined;
  if (hasWorkflow === hasCeremony) {
    throw new Error(
      "The Mainnet RLUSD acceptance report requires exactly one workflow or human-operated ceremony reference.",
    );
  }
  if (
    hasWorkflow &&
    !report.workflow_run_url.startsWith(
      "https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/",
    )
  ) {
    throw new Error(
      "The Mainnet RLUSD acceptance workflow reference is invalid.",
    );
  }
  return hasWorkflow
    ? `GitHub Actions run ${report.workflow_run_url}`
    : `Human-operated ceremony ${report.ceremony_reference}`;
}

export function validateMainnetRlusdAcceptanceReport(
  rawReport,
  expectedGitSha,
) {
  assertNoSensitiveKeys(rawReport);
  const report = reportSchema.parse(rawReport);
  const patch = report.evidence_patch;

  if (report.git_sha !== expectedGitSha) {
    throw new Error(
      "The Mainnet RLUSD acceptance report commit does not match.",
    );
  }
  executionReference(report);
  if (Date.parse(patch.recorded_at) > Date.parse(report.generated_at)) {
    throw new Error(
      "The durable receipt cannot be recorded after report generation.",
    );
  }
  if (
    patch.transaction_hash !== report.transaction_hash ||
    patch.ledger_index !== report.ledger_index ||
    patch.currency !== report.currency ||
    patch.issuer !== report.issuer ||
    patch.amount_value !== report.amount_value ||
    patch.receipt_id !== report.receipt_id ||
    patch.proof_digest !== report.proof_digest ||
    patch.recipient_readiness_checked !==
      report.recipient_readiness_checked ||
    patch.duplicate_rejected !== report.duplicate_rejected ||
    patch.replay_rejected !== report.replay_rejected
  ) {
    throw new Error(
      "The Mainnet RLUSD evidence patch does not match the report.",
    );
  }
  if (report.receipt_id !== `mainnet:${report.transaction_hash}`) {
    throw new Error(
      "The Mainnet RLUSD receipt identity does not match the transaction.",
    );
  }
  return report;
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
    throw new Error(
      "Mainnet RLUSD evidence import requires the restored halted target.",
    );
  }
}

function enterFinalAudit(releasePlan) {
  releasePlan.state = "blocked";
  releasePlan.review_status = "prepared";
  releasePlan.release_decision = "blocked";
  releasePlan.current_stage = "final-release-audit";
  releasePlan.remaining_evidence = [];
  releasePlan.stages.forEach((stage) => {
    stage.status =
      stage.id === "final-release-audit" ? "pending" : "complete";
  });
}

export function applyMainnetRlusdAcceptanceReport({
  report: rawReport,
  expectedGitSha,
  evidence: rawEvidence,
  acceptance: rawAcceptance,
  releasePlan: rawReleasePlan,
  gate: rawGate,
  wrangler: rawWrangler,
  productionTarget: rawProductionTarget,
}) {
  const report = validateMainnetRlusdAcceptanceReport(
    rawReport,
    expectedGitSha,
  );
  const patch = report.evidence_patch;
  const evidence = structuredClone(rawEvidence);
  const acceptance = structuredClone(rawAcceptance);
  const releasePlan = structuredClone(rawReleasePlan);
  const gate = structuredClone(rawGate);
  const wrangler = structuredClone(rawWrangler);
  const productionTarget = structuredClone(rawProductionTarget);

  if (
    acceptance.release_decision !== "blocked" ||
    releasePlan.release_decision !== "blocked" ||
    releasePlan.current_stage !== "live-rlusd-acceptance" ||
    gate.state !== "blocked"
  ) {
    throw new Error(
      "Mainnet RLUSD import requires the blocked RLUSD acceptance stage.",
    );
  }
  assertHaltedInternalTarget(wrangler, productionTarget);

  const record = findOne(
    evidence.records,
    "live-mainnet-rlusd-acceptance",
    "Mainnet release evidence",
  );
  const control = findOne(
    acceptance.controls,
    "live-mainnet-rlusd-acceptance",
    "Mainnet acceptance controls",
  );
  const finding = findOne(
    acceptance.blocking_findings,
    "live-rlusd-acceptance-not-recorded",
    "Mainnet blocking findings",
  );
  const finalControl = findOne(
    acceptance.controls,
    "final-release-audit",
    "Mainnet acceptance controls",
  );
  const finalFinding = findOne(
    acceptance.blocking_findings,
    "final-release-audit-not-complete",
    "Mainnet blocking findings",
  );
  const auditCheck = findOne(
    gate.checks,
    "mainnet-acceptance-audit",
    "Mainnet gate checks",
  );

  if (
    record.status !== "pending" ||
    control.status !== "pending" ||
    finding.status !== "open" ||
    finalControl.status !== "pending" ||
    finalFinding.status !== "resolved" ||
    auditCheck.status !== "failed"
  ) {
    throw new Error(
      "Mainnet RLUSD evidence, final audit, and gate state are inconsistent.",
    );
  }

  Object.assign(record, patch);
  evidence.updated_at = report.generated_at.slice(0, 10);

  const summary =
    `${executionReference(report)} verified official Mainnet RLUSD ` +
    `transaction ${report.transaction_hash} in validated ledger ` +
    `${report.ledger_index}, recorded durable receipt ${report.receipt_id}, ` +
    "returned the same receipt idempotently on re-verification, confirmed " +
    "exactly one receipt and one primary handoff, kept the replay-control " +
    "slot unpaid with zero handoffs and receipts, independently matched the " +
    "validated XRPL transaction, audited production D1, and restored " +
    `internal halted operations from commit ${report.git_sha}`;

  control.status = "passed";
  control.evidence = `${summary}.`;
  finding.status = "resolved";
  finding.evidence =
    `${summary}; PRs #105, #108, and #116 address incident #104.`;

  const incompleteEvidenceControls = acceptance.controls.filter(
    (item) =>
      item.id !== "final-release-audit" && item.status !== "passed",
  );
  const unresolvedEvidenceFindings = acceptance.blocking_findings.filter(
    (item) =>
      item.id !== "final-release-audit-not-complete" &&
      item.status !== "resolved",
  );
  if (
    incompleteEvidenceControls.length > 0 ||
    unresolvedEvidenceFindings.length > 0
  ) {
    throw new Error(
      "Mainnet RLUSD import cannot enter final audit with incomplete evidence controls.",
    );
  }

  finalControl.status = "pending";
  finalControl.evidence =
    "All seven release evidence records are accepted. Complete the final " +
    "release audit before approving the public operating configuration.";
  finalFinding.status = "open";
  finalFinding.evidence =
    "Review the complete accepted evidence set, incident remediation, CI, " +
    "the halted production target, and the final ledger and D1 audit before " +
    "setting the Mainnet gate to ready.";

  acceptance.release_decision = "blocked";
  acceptance.audited_at = report.generated_at.slice(0, 10);
  gate.state = "blocked";
  gate.updated_at = report.generated_at.slice(0, 10);
  auditCheck.status = "failed";
  auditCheck.evidence =
    "All seven release evidence records are accepted and the live XRP and " +
    "RLUSD controls passed. The gate remains blocked only by " +
    "final-release-audit-not-complete while the reviewed production Worker " +
    "stays internal and halted.";
  enterFinalAudit(releasePlan);

  return {
    evidence,
    acceptance,
    releasePlan,
    gate,
    wrangler,
    productionTarget,
  };
}
