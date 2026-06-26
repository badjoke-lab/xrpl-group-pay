import { describe, expect, it } from "vitest";

import {
  applyMainnetOperationalStopDrillReport,
  validateMainnetOperationalStopDrillReport,
} from "./mainnet-operational-stop-drill-report.mjs";

const SHA = "a".repeat(40);
const RUN_URL =
  "https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/28240000000";

function report() {
  const generatedAt = "2026-06-26T05:00:00.000Z";
  return {
    schema_version: 1,
    network: "mainnet",
    environment: "production-equivalent",
    generated_at: generatedAt,
    git_sha: SHA,
    state: "verified",
    workflow_run_url: RUN_URL,
    committed_mainnet_mode: "halted",
    restore_review: {
      simulated_mode: "enabled",
      committed_mode: "halted",
      applied: false,
      review_required: true,
    },
    checks: {
      verify_only_creation_blocked: true,
      verify_only_submitted_payment_settled: true,
      verify_only_status_checked: true,
      halted_creation_blocked: true,
      halted_verification_blocked: true,
      halted_status_checked: true,
      restore_change_reviewed: true,
      external_services_called: false,
      production_state_changed: false,
    },
    evidence_patch: {
      id: "operational-stop-drill",
      status: "accepted",
      recorded_at: generatedAt,
      environment: "production-equivalent",
      verify_only_creation_blocked: true,
      verify_only_submitted_payment_settled: true,
      verify_only_status_checked: true,
      halted_creation_blocked: true,
      halted_verification_blocked: true,
      halted_status_checked: true,
      restore_change_reviewed: true,
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
        id: "operational-stop-drill",
        status: "pending",
        recorded_at: null,
        environment: "production-equivalent",
        verify_only_creation_blocked: false,
        verify_only_submitted_payment_settled: false,
        verify_only_status_checked: false,
        halted_creation_blocked: false,
        halted_verification_blocked: false,
        halted_status_checked: false,
        restore_change_reviewed: false,
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
        id: "operational-stop-drill",
        status: "pending",
        evidence: "pending",
      },
      { id: "unrelated", status: "pending", evidence: "unchanged" },
    ],
    blocking_findings: [
      {
        id: "operational-stop-drill-not-recorded",
        status: "open",
        evidence: "pending",
      },
      { id: "unrelated", status: "open", evidence: "unchanged" },
    ],
  };
}

describe("Mainnet operational stop drill report", () => {
  it("accepts a complete production-equivalent report", () => {
    expect(validateMainnetOperationalStopDrillReport(report(), SHA)).toEqual(
      report(),
    );
  });

  it("rejects stale, incomplete, foreign, or state-changing reports", () => {
    expect(() =>
      validateMainnetOperationalStopDrillReport(report(), "e".repeat(40)),
    ).toThrow("commit does not match");

    const incomplete = report();
    incomplete.checks.halted_verification_blocked = false;
    expect(() =>
      validateMainnetOperationalStopDrillReport(incomplete, SHA),
    ).toThrow();

    const foreign = report();
    foreign.workflow_run_url =
      "https://github.com/another/repository/actions/runs/28240000000";
    expect(() =>
      validateMainnetOperationalStopDrillReport(foreign, SHA),
    ).toThrow();

    const changed = report();
    changed.restore_review.applied = true;
    expect(() =>
      validateMainnetOperationalStopDrillReport(changed, SHA),
    ).toThrow();
  });

  it("updates only the matching evidence, control, and finding", () => {
    const sourceEvidence = evidence();
    const sourceAcceptance = acceptance();
    const result = applyMainnetOperationalStopDrillReport({
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
    const first = applyMainnetOperationalStopDrillReport({
      report: report(),
      expectedGitSha: SHA,
      evidence: evidence(),
      acceptance: acceptance(),
    });

    expect(() =>
      applyMainnetOperationalStopDrillReport({
        report: report(),
        expectedGitSha: SHA,
        evidence: first.evidence,
        acceptance: first.acceptance,
      }),
    ).not.toThrow();

    const conflicting = structuredClone(first.evidence);
    conflicting.records[0].recorded_at = "2026-06-26T06:00:00.000Z";
    expect(() =>
      applyMainnetOperationalStopDrillReport({
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
      applyMainnetOperationalStopDrillReport({
        report: report(),
        expectedGitSha: SHA,
        evidence: evidence(),
        acceptance: inconsistent,
      }),
    ).toThrow("inconsistent");

    const approved = acceptance();
    approved.release_decision = "approved";
    expect(() =>
      applyMainnetOperationalStopDrillReport({
        report: report(),
        expectedGitSha: SHA,
        evidence: evidence(),
        acceptance: approved,
      }),
    ).toThrow("blocked Mainnet release");
  });
});
