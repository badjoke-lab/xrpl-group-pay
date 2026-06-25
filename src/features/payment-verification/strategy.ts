import type { PaymentIntent } from "@/features/payment-intents/types";
import type { XrplTxResult } from "@/features/xrpl/schemas";

import type { ExpectedPayment } from "./expected-payment";
import type { PaymentVerificationOutcome } from "./types";
import { verifyXrpPayment } from "./verifier";

export type VerificationStrategyInput = {
  intent: PaymentIntent;
  transactionId: string;
  transaction: XrplTxResult;
  now: Date;
};

export interface VerificationStrategy {
  readonly strategyId: PaymentIntent["asset"]["verificationStrategy"];
  verify(input: VerificationStrategyInput): PaymentVerificationOutcome;
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
    return verifyXrpPayment(expected, transaction, now);
  },
};

const strategies = new Map([
  [xrpPaymentVerificationStrategy.strategyId, xrpPaymentVerificationStrategy],
]);

export function dispatchPaymentVerification(
  intent: PaymentIntent,
  transactionId: string,
  transaction: XrplTxResult,
  now = new Date(),
): PaymentVerificationOutcome {
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
