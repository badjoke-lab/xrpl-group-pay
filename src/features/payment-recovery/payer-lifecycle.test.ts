import { describe, expect, it } from "vitest";

import {
  payerLifecycleFromApiError,
  payerLifecycleFromProviderState,
  payerLifecycleFromVerification,
} from "./payer-lifecycle";

describe("payer lifecycle recovery policy", () => {
  it("requires reconciliation before replacing rejected or expired handoffs", () => {
    for (const state of ["rejected", "expired"] as const) {
      const lifecycle = payerLifecycleFromProviderState(state);
      expect(lifecycle.kind).toBe("retry_safe");
      expect(lifecycle.retryAllowed).toBe(true);
      expect(lifecycle.replacementRule).toBe("reconcile_first");
    }
  });

  it("never offers retry while a submitted transaction remains pending", () => {
    const lifecycle = payerLifecycleFromVerification({
      status: "pending",
      reason: "TRANSACTION_NOT_VALIDATED",
      transactionId: "A".repeat(64),
      message: "The submitted transaction is not validated yet.",
    });

    expect(lifecycle.kind).toBe("wait_recheck");
    expect(lifecycle.recheckAllowed).toBe(true);
    expect(lifecycle.retryAllowed).toBe(false);
    expect(lifecycle.replacementRule).toBe("blocked");
  });

  it("routes payment mismatches to review instead of automatic retry", () => {
    const lifecycle = payerLifecycleFromVerification({
      status: "failed",
      reason: "WRONG_DESTINATION",
      transactionId: "B".repeat(64),
      message: "Destination mismatch.",
    });

    expect(lifecycle.kind).toBe("review_required");
    expect(lifecycle.retryAllowed).toBe(false);
    expect(lifecycle.recheckAllowed).toBe(false);
  });

  it("keeps already-paid, reconciliation, setup, and closed states distinct", () => {
    expect(payerLifecycleFromApiError("SLOT_ALREADY_PAID").kind).toBe(
      "already_paid",
    );
    expect(
      payerLifecycleFromApiError("PAYMENT_RECONCILIATION_UNAVAILABLE").kind,
    ).toBe("wait_recheck");
    expect(
      payerLifecycleFromApiError("PAYMENT_READINESS_BLOCKED").kind,
    ).toBe("setup_required");
    expect(payerLifecycleFromApiError("BILL_NOT_PAYABLE").kind).toBe(
      "terminal",
    );
  });
});
