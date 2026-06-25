import { z } from "zod";

import { recordedPaymentReceiptSchema } from "@/features/persistence/types";
import { verifiedPaymentSchema } from "./verified-payment";

const transactionHashSchema = z.string().regex(/^[A-F0-9]{64}$/i);
const canonicalHashSchema = z.string().regex(/^[A-F0-9]{64}$/);
const dropsSchema = z.string().regex(/^(?:0|[1-9]\d*)$/);
const uint32Schema = z.number().int().min(0).max(4_294_967_295);

export const verificationPendingReasonSchema = z.enum([
  "HANDOFF_NOT_SUBMITTED",
  "XAMAN_NOT_RESOLVED",
  "TRANSACTION_NOT_FOUND",
  "TRANSACTION_NOT_VALIDATED",
  "VERIFICATION_UNAVAILABLE",
]);

export const verificationFailureReasonSchema = z.enum([
  "INVALID_PROVIDER_HANDOFF",
  "HANDOFF_FAILED",
  "UNSUPPORTED_VERIFICATION_STRATEGY",
  "INVALID_XAMAN_TEMPLATE",
  "SLOT_EXPECTATION_MISMATCH",
  "HASH_MISMATCH",
  "TRANSACTION_FAILED",
  "WRONG_TRANSACTION_TYPE",
  "WRONG_SENDER",
  "WRONG_DESTINATION",
  "NON_XRP_PAYMENT",
  "NON_ISSUED_PAYMENT",
  "ASSET_MISMATCH",
  "DELIVERED_ASSET_MISMATCH",
  "AMOUNT_MISMATCH",
  "DELIVERED_AMOUNT_MISMATCH",
  "PARTIAL_PAYMENT",
  "CROSS_CURRENCY_PAYMENT",
  "SOURCE_TAG_MISMATCH",
  "DESTINATION_TAG_MISMATCH",
  "INVOICE_ID_MISMATCH",
]);

export const ledgerVerificationProofSchema = z
  .object({
    network: z.literal("testnet"),
    transactionId: transactionHashSchema,
    ledgerIndex: z.number().int().nonnegative(),
    sender: z.string().min(1),
    destination: z.string().min(1),
    amountDrops: dropsSchema,
    deliveredAmountDrops: dropsSchema,
    sourceTag: uint32Schema,
    destinationTag: uint32Schema.nullable(),
    invoiceId: transactionHashSchema,
    idempotencyKey: z.string().regex(/^testnet:[A-F0-9]{64}$/i),
    verifiedAt: z.string().datetime(),
  })
  .strict();

const verifiedOutcomeSchema = z
  .object({
    status: z.literal("verified"),
    proof: ledgerVerificationProofSchema,
  })
  .strict();

const pendingOutcomeSchema = z
  .object({
    status: z.literal("pending"),
    reason: verificationPendingReasonSchema,
    transactionId: transactionHashSchema.nullable(),
    message: z.string().min(1),
  })
  .strict();

const failedOutcomeSchema = z
  .object({
    status: z.literal("failed"),
    reason: verificationFailureReasonSchema,
    transactionId: transactionHashSchema.nullable(),
    message: z.string().min(1),
  })
  .strict();

export const paymentVerificationOutcomeSchema = z.discriminatedUnion("status", [
  verifiedOutcomeSchema,
  pendingOutcomeSchema,
  failedOutcomeSchema,
]);

const recordedXrpVerifiedOutcomeSchema = z
  .object({
    status: z.literal("verified"),
    proof: ledgerVerificationProofSchema,
    receipt: recordedPaymentReceiptSchema,
  })
  .strict();

const recordedIssuedReceiptSchema = z
  .object({
    receiptId: z.string().min(1),
    status: z.enum(["recorded", "existing"]),
    network: z.enum(["testnet", "mainnet"]),
    transactionId: canonicalHashSchema,
    invoiceId: canonicalHashSchema,
    assetId: z.string().min(1),
    recordedAt: z.string().datetime(),
    verifiedPaymentDigest: canonicalHashSchema,
    legacyProofDigest: canonicalHashSchema.nullable(),
  })
  .strict();

const recordedIssuedVerifiedOutcomeSchema = z
  .object({
    status: z.literal("verified"),
    payment: verifiedPaymentSchema,
    receipt: recordedIssuedReceiptSchema,
  })
  .strict()
  .superRefine((outcome, context) => {
    if (outcome.payment.asset.assetType !== "issued") {
      context.addIssue({
        code: "custom",
        path: ["payment", "asset", "assetType"],
        message: "The generic endpoint outcome requires an issued Asset.",
      });
    }
    if (outcome.receipt.network !== outcome.payment.network) {
      context.addIssue({
        code: "custom",
        path: ["receipt", "network"],
        message: "Receipt and verified payment networks must match.",
      });
    }
    if (outcome.receipt.transactionId !== outcome.payment.transactionId) {
      context.addIssue({
        code: "custom",
        path: ["receipt", "transactionId"],
        message: "Receipt and verified payment transactions must match.",
      });
    }
    if (outcome.receipt.invoiceId !== outcome.payment.invoiceId) {
      context.addIssue({
        code: "custom",
        path: ["receipt", "invoiceId"],
        message: "Receipt and verified payment InvoiceIDs must match.",
      });
    }
    if (outcome.receipt.assetId !== outcome.payment.asset.id) {
      context.addIssue({
        code: "custom",
        path: ["receipt", "assetId"],
        message: "Receipt and verified payment Assets must match.",
      });
    }
  });

export const paymentVerificationApiOutcomeSchema = z.union([
  recordedXrpVerifiedOutcomeSchema,
  pendingOutcomeSchema,
  failedOutcomeSchema,
]);

export const assetPaymentVerificationApiOutcomeSchema = z.union([
  recordedXrpVerifiedOutcomeSchema,
  recordedIssuedVerifiedOutcomeSchema,
  pendingOutcomeSchema,
  failedOutcomeSchema,
]);

export type VerificationPendingReason = z.infer<
  typeof verificationPendingReasonSchema
>;
export type VerificationFailureReason = z.infer<
  typeof verificationFailureReasonSchema
>;
export type LedgerVerificationProof = z.infer<
  typeof ledgerVerificationProofSchema
>;
export type PaymentVerificationOutcome = z.infer<
  typeof paymentVerificationOutcomeSchema
>;
export type PaymentVerificationApiOutcome = z.infer<
  typeof paymentVerificationApiOutcomeSchema
>;
export type AssetPaymentVerificationApiOutcome = z.infer<
  typeof assetPaymentVerificationApiOutcomeSchema
>;
