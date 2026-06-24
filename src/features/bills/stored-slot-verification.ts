import {
  ExpectedPaymentError,
  extractExpectedPayment,
  type ExpectedPayment,
} from "@/features/payment-verification/expected-payment";
import type { PaymentVerificationOutcome } from "@/features/payment-verification/types";
import { verifyXrpPayment } from "@/features/payment-verification/verifier";
import type { XamanPayloadResponse } from "@/features/xaman/schemas";
import {
  XrplTransactionPendingError,
} from "@/features/xrpl/client";
import type { XrplTxResult } from "@/features/xrpl/schemas";

import type { ResolvedPaymentSlot } from "./payment-slot";

export type StoredSlotVerificationDependencies = {
  getXamanPayload(payloadId: string): Promise<XamanPayloadResponse>;
  getXrplTransaction(transactionId: string): Promise<XrplTxResult>;
  sourceTag: number;
  now?: () => Date;
};

function slotMismatch(
  expected: ExpectedPayment,
  slot: ResolvedPaymentSlot,
): string | null {
  if (expected.sender !== slot.expectedPayerAddress) {
    return "The signer does not match the expected payer for this slot.";
  }
  if (expected.destination !== slot.destinationAddress) {
    return "The Xaman destination does not match the frozen bill destination.";
  }
  if (expected.amountDrops !== slot.expectedAmountDrops) {
    return "The Xaman amount does not match the frozen slot amount.";
  }
  if (expected.destinationTag !== slot.destinationTag) {
    return "The Xaman Destination Tag does not match the frozen bill.";
  }
  if (expected.invoiceId !== slot.invoiceId) {
    return "The Xaman InvoiceID does not match this payment slot.";
  }
  return null;
}

export async function verifyStoredSlotPayment(
  slot: ResolvedPaymentSlot,
  payloadId: string,
  dependencies: StoredSlotVerificationDependencies,
): Promise<PaymentVerificationOutcome> {
  const payload = await dependencies.getXamanPayload(payloadId);

  let expected: ExpectedPayment;
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

  const mismatch = slotMismatch(expected, slot);
  if (mismatch) {
    return {
      status: "failed",
      reason: "SLOT_EXPECTATION_MISMATCH",
      transactionId: expected.transactionId,
      message: mismatch,
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
        message:
          "The transaction is not available on a validated Testnet ledger yet.",
      };
    }
    throw error;
  }
}
