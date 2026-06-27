import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { assertEvidenceMatchesAcceptance } from "./check-mainnet-release-evidence.mjs";
import { applyMainnetXamanAttestationReport } from "./mainnet-xaman-attestation-report.mjs";

const SHA = "a".repeat(40);
const RUN_URL =
  "https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/28230000000";

function report() {
  const generatedAt = "2026-06-26T04:00:00.000Z";
  return {
    schema_version: 1,
    network: "mainnet",
    generated_at: generatedAt,
    git_sha: SHA,
    state: "verified",
    workflow_run_url: RUN_URL,
    api_base_url: "https://xumm.app/api/v1/platform",
    application_fingerprint: "b".repeat(64),
    callback_origin: "https://pay.example.com",
    callback_path_digest: "c".repeat(64),
    payload_reference_digest: "d".repeat(64),
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
      attestation_reference: RUN_URL,
      credentials_configured: true,
      forced_mainnet_request_checked: true,
      callback_behavior_checked: true,
      status_lookup_checked: true,
      secrets_committed: false,
    },
  };
}

function pendingProviderState(evidence, acceptance) {
  const pendingEvidence = structuredClone(evidence);
  const pendingAcceptance = structuredClone(acceptance);

  Object.assign(
    pendingEvidence.records.find(
      (record) => record.id === "production-provider-attestation",
    ),
    {
      status: "pending",
      recorded_at: null,
      attestation_reference: null,
      credentials_configured: false,
      forced_mainnet_request_checked: false,
      callback_behavior_checked: false,
      status_lookup_checked: false,
      secrets_committed: false,
    },
  );

  Object.assign(
    pendingAcceptance.controls.find(
      (control) => control.id === "production-provider-attestation",
    ),
    {
      status: "pending",
      evidence:
        "No repository-safe attestation records that production Xaman credentials and callback behavior have been validated.",
    },
  );

  Object.assign(
    pendingAcceptance.blocking_findings.find(
      (finding) => finding.id === "production-provider-not-attested",
    ),
    {
      status: "open",
      evidence:
        "Record a non-secret attestation for production Xaman credentials, forced Mainnet requests, and callback/status behavior.",
    },
  );

  return { pendingEvidence, pendingAcceptance };
}

describe("Mainnet Xaman attestation compatibility", () => {
  it("produces documents accepted by the existing evidence mapping", async () => {
    const [evidenceSource, acceptanceSource] = await Promise.all([
      readFile(
        resolve(process.cwd(), "config/mainnet-release-evidence.json"),
        "utf8",
      ),
      readFile(
        resolve(process.cwd(), "config/mainnet-acceptance.json"),
        "utf8",
      ),
    ]);
    const originalAcceptance = JSON.parse(acceptanceSource);
    const { pendingEvidence, pendingAcceptance } = pendingProviderState(
      JSON.parse(evidenceSource),
      originalAcceptance,
    );
    const result = applyMainnetXamanAttestationReport({
      report: report(),
      expectedGitSha: SHA,
      evidence: pendingEvidence,
      acceptance: pendingAcceptance,
    });

    expect(() =>
      assertEvidenceMatchesAcceptance(result.evidence, result.acceptance),
    ).not.toThrow();
    expect(result.acceptance.release_decision).toBe("blocked");
    expect(
      result.acceptance.blocking_findings
        .filter((finding) => finding.status === "open")
        .map((finding) => finding.id)
        .sort(),
    ).toEqual(
      [
        "live-rlusd-acceptance-not-recorded",
        "live-xrp-acceptance-not-recorded",
        "production-runtime-not-approved",
      ].sort(),
    );
    expect(
      result.acceptance.blocking_findings.find(
        (finding) => finding.id === "production-runtime-not-approved",
      ),
    ).toEqual(
      originalAcceptance.blocking_findings.find(
        (finding) => finding.id === "production-runtime-not-approved",
      ),
    );
  });
});
