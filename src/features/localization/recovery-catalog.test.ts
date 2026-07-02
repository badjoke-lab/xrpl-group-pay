import { describe, expect, it } from "vitest";

import { classifyPaymentRecovery } from "@/features/payment-recovery/taxonomy";

import { paymentRecoveryCopy, recoveryTranslate } from "./recovery-catalog";

describe("payment recovery localization", () => {
  it("provides English, Japanese, and Korean disposition copy", () => {
    const assessment = classifyPaymentRecovery({
      source: "verification_pending",
      reason: "TRANSACTION_NOT_VALIDATED",
      transactionId: "A".repeat(64),
    });

    expect(paymentRecoveryCopy("en", assessment)).toEqual({
      title: "Wait and check again",
      body:
        "A submitted transaction has not appeared in a validated ledger yet. Do not create another payment while confirmation is pending.",
      action: "Check again",
    });
    expect(paymentRecoveryCopy("ja", assessment)).toMatchObject({
      title: "待ってから再確認してください",
      action: "再確認",
    });
    expect(paymentRecoveryCopy("ko", assessment)).toMatchObject({
      title: "기다린 후 다시 확인하세요",
      action: "다시 확인",
    });
  });

  it("does not offer an action for review, already-paid, or terminal outcomes", () => {
    const assessments = [
      classifyPaymentRecovery({
        source: "verification_failed",
        reason: "WRONG_DESTINATION",
        transactionId: "B".repeat(64),
      }),
      classifyPaymentRecovery({
        source: "slot",
        code: "SLOT_ALREADY_PAID",
      }),
      classifyPaymentRecovery({ source: "slot", code: "BILL_CLOSED" }),
    ];

    for (const locale of ["en", "ja", "ko"] as const) {
      for (const assessment of assessments) {
        expect(paymentRecoveryCopy(locale, assessment).action).toBeNull();
      }
    }
  });

  it("keeps specific public explanations separate from raw internal codes", () => {
    for (const locale of ["en", "ja", "ko"] as const) {
      const copy = recoveryTranslate(
        locale,
        "recovery.reason.insufficientSpendableXrp",
      );
      expect(copy.length).toBeGreaterThan(20);
      expect(copy).not.toContain("INSUFFICIENT_SPENDABLE_XRP");
    }
  });
});
