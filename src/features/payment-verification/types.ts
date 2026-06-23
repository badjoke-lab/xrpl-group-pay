import { z } from "zod";

import { recordedPaymentReceiptSchema } from "@/features/persistence/types";

const transactionHashSchema = z.string().regex(/^[A-F0-9]{64}$/i);
const dropsSchema = z.string().regex(/^(?:0|[1-9]\d*)$/);
const uint32Schema = z.number().int().min(0).max(4_294_967_295);

export const verificationPendingReasonSchema = z.enum([
  "XAMAN_NOT_RESOLVED",
  "TRANSACTION_NOT_FOUND",
  "TRANSACTION_NOT_VALIDATED",
  "VERIFICATION_UNAVAILABLE",
]);

export const verificationFailureReasonSchema = z.enum([
  "INVALID_XAMAN_TEMPLATE",
  "HASH_MISMATCH",
  "TRANSACTION_FAILED",
  "WRONG_TRANSACTION_TYPE",
  "WRONG_SENDER",
  "WRONG_DESTINATION",
  "NON_XRP_PAYMENT",
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

const recordedVerifiedOutcomeSchema = z
  .object({
    status: z.literal("verified"),
    proof: ledgerVerificationProofSchema,
    receipt: recordedPaymentReceiptSchema,
  })
  .strict();

export const paymentVerificationApiOutcomeSchema = z.discriminatedUnion(
  "status",
  [recordedVerifiedOutcomeSchema, pendingOutcomeSchema, failedOutcomeSchema],
);

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
