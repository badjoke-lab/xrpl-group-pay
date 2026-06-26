import { z } from "zod";

const SHA = /^[0-9a-f]{40}$/;
const RUN_URL = /^https:\/\/github\.com\/badjoke-lab\/xrpl-group-pay\/actions\/runs\/(\d+)$/;

const evidencePatchSchema = z
  .object({
    id: z.literal("operational-stop-drill"),
    status: z.literal("accepted"),
    recorded_at: z.string().datetime({ offset: false }),
    environment: z.literal("production-equivalent"),
    verify_only_creation_blocked: z.literal(true),
    verify_only_submitted_payment_settled: z.literal(true),
    verify_only_status_checked: z.literal(true),
    halted_creation_blocked: z.literal(true),
    halted_verification_blocked: z.literal(true),
    halted_status_checked: z.literal(true),
    restore_change_reviewed: z.literal(true),
  })
  .strict();

const reportSchema = z
  .object({
    schema_version: z.literal(1),
    network: z.literal("mainnet"),
    environment: z.literal("production-equivalent"),
    generated_at: z.string().datetime({ offset: false }),
    git_sha: z.string().regex(SHA),
    state: z.literal("verified"),
    workflow_run_url: z.string().regex(RUN_URL),
    committed_mainnet_mode: z.literal("halted"),
    restore_review: z
      .object({
        simulated_mode: z.literal("enabled"),
        committed_mode: z.literal("halted"),
        applied: z.literal(false),
        review_required: z.literal(true),
      })
      .strict(),
    checks: z
      .object({
        verify_only_creation_blocked: z.literal(true),
        verify_only_submitted_payment_settled: z.literal(true),
        verify_only_status_checked: z.literal(true),
        halted_creation_blocked: z.literal(true),
        halted_verification_blocked: z.literal(true),
        halted_status_checked: z.literal(true),
        restore_change_reviewed: z.literal(true),
        external_services_called: z.literal(false),
        production_state_changed: z.literal(false),
      })
      .strict(),
    evidence_patch: evidencePatchSchema,
  })
  .strict();

function findOne(items, id, context) {
  const matches = items.filter((item) => item.id === id);
  if (matches.length !== 1) {
    throw new Error(`${context} must contain exactly one ${id}.`);
  }
  return matches[0];
}

export function validateMainnetOperationalStopDrillReport(
  raw,
  expectedGitSha,
) {
  const report = reportSchema.parse(raw);
  if (report.git_sha !== expectedGitSha) {
    throw new Error("Operational stop drill commit does not match the expected commit.");
  }
  if (report.generated_at !== report.evidence_patch.recorded_at) {
    throw new Error("Operational stop drill evidence timestamp does not match the report.");
  }
  return report;
}

export function applyMainnetOperationalStopDrillReport({
  report: rawReport,
  expectedGitSha,
  evidence: rawEvidence,
  acceptance: rawAcceptance,
}) {
  const report = validateMainnetOperationalStopDrillReport(
    rawReport,
    expectedGitSha,
  );
  const evidence = structuredClone(rawEvidence);
  const acceptance = structuredClone(rawAcceptance);

  if (acceptance.release_decision !== "blocked") {
    throw new Error("Operational stop drill import requires a blocked Mainnet release.");
  }

  const record = findOne(
    evidence.records,
    "operational-stop-drill",
    "Mainnet release evidence",
  );
  const control = findOne(
    acceptance.controls,
    "operational-stop-drill",
    "Mainnet acceptance controls",
  );
  const finding = findOne(
    acceptance.blocking_findings,
    "operational-stop-drill-not-recorded",
    "Mainnet blocking findings",
  );

  const pending =
    record.status === "pending" &&
    control.status === "pending" &&
    finding.status === "open";
  const replay =
    record.status === "accepted" &&
    control.status === "passed" &&
    finding.status === "resolved";

  if (!pending && !replay) {
    throw new Error("Operational stop drill evidence, control, and finding are inconsistent.");
  }

  if (replay) {
    for (const [key, value] of Object.entries(report.evidence_patch)) {
      if (record[key] !== value) {
        throw new Error("Existing operational stop drill evidence differs from the report.");
      }
    }
  }

  Object.assign(record, report.evidence_patch);
  evidence.updated_at = report.generated_at.slice(0, 10);

  const summary = `GitHub Actions run ${report.workflow_run_url} verified production-equivalent verify-only draining, full halt, status reporting, and a reviewed but unapplied restore path from commit ${report.git_sha}`;
  control.status = "passed";
  control.evidence = `${summary}.`;
  finding.status = "resolved";
  finding.evidence = `${summary}; no Cloudflare, Xaman, XRPL, D1, or production configuration change was performed.`;

  return { evidence, acceptance };
}
