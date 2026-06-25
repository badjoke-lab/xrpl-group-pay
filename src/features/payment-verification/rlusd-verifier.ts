import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type { AssetDescriptor } from "@/features/assets/types";
import type { PaymentIntent } from "@/features/payment-intents/types";
import type { XrplTxResult } from "@/features/xrpl/schemas";

import type { AssetVerificationOutcome } from "./asset-outcome";
import { verifyIssuedPayment } from "./issued-verifier";

function sameAsset(actual: AssetDescriptor, expected: AssetDescriptor) {
  return (
    actual.id === expected.id &&
    actual.paymentRail === expected.paymentRail &&
    actual.network === expected.network &&
    actual.assetType === expected.assetType &&
    actual.currency === expected.currency &&
    actual.issuer === expected.issuer &&
    actual.precision === expected.precision &&
    actual.symbol === expected.symbol &&
    actual.verificationStrategy === expected.verificationStrategy &&
    actual.receiptContract === expected.receiptContract
  );
}

export function verifyRlusdPayment(
  intent: PaymentIntent,
  transactionId: string,
  transaction: XrplTxResult,
  now = new Date(),
): AssetVerificationOutcome {
  const normalizedTransactionId = transactionId.toUpperCase();
  const officialRlusd = getRlusdAssetDescriptor(intent.network);

  if (
    intent.asset.assetType !== "issued" ||
    !sameAsset(intent.asset, officialRlusd) ||
    intent.amount.code !== officialRlusd.symbol ||
    intent.amount.scale !== officialRlusd.precision
  ) {
    return {
      status: "failed",
      reason: "UNSUPPORTED_VERIFICATION_STRATEGY",
      transactionId: normalizedTransactionId,
      message: "The RLUSD verifier received a non-canonical Asset.",
    };
  }

  return verifyIssuedPayment(intent, normalizedTransactionId, transaction, now);
}
