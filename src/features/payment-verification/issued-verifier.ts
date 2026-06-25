import { z } from "zod";

import type { PaymentIntent } from "@/features/payment-intents/types";
import type { XrplTxResult } from "@/features/xrpl/schemas";

import type { AssetVerificationOutcome } from "./asset-outcome";
import { TF_PARTIAL_PAYMENT } from "./expected-payment";
import type { VerificationFailureReason } from "./types";
import {
  VERIFIED_PAYMENT_CONTRACT_VERSION,
  verifiedPaymentSchema,
} from "./verified-payment";
import {
  XrplIssuedValueError,
  xrplIssuedValueToUnits,
} from "./xrpl-issued-value";

const issuedAmountSchema = z
  .object({
    currency: z.string().regex(/^(?:.{3}|[A-Fa-f0-9]{40})$/),
    issuer: z.string().min(1),
    value: z.string().min(1),
  })
  .strict();

function failed(
  reason: VerificationFailureReason,
  transactionId: string,
  message: string,
): AssetVerificationOutcome {
  return { status: "failed", reason, transactionId, message };
}

function hasOwn(object: object, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeCurrency(currency: string) {
  return /^[A-Fa-f0-9]{40}$/.test(currency)
    ? currency.toUpperCase()
    : currency;
}

export function verifyIssuedPayment(
  intent: PaymentIntent,
  transactionId: string,
  transaction: XrplTxResult,
  now = new Date(),
): AssetVerificationOutcome {
  const normalizedTransactionId = transactionId.toUpperCase();
  const asset = intent.asset;

  if (asset.assetType !== "issued" || asset.issuer === null) {
    return failed(
      "UNSUPPORTED_VERIFICATION_STRATEGY",
      normalizedTransactionId,
      "The issued-asset verifier received an incompatible Asset.",
    );
  }

  if (!transaction.validated) {
    return {
      status: "pending",
      reason: "TRANSACTION_NOT_VALIDATED",
      transactionId: normalizedTransactionId,
      message: "The transaction exists but is not in a validated ledger yet.",
    };
  }

  if (transaction.hash.toUpperCase() !== normalizedTransactionId) {
    return failed(
      "HASH_MISMATCH",
      normalizedTransactionId,
      "The ledger transaction hash does not match the provider result.",
    );
  }

  if (transaction.meta.TransactionResult !== "tesSUCCESS") {
    return failed(
      "TRANSACTION_FAILED",
      normalizedTransactionId,
      "The validated transaction did not finish with tesSUCCESS.",
    );
  }

  const tx = transaction.tx_json;
  if (tx.TransactionType !== "Payment") {
    return failed(
      "WRONG_TRANSACTION_TYPE",
      normalizedTransactionId,
      "The validated transaction is not a Payment.",
    );
  }
  if (tx.Account !== intent.expectedPayer) {
    return failed(
      "WRONG_SENDER",
      normalizedTransactionId,
      "The validated sender does not match the expected payer.",
    );
  }
  if (tx.Destination !== intent.destination) {
    return failed(
      "WRONG_DESTINATION",
      normalizedTransactionId,
      "The validated destination does not match the Payment Intent.",
    );
  }
  if (((tx.Flags ?? 0) & TF_PARTIAL_PAYMENT) !== 0) {
    return failed(
      "PARTIAL_PAYMENT",
      normalizedTransactionId,
      "Partial Payments are not accepted.",
    );
  }
  if (tx.SendMax !== undefined || tx.Paths !== undefined) {
    return failed(
      "CROSS_CURRENCY_PAYMENT",
      normalizedTransactionId,
      "Cross-currency payment fields are not accepted.",
    );
  }

  const amountFields = [tx.DeliverMax, tx.Amount].filter(
    (value) => value !== undefined,
  );
  if (amountFields.length !== 1) {
    return failed(
      "NON_ISSUED_PAYMENT",
      normalizedTransactionId,
      "The validated Payment does not contain exactly one issued Amount.",
    );
  }

  const requested = issuedAmountSchema.safeParse(amountFields[0]);
  if (!requested.success) {
    return failed(
      "NON_ISSUED_PAYMENT",
      normalizedTransactionId,
      "The validated Payment amount is not an issued-currency object.",
    );
  }
  if (
    normalizeCurrency(requested.data.currency) !==
      normalizeCurrency(asset.currency) ||
    requested.data.issuer !== asset.issuer
  ) {
    return failed(
      "ASSET_MISMATCH",
      normalizedTransactionId,
      "The validated Payment currency or issuer does not match the Asset.",
    );
  }

  let requestedUnits: string;
  try {
    requestedUnits = xrplIssuedValueToUnits(
      requested.data.value,
      intent.amount.scale,
    );
  } catch (error) {
    if (error instanceof XrplIssuedValueError) {
      return failed(
        "AMOUNT_MISMATCH",
        normalizedTransactionId,
        error.message,
      );
    }
    throw error;
  }
  if (requestedUnits !== intent.amount.units) {
    return failed(
      "AMOUNT_MISMATCH",
      normalizedTransactionId,
      "The validated Payment amount does not match the Payment Intent.",
    );
  }

  const delivered = issuedAmountSchema.safeParse(
    transaction.meta.delivered_amount,
  );
  if (!delivered.success) {
    return failed(
      "NON_ISSUED_PAYMENT",
      normalizedTransactionId,
      "The delivered amount is not an issued-currency object.",
    );
  }
  if (
    normalizeCurrency(delivered.data.currency) !==
      normalizeCurrency(asset.currency) ||
    delivered.data.issuer !== asset.issuer
  ) {
    return failed(
      "DELIVERED_ASSET_MISMATCH",
      normalizedTransactionId,
      "The delivered currency or issuer does not match the Asset.",
    );
  }

  let deliveredUnits: string;
  try {
    deliveredUnits = xrplIssuedValueToUnits(
      delivered.data.value,
      intent.amount.scale,
    );
  } catch (error) {
    if (error instanceof XrplIssuedValueError) {
      return failed(
        "DELIVERED_AMOUNT_MISMATCH",
        normalizedTransactionId,
        error.message,
      );
    }
    throw error;
  }
  if (deliveredUnits !== intent.amount.units) {
    return failed(
      "DELIVERED_AMOUNT_MISMATCH",
      normalizedTransactionId,
      "The actual delivered amount does not match the Payment Intent.",
    );
  }

  if (tx.SourceTag !== intent.sourceTag) {
    return failed(
      "SOURCE_TAG_MISMATCH",
      normalizedTransactionId,
      "The validated Source Tag does not match the Payment Intent.",
    );
  }
  const ledgerHasDestinationTag = hasOwn(tx, "DestinationTag");
  if (
    (intent.destinationTag === null && ledgerHasDestinationTag) ||
    (intent.destinationTag !== null &&
      tx.DestinationTag !== intent.destinationTag)
  ) {
    return failed(
      "DESTINATION_TAG_MISMATCH",
      normalizedTransactionId,
      "The validated Destination Tag does not match the Payment Intent.",
    );
  }
  if (tx.InvoiceID?.toUpperCase() !== intent.invoiceId) {
    return failed(
      "INVOICE_ID_MISMATCH",
      normalizedTransactionId,
      "The validated InvoiceID does not match the Payment Intent.",
    );
  }

  const payment = verifiedPaymentSchema.parse({
    contractVersion: VERIFIED_PAYMENT_CONTRACT_VERSION,
    receiptContract: asset.receiptContract,
    network: intent.network,
    transactionId: normalizedTransactionId,
    ledgerIndex: transaction.ledger_index,
    sender: intent.expectedPayer,
    destination: intent.destination,
    asset,
    requestedAmount: intent.amount,
    deliveredAmount: {
      code: intent.amount.code,
      units: deliveredUnits,
      scale: intent.amount.scale,
    },
    sourceTag: intent.sourceTag,
    destinationTag: intent.destinationTag,
    invoiceId: intent.invoiceId,
    idempotencyKey: `${intent.network}:${normalizedTransactionId}`,
    verifiedAt: now.toISOString(),
  });

  return { status: "verified", payment, legacyProof: null };
}
