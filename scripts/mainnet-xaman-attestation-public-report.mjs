import { sha256 } from "./mainnet-xaman-attestation-context.mjs";
import { validateMainnetXamanAttestationReport } from "./mainnet-xaman-attestation-report.mjs";

export function buildPublicMainnetXamanReport({
  context,
  applicationId,
  callback,
  payloadId,
  generatedAt,
}) {
  const report = {
    schema_version: 1,
    network: "mainnet",
    generated_at: generatedAt,
    git_sha: context.gitSha,
    state: "verified",
    workflow_run_url: context.workflowRunUrl,
    api_base_url: "https://xumm.app/api/v1/platform",
    application_fingerprint: sha256(applicationId),
    callback_origin: callback.origin,
    callback_path_digest: callback.pathDigest,
    payload_reference_digest: sha256(payloadId),
    checks: {
      credentials_configured: true,
      application_enabled: true,
      forced_mainnet_request_checked: true,
      callback_behavior_checked: true,
      status_lookup_checked: true,
      cancellation_checked: true,
      sign_in_only: true,
      ledger_submission_possible: false,
      secrets_committed: false,
    },
    evidence_patch: {
      id: "production-provider-attestation",
      status: "accepted",
      recorded_at: generatedAt,
      attestation_reference: context.workflowRunUrl,
      credentials_configured: true,
      forced_mainnet_request_checked: true,
      callback_behavior_checked: true,
      status_lookup_checked: true,
      secrets_committed: false,
    },
  };
  validateMainnetXamanAttestationReport(report, context.gitSha);
  return report;
}
