import type { PaymentIntent } from "@/features/payment-intents/types";
import type { XrplTxResult } from "@/features/xrpl/schemas";

import type { AssetVerificationOutcome } from "./asset-outcome";
import type { ExpectedPayment } from "./expected-payment";
import { verifyIssuedPayment } from "./issued-verifier";
import type { PaymentVerificationOutcome } from "./types";
import { verifyXrpPayment } from "./verifier";
import { verifiedPaymentFromXrpProof } from "./verified-payment";

export type VerificationStrategyInput = {
  intent: PaymentIntent;
  transactionId: string;
  transaction: XrplTxResult;
  now: Date;
};

export interface VerificationStrategy {
  readonly strategyId: PaymentIntent["asset"]["verificationStrategy"];
  verify(input: VerificationStrategyInput): AssetVerificationOutcome;
}

function expectedXrpPayment(
  intent: PaymentIntent,
  transactionId: string,
): ExpectedPayment | null {
  if (
    intent.asset.assetType !== "native" ||
    intent.asset.currency !== "XRP" ||
    intent.asset.issuer !== null ||
    intent.amount.code !== "XRP" ||
    intent.amount.scale !== 6
  ) {
    return null;
  }

  return {
    transactionId,
    sender: intent.expectedPayer,
    destination: intent.destination,
    amountDrops: intent.amount.units,
    sourceTag: intent.sourceTag,
    destinationTag: intent.destinationTag,
    invoiceId: intent.invoiceId,
  };
}

export const xrpPaymentVerificationStrategy: VerificationStrategy = {
  strategyId: "xrpl-xrp-v1",
  verify({ intent, transactionId, transaction, now }) {
    const expected = expectedXrpPayment(intent, transactionId);
    if (!expected) {
      return {
        status: "failed",
        reason: "UNSUPPORTED_VERIFICATION_STRATEGY",
        transactionId,
        message: "The XRP strategy received an incompatible Asset.",
      };
    }
    const outcome = verifyXrpPayment(expected, transaction, now);
    if (outcome.status !== "verified") return outcome;
    return {
      status: "verified",
      payment: verifiedPaymentFromXrpProof(outcome.proof),
      legacyProof: outcome.proof,
    };
  },
};

export const issuedPaymentVerificationStrategy: VerificationStrategy = {
  strategyId: "xrpl-issued-asset-v1",
  verify({ intent, transactionId, transaction, now }) {
    return verifyIssuedPayment(intent, transactionId, transaction, now);
  },
};

const strategies = new Map<
  PaymentIntent["asset"]["verificationStrategy"],
  VerificationStrategy
>([
  [xrpPaymentVerificationStrategy.strategyId, xrpPaymentVerificationStrategy],
  [
    issuedPaymentVerificationStrategy.strategyId,
    issuedPaymentVerificationStrategy,
  ],
]);

export function dispatchAssetPaymentVerification(
  intent: PaymentIntent,
  transactionId: string,
  transaction: XrplTxResult,
  now = new Date(),
): AssetVerificationOutcome {
  const normalizedTransactionId = transactionId.toUpperCase();
  const strategy = strategies.get(intent.asset.verificationStrategy);

  if (!strategy) {
    return {
      status: "failed",
      reason: "UNSUPPORTED_VERIFICATION_STRATEGY",
      transactionId: normalizedTransactionId,
      message: "No verification strategy is registered for this Asset.",
    };
  }

  return strategy.verify({
    intent,
    transactionId: normalizedTransactionId,
    transaction,
    now,
  });
}

export function dispatchPaymentVerification(
  intent: PaymentIntent,
  transactionId: string,
  transaction: XrplTxResult,
  now = new Date(),
): PaymentVerificationOutcome {
  const outcome = dispatchAssetPaymentVerification(
    intent,
    transactionId,
    transaction,
    now,
  );
  if (outcome.status !== "verified") return outcome;
  if (outcome.legacyProof !== null) {
    return { status: "verified", proof: outcome.legacyProof };
  }
  return {
    status: "failed",
    reason: "UNSUPPORTED_VERIFICATION_STRATEGY",
    transactionId: transactionId.toUpperCase(),
    message: "The verified Asset is not enabled on this endpoint.",
  };
}
