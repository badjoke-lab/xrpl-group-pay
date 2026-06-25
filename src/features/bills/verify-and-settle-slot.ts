import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import type { AssetVerificationOutcome } from "@/features/payment-verification/asset-outcome";
import {
  assetPaymentVerificationApiOutcomeSchema,
  type AssetPaymentVerificationApiOutcome,
} from "@/features/payment-verification/types";

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

  if (outcome.status !== "verified") {
    return assetPaymentVerificationApiOutcomeSchema.parse(outcome);
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
