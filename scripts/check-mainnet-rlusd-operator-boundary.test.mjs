import { describe, expect, it } from "vitest";

import {
  assertMainnetRlusdOperatorBoundary,
  checkMainnetRlusdOperatorBoundary,
} from "./check-mainnet-rlusd-operator-boundary.mjs";

function fixtures() {
  return {
    boundary: {
      schema_version: 1,
      network: "mainnet",
      stage: "live-rlusd-acceptance",
      execution_model: "human-operated",
      maximum_internal_window_minutes: 30,
      signature_timeout_minutes: 20,
      automation_boundary: {
        automatic_mainnet_enablement: false,
        automatic_recipient_readiness_approval: false,
        automatic_bill_creation: false,
        automatic_xaman_request_creation: false,
        automatic_signature: false,
        automatic_transaction_submission: false,
        automatic_evidence_import: false,
      },
      required_manual_gates: [
        "review-halted-baseline",
        "review-recipient-and-payer-readiness",
        "approve-temporary-runtime-diff",
        "create-frozen-bill",
        "create-private-xaman-handoff",
        "inspect-and-sign-in-xaman",
        "review-validated-ledger-evidence",
        "review-negative-controls",
        "restore-and-verify-halted-mode",
        "review-public-safe-report",
      ],
      required_mode_sequence: ["halted", "enabled", "verify-only", "halted"],
      private_delivery: {
        public_actions_log: false,
        public_artifact: false,
        pull_request: false,
        operator_controlled_channel_only: true,
      },
      final_release_decision: "blocked",
    },
    contract: {
      network: "mainnet",
      stage: "live-rlusd-acceptance",
      asset_id: "xrpl:mainnet:rlusd",
      currency: "524C555344000000000000000000000000000000",
      issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
      precision: 6,
      participant_slots: 2,
      recipient_readiness_required: true,
      payer_balance_required: true,
      release_mode: "internal",
      required_baseline_operations_mode: "halted",
      required_restore_operations_mode: "halted",
      signature_timeout_minutes: 20,
    },
    releasePlan: {
      network: "mainnet",
      current_stage: "live-rlusd-acceptance",
      release_decision: "blocked",
      remaining_evidence: ["live-mainnet-rlusd-acceptance"],
      stages: [
        { id: "live-xrp-acceptance", status: "complete" },
        { id: "live-rlusd-acceptance", status: "blocked" },
        { id: "final-release-audit", status: "pending" },
      ],
    },
    productionTarget: {
      network: "mainnet",
      release_mode: "internal",
      operations_mode: "halted",
    },
  };
}

describe("Mainnet RLUSD operator boundary", () => {
  it("validates the committed human-operated boundary", async () => {
    await expect(checkMainnetRlusdOperatorBoundary()).resolves.toMatchObject({
      stage: "live-rlusd-acceptance",
      boundaryStage: "live-rlusd-acceptance",
      executionModel: "human-operated",
      automaticLiveActions: false,
      baselineMode: "halted",
      restoreMode: "halted",
    });
  });

  it("accepts the reviewed final-audit stage after RLUSD evidence", () => {
    const input = fixtures();
    input.releasePlan.current_stage = "final-release-audit";
    input.releasePlan.remaining_evidence = [];
    input.releasePlan.stages = [
      { id: "live-xrp-acceptance", status: "complete" },
      { id: "live-rlusd-acceptance", status: "complete" },
      { id: "final-release-audit", status: "pending" },
    ];

    expect(assertMainnetRlusdOperatorBoundary(input)).toMatchObject({
      stage: "final-release-audit",
      boundaryStage: "live-rlusd-acceptance",
    });
  });

  it("accepts the approved final-audit state", () => {
    const input = fixtures();
    input.releasePlan = {
      network: "mainnet",
      state: "ready",
      current_stage: "final-release-audit",
      release_decision: "approved",
      remaining_evidence: [],
      stages: [
        { id: "live-xrp-acceptance", status: "complete" },
        { id: "live-rlusd-acceptance", status: "complete" },
        { id: "final-release-audit", status: "complete" },
      ],
    };

    expect(assertMainnetRlusdOperatorBoundary(input)).toMatchObject({
      stage: "final-release-audit",
      finalReleaseDecision: "approved",
    });
  });

  it("rejects automated readiness approval or signing", () => {
    const readiness = fixtures();
    readiness.boundary.automation_boundary.automatic_recipient_readiness_approval =
      true;
    expect(() => assertMainnetRlusdOperatorBoundary(readiness)).toThrow(
      "must remain human-operated",
    );

    const signing = fixtures();
    signing.boundary.automation_boundary.automatic_signature = true;
    expect(() => assertMainnetRlusdOperatorBoundary(signing)).toThrow(
      "must remain human-operated",
    );
  });

  it("rejects a non-official issuer and public wallet handoff", () => {
    const issuer = fixtures();
    issuer.contract.issuer = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
    expect(() => assertMainnetRlusdOperatorBoundary(issuer)).toThrow(
      "does not match the operator boundary",
    );

    const delivery = fixtures();
    delivery.boundary.private_delivery.public_artifact = true;
    expect(() => assertMainnetRlusdOperatorBoundary(delivery)).toThrow(
      "not isolated",
    );
  });

  it("rejects an enabled production target", () => {
    const input = fixtures();
    input.productionTarget.operations_mode = "enabled";
    expect(() => assertMainnetRlusdOperatorBoundary(input)).toThrow(
      "must remain internal and halted",
    );
  });
});
