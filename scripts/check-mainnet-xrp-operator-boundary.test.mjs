import { describe, expect, it } from "vitest";

import {
  assertMainnetXrpOperatorBoundary,
  checkMainnetXrpOperatorBoundary,
} from "./check-mainnet-xrp-operator-boundary.mjs";

function fixtures() {
  return {
    boundary: {
      schema_version: 1,
      network: "mainnet",
      stage: "live-xrp-acceptance",
      execution_model: "human-operated",
      maximum_internal_window_minutes: 30,
      signature_timeout_minutes: 20,
      automation_boundary: {
        automatic_mainnet_enablement: false,
        automatic_bill_creation: false,
        automatic_xaman_request_creation: false,
        automatic_signature: false,
        automatic_transaction_submission: false,
        automatic_evidence_import: false,
      },
      required_manual_gates: [
        "review-halted-baseline",
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
      stage: "live-xrp-acceptance",
      release_mode: "internal",
      required_baseline_operations_mode: "halted",
      required_restore_operations_mode: "halted",
      signature_timeout_minutes: 20,
    },
    releasePlan: {
      network: "mainnet",
      current_stage: "live-xrp-acceptance",
      release_decision: "blocked",
    },
    productionTarget: {
      network: "mainnet",
      release_mode: "internal",
      operations_mode: "halted",
    },
  };
}

describe("Mainnet XRP operator boundary", () => {
  it("accepts the reviewed final audit stage after XRP and RLUSD", () => {
    const input = fixtures();

    input.releasePlan = {
      network: "mainnet",
      current_stage: "final-release-audit",
      release_decision: "blocked",
      remaining_evidence: [],
      stages: [
        {
          id: "live-xrp-acceptance",
          status: "complete",
        },
        {
          id: "live-rlusd-acceptance",
          status: "complete",
        },
        {
          id: "final-release-audit",
          status: "pending",
        },
      ],
    };

    expect(
      assertMainnetXrpOperatorBoundary(input),
    ).toMatchObject({
      stage: "final-release-audit",
      finalReleaseDecision: "blocked",
    });
  });

  it("validates the committed human-operated boundary", async () => {
    await expect(checkMainnetXrpOperatorBoundary()).resolves.toMatchObject({
      executionModel: "human-operated",
      automaticLiveActions: false,
      baselineMode: "halted",
      restoreMode: "halted",
    });
  });

  it("rejects a non-human execution model", () => {
    const input = fixtures();
    input.boundary.execution_model = "unattended";
    expect(() => assertMainnetXrpOperatorBoundary(input)).toThrow(
      "The Mainnet XRP operator boundary is invalid.",
    );
  });

  it("rejects public wallet-handoff delivery", () => {
    const input = fixtures();
    input.boundary.private_delivery.public_artifact = true;
    expect(() => assertMainnetXrpOperatorBoundary(input)).toThrow(
      "Private wallet handoff material is not isolated.",
    );
  });

  it("rejects a target that is not halted", () => {
    const input = fixtures();
    input.productionTarget.operations_mode = "enabled";
    expect(() => assertMainnetXrpOperatorBoundary(input)).toThrow(
      "The production target must remain internal and halted.",
    );
  });
});
