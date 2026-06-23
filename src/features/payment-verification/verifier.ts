import type { ExpectedPayment } from "./expected-payment";
import { TF_PARTIAL_PAYMENT } from "./expected-payment";
import type {
  PaymentVerificationOutcome,
  VerificationFailureReason,
} from "./types";
import type { XrplTxResult } from "@/features/xrpl/schemas";

function failed(
  reason: VerificationFailureReason,
  transactionId: string,
  message: string,
): PaymentVerificationOutcome {
  return { status: "failed", reason, transactionId, message };
}

function hasOwn(object: object, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function verifyXrpPayment(
  expected: ExpectedPayment,
  transaction: XrplTxResult,
  now = new Date(),
): PaymentVerificationOutcome {
  const transactionId = expected.transactionId;

  if (!transaction.validated) {
    return {
      status: "pending",
      reason: "TRANSACTION_NOT_VALIDATED",
      transactionId,
      message: "The transaction exists but is not in a validated ledger yet.",
    };
  }

  if (transaction.hash.toUpperCase() !== transactionId) {
    return failed(
      "HASH_MISMATCH",
      transactionId,
      "The ledger transaction hash does not match the Xaman result.",
    );
  }

  if (transaction.meta.TransactionResult !== "tesSUCCESS") {
    return failed(
      "TRANSACTION_FAILED",
      transactionId,
      "The validated transaction did not finish with tesSUCCESS.",
    );
  }

  const tx = transaction.tx_json;
  if (tx.TransactionType !== "Payment") {
    return failed(
      "WRONG_TRANSACTION_TYPE",
      transactionId,
      "The validated transaction is not a Payment.",
    );
  }

  if (tx.Account !== expected.sender) {
    return failed(
      "WRONG_SENDER",
      transactionId,
      "The validated sender does not match the Xaman signer.",
    );
  }

  if (tx.Destination !== expected.destination) {
    return failed(
      "WRONG_DESTINATION",
      transactionId,
      "The validated destination does not match the Sign Request.",
    );
  }

  if (((tx.Flags ?? 0) & TF_PARTIAL_PAYMENT) !== 0) {
    return failed(
      "PARTIAL_PAYMENT",
      transactionId,
      "Partial Payments are not accepted.",
    );
  }

  if (tx.SendMax !== undefined || tx.Paths !== undefined) {
    return failed(
      "CROSS_CURRENCY_PAYMENT",
      transactionId,
      "Cross-currency payment fields are not accepted.",
    );
  }

  const amountFields = [tx.DeliverMax, tx.Amount].filter(
    (value) => value !== undefined,
  );
  if (amountFields.length !== 1 || typeof amountFields[0] !== "string") {
    return failed(
      "NON_XRP_PAYMENT",
      transactionId,
      "The validated Payment amount is not native XRP.",
    );
  }

  if (amountFields[0] !== expected.amountDrops) {
    return failed(
      "AMOUNT_MISMATCH",
      transactionId,
      "The validated Payment amount does not match the Sign Request.",
    );
  }

  if (typeof transaction.meta.delivered_amount !== "string") {
    return failed(
      "NON_XRP_PAYMENT",
      transactionId,
      "The delivered amount is not native XRP.",
    );
  }

  if (transaction.meta.delivered_amount !== expected.amountDrops) {
    return failed(
      "DELIVERED_AMOUNT_MISMATCH",
      transactionId,
      "The actual delivered XRP amount does not match the Sign Request.",
    );
  }

  if (tx.SourceTag !== expected.sourceTag) {
    return failed(
      "SOURCE_TAG_MISMATCH",
      transactionId,
      "The validated Source Tag does not match the Sign Request.",
    );
  }

  const ledgerHasDestinationTag = hasOwn(tx, "DestinationTag");
  if (
    (expected.destinationTag === null && ledgerHasDestinationTag) ||
    (expected.destinationTag !== null &&
      tx.DestinationTag !== expected.destinationTag)
  ) {
    return failed(
      "DESTINATION_TAG_MISMATCH",
      transactionId,
      "The validated Destination Tag does not match the Sign Request.",
    );
  }

  if (tx.InvoiceID?.toUpperCase() !== expected.invoiceId) {
    return failed(
      "INVOICE_ID_MISMATCH",
      transactionId,
      "The validated InvoiceID does not match the Sign Request.",
    );
  }

  return {
    status: "verified",
    proof: {
      network: "testnet",
      transactionId,
      ledgerIndex: transaction.ledger_index,
      sender: expected.sender,
      destination: expected.destination,
      amountDrops: expected.amountDrops,
      deliveredAmountDrops: transaction.meta.delivered_amount,
      sourceTag: expected.sourceTag,
      destinationTag: expected.destinationTag,
      invoiceId: expected.invoiceId,
      idempotencyKey: `testnet:${transactionId}`,
      verifiedAt: now.toISOString(),
    },
  };
}
