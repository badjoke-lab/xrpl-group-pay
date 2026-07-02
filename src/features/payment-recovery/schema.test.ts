import { describe, expect, it } from "vitest";

import { paymentRecoveryAssessmentSchema } from "./schema";
import { classifyPaymentRecovery } from "./taxonomy";

describe("paymentRecoveryAssessmentSchema", () => {
  it("accepts taxonomy-generated recovery metadata", () => {
    const assessment = classifyPaymentRecovery({
      source: "verification_failed",
      reason: "AMOUNT_MISMATCH",
      transactionId: "A".repeat(64),
    });

    expect(paymentRecoveryAssessmentSchema.parse(assessment)).toEqual(
      assessment,
    );
  });

  it("rejects title, body, or action keys that do not match the policy", () => {
    const assessment = classifyPaymentRecovery({
      source: "verification_pending",
      reason: "TRANSACTION_NOT_VALIDATED",
      transactionId: "B".repeat(64),
    });

    expect(
      paymentRecoveryAssessmentSchema.safeParse({
        ...assessment,
        titleKey: "recovery.disposition.safe_retry.title",
      }).success,
    ).toBe(false);
    expect(
      paymentRecoveryAssessmentSchema.safeParse({
        ...assessment,
        bodyKey: "recovery.reason.wrongAmount",
      }).success,
    ).toBe(false);
    expect(
      paymentRecoveryAssessmentSchema.safeParse({
        ...assessment,
        actionKey: null,
      }).success,
    ).toBe(false);
  });
});
