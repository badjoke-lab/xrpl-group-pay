import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import {
  assetPaymentVerificationApiOutcomeSchema,
  type AssetPaymentVerificationApiOutcome,
} from "@/features/payment-verification/asset-api-outcome";
import type { AssetVerificationOutcome } from "@/features/payment-verification/asset-outcome";
import { classifyPaymentRecovery } from "@/features/payment-recovery/taxonomy";

import { markPaymentSlotNeedsReview } from "./payment-review-store";
import type { ResolvedPaymentSlot } from "./payment-slot";
import { settleVerifiedIssuedPaymentSlot } from "./settle-issued-slot";
import { settleVerifiedPaymentSlot } from "./settle-slot";
import {
  verifyStoredSlotAssetPayment,
  type StoredSlotVerificationDependencies,
} from "./stored-slot-verification";

export type VerifyAndSettleSlotDependencies = {
  verification: StoredSlotVerificationDependencies;
  verifyPayment?: (
    slot: ResolvedPaymentSlot,
    requestId: string,
    dependencies: StoredSlotVerificationDependencies,
  ) => Promise<AssetVerificationOutcome>;
  settleXrp?: typeof settleVerifiedPaymentSlot;
  settleIssued?: typeof settleVerifiedIssuedPaymentSlot;
  recordReview?: typeof markPaymentSlotNeedsReview;
};

export async function verifyAndSettleStoredSlotPayment(
  database: D1DatabaseLike,
  slot: ResolvedPaymentSlot,
  requestId: string,
  dependencies: VerifyAndSettleSlotDependencies,
): Promise<AssetPaymentVerificationApiOutcome> {
  const outcome = await (
    dependencies.verifyPayment ?? verifyStoredSlotAssetPayment
  )(slot, requestId, dependencies.verification);

  if (outcome.status === "pending") {
    return assetPaymentVerificationApiOutcomeSchema.parse({
      ...outcome,
      recovery: classifyPaymentRecovery({
        source: "verification_pending",
        reason: outcome.reason,
        transactionId: outcome.transactionId,
      }),
    });
  }

  if (outcome.status === "failed") {
    const recovery = classifyPaymentRecovery({
      source: "verification_failed",
      reason: outcome.reason,
      transactionId: outcome.transactionId,
    });
    if (recovery.requiresReview) {
      await (dependencies.recordReview ?? markPaymentSlotNeedsReview)(
        database,
        slot,
        {
          kind: "verification_mismatch",
          transactionId: outcome.transactionId,
          reasonCode: recovery.code,
          message: outcome.message,
        },
      );
    }
    return assetPaymentVerificationApiOutcomeSchema.parse({
      ...outcome,
      recovery,
    });
  }

  if (outcome.legacyProof !== null) {
    const settlement = await (
      dependencies.settleXrp ?? settleVerifiedPaymentSlot
    )(database, slot, outcome.legacyProof);

    return assetPaymentVerificationApiOutcomeSchema.parse({
      status: "verified",
      proof: outcome.legacyProof,
      receipt: settlement.receipt,
    });
  }

  const settlement = await (
    dependencies.settleIssued ?? settleVerifiedIssuedPaymentSlot
  )(database, slot, outcome.payment);

  return assetPaymentVerificationApiOutcomeSchema.parse({
    status: "verified",
    payment: outcome.payment,
    receipt: settlement.receipt,
  });
}
