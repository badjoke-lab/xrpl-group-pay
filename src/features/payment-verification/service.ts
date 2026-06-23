import {
  ExpectedPaymentError,
  extractExpectedPayment,
} from "./expected-payment";
import type { PaymentVerificationOutcome } from "./types";
import { verifyXrpPayment } from "./verifier";
import type { XamanPayloadResponse } from "@/features/xaman/schemas";
import {
  XrplTransactionPendingError,
} from "@/features/xrpl/client";
import type { XrplTxResult } from "@/features/xrpl/schemas";

export type PaymentVerificationDependencies = {
  getXamanPayload: (payloadId: string) => Promise<XamanPayloadResponse>;
  getXrplTransaction: (transactionId: string) => Promise<XrplTxResult>;
  sourceTag: number;
  now?: () => Date;
};

export async function verifyXamanPayment(
  payloadId: string,
  dependencies: PaymentVerificationDependencies,
): Promise<PaymentVerificationOutcome> {
  const payload = await dependencies.getXamanPayload(payloadId);

  let expected;
  try {
    expected = extractExpectedPayment(payload, dependencies.sourceTag);
  } catch (error) {
    if (
      error instanceof ExpectedPaymentError &&
      error.code === "XAMAN_NOT_RESOLVED"
    ) {
      return {
        status: "pending",
        reason: "XAMAN_NOT_RESOLVED",
        transactionId: payload.response.txid ?? null,
        message: error.message,
      };
    }

    return {
      status: "failed",
      reason: "INVALID_XAMAN_TEMPLATE",
      transactionId: payload.response.txid ?? null,
      message:
        error instanceof Error
          ? error.message
          : "The Xaman Payment template is invalid.",
    };
  }

  try {
    const transaction = await dependencies.getXrplTransaction(
      expected.transactionId,
    );
    return verifyXrpPayment(
      expected,
      transaction,
      dependencies.now?.() ?? new Date(),
    );
  } catch (error) {
    if (error instanceof XrplTransactionPendingError) {
      return {
        status: "pending",
        reason: "TRANSACTION_NOT_FOUND",
        transactionId: expected.transactionId,
        message: "The transaction is not available on a validated Testnet ledger yet.",
      };
    }
    throw error;
  }
}
