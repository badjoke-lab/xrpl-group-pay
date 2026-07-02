import { describe, expect, it } from "vitest";

import type {
  VerificationFailureReason,
  VerificationPendingReason,
} from "@/features/payment-verification/types";

import { classifyPaymentRecovery } from "./taxonomy";

const TXID = "A".repeat(64);

describe("classifyPaymentRecovery", () => {
  it("allows cancellation and expiry retry only through reconciliation", () => {
    for (const status of ["rejected", "expired"] as const) {
      expect(
        classifyPaymentRecovery({ source: "provider", status }),
      ).toMatchObject({
        disposition: "safe_retry",
        replacementRule: "reconcile_first",
        canRecheck: false,
        requiresReview: false,
      });
    }
  });

  it("blocks simple retry when a terminal handoff also has a transaction", () => {
    for (const status of ["rejected", "expired", "failed"] as const) {
      expect(
        classifyPaymentRecovery({
          source: "provider",
          status,
          transactionId: TXID,
        }),
      ).toMatchObject({
        disposition: "review_required",
        replacementRule: "blocked",
        requiresReview: true,
      });
    }
  });

  it("maps every pending verification reason to wait and recheck", () => {
    const reasons: VerificationPendingReason[] = [
      "HANDOFF_NOT_SUBMITTED",
      "XAMAN_NOT_RESOLVED",
      "TRANSACTION_NOT_FOUND",
      "TRANSACTION_NOT_VALIDATED",
      "VERIFICATION_UNAVAILABLE",
    ];

    for (const reason of reasons) {
      expect(
        classifyPaymentRecovery({
          source: "verification_pending",
          reason,
          transactionId: reason.startsWith("TRANSACTION") ? TXID : null,
        }),
      ).toMatchObject({
        disposition: "wait_recheck",
        replacementRule: "blocked",
        canRecheck: true,
      });
    }
  });

  it("classifies validated transaction failure as retryable only after reconciliation", () => {
    expect(
      classifyPaymentRecovery({
        source: "verification_failed",
        reason: "TRANSACTION_FAILED",
        transactionId: TXID,
      }),
    ).toMatchObject({
      code: "TRANSACTION_FAILED",
      disposition: "safe_retry",
      replacementRule: "reconcile_first",
    });
  });

  it("classifies all payment-contract mismatches as review required", () => {
    const reasons: VerificationFailureReason[] = [
      "INVALID_PROVIDER_HANDOFF",
      "HANDOFF_FAILED",
      "INVALID_XAMAN_TEMPLATE",
      "SLOT_EXPECTATION_MISMATCH",
      "HASH_MISMATCH",
      "WRONG_TRANSACTION_TYPE",
      "WRONG_SENDER",
      "WRONG_DESTINATION",
      "NON_XRP_PAYMENT",
      "NON_ISSUED_PAYMENT",
      "ASSET_MISMATCH",
      "DELIVERED_ASSET_MISMATCH",
      "AMOUNT_MISMATCH",
      "DELIVERED_AMOUNT_MISMATCH",
      "PARTIAL_PAYMENT",
      "CROSS_CURRENCY_PAYMENT",
      "SOURCE_TAG_MISMATCH",
      "DESTINATION_TAG_MISMATCH",
      "INVOICE_ID_MISMATCH",
    ];

    for (const reason of reasons) {
      expect(
        classifyPaymentRecovery({
          source: "verification_failed",
          reason,
          transactionId: TXID,
        }),
      ).toMatchObject({
        disposition: "review_required",
        replacementRule: "blocked",
        requiresReview: true,
      });
    }
  });

  it("keeps provider failure without a transaction in wait-and-recheck", () => {
    expect(
      classifyPaymentRecovery({
        source: "verification_failed",
        reason: "HANDOFF_PROVIDER_FAILED",
        transactionId: null,
      }),
    ).toMatchObject({
      code: "HANDOFF_PROVIDER_FAILED",
      disposition: "wait_recheck",
      canRecheck: true,
    });
  });

  it("maps wallet funding and trust-line gaps to setup required", () => {
    for (const reason of [
      "account_not_found",
      "insufficient_spendable_xrp",
      "trust_line_missing",
      "trust_line_not_authorized",
      "issued_balance_insufficient",
    ] as const) {
      expect(
        classifyPaymentRecovery({
          source: "readiness",
          role: "payer",
          reason,
        }),
      ).toMatchObject({
        disposition: "setup_required",
        requiresSetup: true,
      });
    }
  });

  it("does not present freeze conditions as TrustSet-fixable setup", () => {
    for (const reason of [
      "issuer_not_found",
      "issuer_global_freeze",
      "trust_line_frozen",
    ] as const) {
      expect(
        classifyPaymentRecovery({
          source: "readiness",
          role: "recipient",
          reason,
        }),
      ).toMatchObject({
        disposition: "terminal",
        replacementRule: "blocked",
      });
    }
  });

  it("distinguishes already-paid, active, closed, and review states", () => {
    expect(
      classifyPaymentRecovery({
        source: "slot",
        code: "SLOT_ALREADY_PAID",
      }),
    ).toMatchObject({ disposition: "already_paid" });
    expect(
      classifyPaymentRecovery({
        source: "slot",
        code: "ACTIVE_HANDOFF_EXISTS",
      }),
    ).toMatchObject({ disposition: "wait_recheck" });
    expect(
      classifyPaymentRecovery({ source: "slot", code: "BILL_CLOSED" }),
    ).toMatchObject({ disposition: "terminal" });
    expect(
      classifyPaymentRecovery({
        source: "reconciliation",
        code: "MULTIPLE_PAYMENT_CANDIDATES",
      }),
    ).toMatchObject({
      code: "MULTIPLE_CANDIDATES",
      disposition: "review_required",
    });
  });
});
