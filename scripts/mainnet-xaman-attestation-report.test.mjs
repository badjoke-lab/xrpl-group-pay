import { describe, expect, it } from "vitest";

import {
  applyMainnetXamanAttestationReport,
  validateMainnetXamanAttestationReport,
} from "./mainnet-xaman-attestation-report.mjs";

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

function evidence() {
  return {
    schema_version: 1,
    network: "mainnet",
    updated_at: "2026-06-26",
    records: [
      {
        id: "production-provider-attestation",
        status: "pending",
        recorded_at: null,
        attestation_reference: null,
        credentials_configured: false,
        forced_mainnet_request_checked: false,
        callback_behavior_checked: false,
        status_lookup_checked: false,
        secrets_committed: false,
      },
      { id: "unrelated", status: "pending" },
    ],
  };
}

function acceptance() {
  return {
    release_decision: "blocked",
    controls: [
      {
        id: "production-provider-attestation",
        status: "pending",
        evidence: "pending",
      },
      { id: "unrelated", status: "pending", evidence: "unchanged" },
    ],
    blocking_findings: [
      {
        id: "production-provider-not-attested",
        status: "open",
        evidence: "pending",
      },
      { id: "unrelated", status: "open", evidence: "unchanged" },
    ],
  };
}

describe("Mainnet Xaman attestation report", () => {
  it("accepts a complete public-safe report", () => {
    expect(validateMainnetXamanAttestationReport(report(), SHA)).toEqual(
      report(),
    );
  });

  it("rejects stale, incomplete, foreign, or sensitive reports", () => {
    expect(() =>
      validateMainnetXamanAttestationReport(report(), "e".repeat(40)),
    ).toThrow("commit does not match");

    const incomplete = report();
    incomplete.checks.status_lookup_checked = false;
    expect(() =>
      validateMainnetXamanAttestationReport(incomplete, SHA),
    ).toThrow();

    const foreign = report();
    foreign.workflow_run_url =
      "https://github.com/another/repository/actions/runs/28230000000";
    foreign.evidence_patch.attestation_reference = foreign.workflow_run_url;
    expect(() => validateMainnetXamanAttestationReport(foreign, SHA)).toThrow();

    const sensitive = { ...report(), payload_uuid: crypto.randomUUID() };
    expect(() =>
      validateMainnetXamanAttestationReport(sensitive, SHA),
    ).toThrow("forbidden field");
  });

  it("updates only the matching evidence, control, and finding", () => {
    const sourceEvidence = evidence();
    const sourceAcceptance = acceptance();
    const result = applyMainnetXamanAttestationReport({
      report: report(),
      expectedGitSha: SHA,
      evidence: sourceEvidence,
      acceptance: sourceAcceptance,
    });

    expect(result.evidence.records[0]).toEqual(report().evidence_patch);
    expect(result.evidence.records[1]).toEqual(sourceEvidence.records[1]);
    expect(result.acceptance.controls[0].status).toBe("passed");
    expect(result.acceptance.controls[1]).toEqual(
      sourceAcceptance.controls[1],
    );
    expect(result.acceptance.blocking_findings[0].status).toBe("resolved");
    expect(result.acceptance.blocking_findings[1]).toEqual(
      sourceAcceptance.blocking_findings[1],
    );
    expect(result.acceptance.release_decision).toBe("blocked");
  });

  it("allows exact replay and rejects conflicting accepted evidence", () => {
    const first = applyMainnetXamanAttestationReport({
      report: report(),
      expectedGitSha: SHA,
      evidence: evidence(),
      acceptance: acceptance(),
    });
    expect(() =>
      applyMainnetXamanAttestationReport({
        report: report(),
        expectedGitSha: SHA,
        evidence: first.evidence,
        acceptance: first.acceptance,
      }),
    ).not.toThrow();

    const conflicting = structuredClone(first.evidence);
    conflicting.records[0].attestation_reference =
      "https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/28230000001";
    expect(() =>
      applyMainnetXamanAttestationReport({
        report: report(),
        expectedGitSha: SHA,
        evidence: conflicting,
        acceptance: first.acceptance,
      }),
    ).toThrow("differs from the report");
  });

  it("rejects inconsistent state and an approved release", () => {
    const inconsistent = acceptance();
    inconsistent.controls[0].status = "passed";
    expect(() =>
      applyMainnetXamanAttestationReport({
        report: report(),
        expectedGitSha: SHA,
        evidence: evidence(),
        acceptance: inconsistent,
      }),
    ).toThrow("inconsistent");

    const approved = acceptance();
    approved.release_decision = "approved";
    expect(() =>
      applyMainnetXamanAttestationReport({
        report: report(),
        expectedGitSha: SHA,
        evidence: evidence(),
        acceptance: approved,
      }),
    ).toThrow("blocked Mainnet release");
  });
});
