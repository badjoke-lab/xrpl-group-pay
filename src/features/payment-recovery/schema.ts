import { z } from "zod";

import type { PaymentRecoveryAssessment } from "./taxonomy";

export const paymentRecoveryDispositionSchema = z.enum([
  "safe_retry",
  "wait_recheck",
  "setup_required",
  "review_required",
  "already_paid",
  "terminal",
]);

export const replacementRuleSchema = z.enum([
  "allowed",
  "reconcile_first",
  "blocked",
]);

export const paymentRecoveryCodeSchema = z.enum([
  "PAYER_CANCELLED",
  "HANDOFF_EXPIRED",
  "HANDOFF_PROVIDER_FAILED",
  "PROVIDER_TEMPORARILY_UNAVAILABLE",
  "LEDGER_TEMPORARILY_UNAVAILABLE",
  "TRANSACTION_PENDING",
  "TRANSACTION_FAILED",
  "INVALID_PROVIDER_HANDOFF",
  "UNSUPPORTED_VERIFICATION",
  "PAYMENT_MISMATCH",
  "WRONG_SIGNER",
  "WRONG_DESTINATION",
  "WRONG_AMOUNT",
  "WRONG_ASSET",
  "WRONG_TAGS",
  "WRONG_INVOICE",
  "PARTIAL_PAYMENT",
  "CROSS_CURRENCY_PAYMENT",
  "ACCOUNT_NOT_FOUND",
  "DESTINATION_TAG_REQUIRED",
  "DEPOSIT_AUTHORIZATION_REQUIRED",
  "TRUST_LINE_MISSING",
  "TRUST_LINE_LIMIT_INSUFFICIENT",
  "TRUST_LINE_FROZEN",
  "TRUST_LINE_NOT_AUTHORIZED",
  "ISSUER_UNAVAILABLE",
  "ISSUER_GLOBAL_FREEZE",
  "INSUFFICIENT_RLUSD",
  "INSUFFICIENT_SPENDABLE_XRP",
  "TRUST_LINE_DATA_INVALID",
  "DUPLICATE_PAYMENT",
  "MULTIPLE_CANDIDATES",
  "ACTIVE_HANDOFF_EXISTS",
  "BILL_CLOSED",
  "UNKNOWN_FAILURE",
]);

export const paymentRecoveryReasonKeySchema = z.enum([
  "payerCancelled",
  "handoffExpired",
  "handoffProviderFailed",
  "providerUnavailable",
  "ledgerUnavailable",
  "transactionPending",
  "transactionFailed",
  "invalidProviderHandoff",
  "unsupportedVerification",
  "paymentMismatch",
  "wrongSigner",
  "wrongDestination",
  "wrongAmount",
  "wrongAsset",
  "wrongTags",
  "wrongInvoice",
  "partialPayment",
  "crossCurrencyPayment",
  "accountNotFound",
  "destinationTagRequired",
  "depositAuthorizationRequired",
  "trustLineMissing",
  "trustLineLimitInsufficient",
  "trustLineFrozen",
  "trustLineNotAuthorized",
  "issuerUnavailable",
  "issuerGlobalFreeze",
  "insufficientRlusd",
  "insufficientSpendableXrp",
  "trustLineDataInvalid",
  "duplicatePayment",
  "multipleCandidates",
  "activeHandoffExists",
  "billClosed",
  "unknownFailure",
]);

export const paymentRecoveryAssessmentSchema: z.ZodType<PaymentRecoveryAssessment> = z
  .object({
    code: paymentRecoveryCodeSchema,
    disposition: paymentRecoveryDispositionSchema,
    replacementRule: replacementRuleSchema,
    canRecheck: z.boolean(),
    requiresSetup: z.boolean(),
    requiresReview: z.boolean(),
    reasonKey: paymentRecoveryReasonKeySchema,
    titleKey: z.string().regex(/^recovery\.disposition\.[a-z_]+\.title$/),
    bodyKey: z.string().regex(/^recovery\.reason\.[A-Za-z]+$/),
    actionKey: z
      .string()
      .regex(/^recovery\.disposition\.[a-z_]+\.action$/)
      .nullable(),
  })
  .strict();
