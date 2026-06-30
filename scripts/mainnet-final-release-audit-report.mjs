import { z } from "zod";

const ORIGIN = "https://xgp.badjoke-lab.com";
const PR_URL = "https://github.com/badjoke-lab/xrpl-group-pay/pull/117";
const CI_RUN_URL =
  "https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/28450369791";
const ISSUE_URL = "https://github.com/badjoke-lab/xrpl-group-pay/issues/104";
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

const countSchema = z
  .object({
    passed: z.number().int().nonnegative(),
    total: z.number().int().positive(),
  })
  .strict();

const evidenceCountSchema = z
  .object({
    accepted: z.number().int().nonnegative(),
    total: z.number().int().positive(),
  })
  .strict();

const reportSchema = z
  .object({
    schema_version: z.literal(1),
    network: z.literal("mainnet"),
    state: z.literal("approved"),
    audited_at: z.string().datetime({ offset: false }),
    git_sha: z.string().regex(/^[0-9a-f]{40}$/),
    pull_request_url: z.literal(PR_URL),
    ci_run_url: z.literal(CI_RUN_URL),
    public_url: z.literal(ORIGIN),
    release_evidence: evidenceCountSchema,
    acceptance_controls: countSchema,
    gate_checks: countSchema,
    open_findings: z.literal(0),
    release_decision: z.literal("approved"),
    gate_state: z.literal("ready"),
    production_target: z
      .object({
        deployment: z.literal("deployed"),
        release_mode: z.literal("internal"),
        operations_mode: z.literal("halted"),
      })
      .strict(),
    checks: z
      .object({
        all_release_evidence_accepted: z.literal(true),
        all_acceptance_controls_passed: z.literal(true),
        all_gate_checks_passed: z.literal(true),
        incident_remediation_reviewed: z.literal(true),
        xrp_evidence_reviewed: z.literal(true),
        rlusd_evidence_reviewed: z.literal(true),
        production_d1_audit_reviewed: z.literal(true),
        halted_target_reviewed: z.literal(true),
        ci_reviewed: z.literal(true),
      })
      .strict(),
    incident: z
      .object({
        issue_url: z.literal(ISSUE_URL),
        remediation_prs: z.tuple([z.literal(105), z.literal(108), z.literal(116)]),
        acceptance_evidence_pr: z.literal(117),
      })
      .strict(),
    new_transaction_performed: z.literal(false),
    new_handoff_created: z.literal(false),
    production_deployment_performed: z.literal(false),
    public_operating_configuration_applied: z.literal(false),
    sensitive_values_excluded: z.literal(true),
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
      throw new Error(`Final release audit contains forbidden field: ${key}.`);
    }
    assertNoSensitiveKeys(nested);
  }
}

export function validateMainnetFinalReleaseAuditReport(rawReport, expectedGitSha) {
  assertNoSensitiveKeys(rawReport);
  const report = reportSchema.parse(rawReport);
  if (report.git_sha !== expectedGitSha) {
    throw new Error("The final release audit commit does not match.");
  }
  if (
    report.release_evidence.accepted !== report.release_evidence.total ||
    report.release_evidence.total !== 7 ||
    report.acceptance_controls.passed !== report.acceptance_controls.total ||
    report.acceptance_controls.total !== 14 ||
    report.gate_checks.passed !== report.gate_checks.total ||
    report.gate_checks.total !== 10
  ) {
    throw new Error("The final release audit counts are incomplete.");
  }
  return report;
}
