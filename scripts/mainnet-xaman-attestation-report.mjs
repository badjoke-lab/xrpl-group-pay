import { z } from "zod";

const SHA = /^[0-9a-f]{40}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const RUN_URL = /^https:\/\/github\.com\/badjoke-lab\/xrpl-group-pay\/actions\/runs\/(\d+)$/;
const FORBIDDEN_KEYS = new Set([
  "api_key",
  "api_secret",
  "xaman_api_key",
  "xaman_api_secret",
  "payload_uuid",
  "qr_png",
  "qr_matrix",
  "websocket_status",
  "deeplink",
  "callback_url",
]);

const evidencePatchSchema = z
  .object({
    id: z.literal("production-provider-attestation"),
    status: z.literal("accepted"),
    recorded_at: z.string().datetime({ offset: false }),
    attestation_reference: z.string().min(8).max(200),
    credentials_configured: z.literal(true),
    forced_mainnet_request_checked: z.literal(true),
    callback_behavior_checked: z.literal(true),
    status_lookup_checked: z.literal(true),
    secrets_committed: z.literal(false),
  })
  .strict();

const reportSchema = z
  .object({
    schema_version: z.literal(1),
    network: z.literal("mainnet"),
    generated_at: z.string().datetime({ offset: false }),
    git_sha: z.string().regex(SHA),
    state: z.literal("verified"),
    workflow_run_url: z.string().regex(RUN_URL),
    api_base_url: z.literal("https://xumm.app/api/v1/platform"),
    application_fingerprint: z.string().regex(DIGEST),
    callback_origin: z
      .string()
      .url()
      .refine((value) => new URL(value).protocol === "https:"),
    callback_path_digest: z.string().regex(DIGEST),
    payload_reference_digest: z.string().regex(DIGEST),
    checks: z
      .object({
        credentials_configured: z.literal(true),
        application_enabled: z.literal(true),
        forced_mainnet_request_checked: z.literal(true),
        callback_behavior_checked: z.literal(true),
        status_lookup_checked: z.literal(true),
        cancellation_checked: z.literal(true),
        sign_in_only: z.literal(true),
        ledger_submission_possible: z.literal(false),
        secrets_committed: z.literal(false),
      })
      .strict(),
    evidence_patch: evidencePatchSchema,
  })
  .strict();

function assertNoSensitiveKeys(value) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoSensitiveKeys(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error(`Attestation report contains forbidden field: ${key}.`);
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

export function validateMainnetXamanAttestationReport(raw, expectedGitSha) {
  assertNoSensitiveKeys(raw);
  const report = reportSchema.parse(raw);
  if (report.git_sha !== expectedGitSha) {
    throw new Error("Attestation report commit does not match the expected commit.");
  }
  if (report.workflow_run_url !== report.evidence_patch.attestation_reference) {
    throw new Error("Attestation reference does not match the workflow run URL.");
  }
  if (report.generated_at !== report.evidence_patch.recorded_at) {
    throw new Error("Attestation evidence timestamp does not match the report.");
  }
  return report;
}

export function applyMainnetXamanAttestationReport({
  report: rawReport,
  expectedGitSha,
  evidence: rawEvidence,
  acceptance: rawAcceptance,
}) {
  const report = validateMainnetXamanAttestationReport(rawReport, expectedGitSha);
  const evidence = structuredClone(rawEvidence);
  const acceptance = structuredClone(rawAcceptance);
  if (acceptance.release_decision !== "blocked") {
    throw new Error("Provider evidence import requires a blocked Mainnet release.");
  }

  const record = findOne(
    evidence.records,
    "production-provider-attestation",
    "Mainnet release evidence",
  );
  const control = findOne(
    acceptance.controls,
    "production-provider-attestation",
    "Mainnet acceptance controls",
  );
  const finding = findOne(
    acceptance.blocking_findings,
    "production-provider-not-attested",
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
    throw new Error("Provider evidence, control, and finding are inconsistent.");
  }

  if (replay) {
    for (const [key, value] of Object.entries(report.evidence_patch)) {
      if (record[key] !== value) {
        throw new Error("Existing provider evidence differs from the report.");
      }
    }
  }

  Object.assign(record, report.evidence_patch);
  evidence.updated_at = report.generated_at.slice(0, 10);
  const summary = `GitHub Actions run ${report.workflow_run_url} verified production Xaman credentials, Mainnet-forced SignIn creation, configured callback behavior, status lookup, and safe cancellation from commit ${report.git_sha}`;
  control.status = "passed";
  control.evidence = `${summary}.`;
  finding.status = "resolved";
  finding.evidence = `${summary}; no credential, QR, deeplink, callback path, or payload UUID was committed.`;

  return { evidence, acceptance };
}
