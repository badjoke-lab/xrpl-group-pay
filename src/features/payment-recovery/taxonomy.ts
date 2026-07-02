import type {
  VerificationFailureReason,
  VerificationPendingReason,
} from "@/features/payment-verification/types";
import type { PayerReadinessBlockReason } from "@/features/xrpl/payer-readiness";
import type { RecipientReadinessBlockReason } from "@/features/xrpl/recipient-readiness";

export type PaymentRecoveryDisposition =
  | "safe_retry"
  | "wait_recheck"
  | "setup_required"
  | "review_required"
  | "already_paid"
  | "terminal";

export type ReplacementRule =
  | "allowed"
  | "reconcile_first"
  | "blocked";

export type PaymentRecoveryCode =
  | "PAYER_CANCELLED"
  | "HANDOFF_EXPIRED"
  | "HANDOFF_PROVIDER_FAILED"
  | "PROVIDER_TEMPORARILY_UNAVAILABLE"
  | "LEDGER_TEMPORARILY_UNAVAILABLE"
  | "TRANSACTION_PENDING"
  | "TRANSACTION_FAILED"
  | "INVALID_PROVIDER_HANDOFF"
  | "UNSUPPORTED_VERIFICATION"
  | "PAYMENT_MISMATCH"
  | "WRONG_SIGNER"
  | "WRONG_DESTINATION"
  | "WRONG_AMOUNT"
  | "WRONG_ASSET"
  | "WRONG_TAGS"
  | "WRONG_INVOICE"
  | "PARTIAL_PAYMENT"
  | "CROSS_CURRENCY_PAYMENT"
  | "ACCOUNT_NOT_FOUND"
  | "DESTINATION_TAG_REQUIRED"
  | "DEPOSIT_AUTHORIZATION_REQUIRED"
  | "TRUST_LINE_MISSING"
  | "TRUST_LINE_LIMIT_INSUFFICIENT"
  | "TRUST_LINE_FROZEN"
  | "TRUST_LINE_NOT_AUTHORIZED"
  | "ISSUER_UNAVAILABLE"
  | "ISSUER_GLOBAL_FREEZE"
  | "INSUFFICIENT_RLUSD"
  | "INSUFFICIENT_SPENDABLE_XRP"
  | "TRUST_LINE_DATA_INVALID"
  | "DUPLICATE_PAYMENT"
  | "MULTIPLE_CANDIDATES"
  | "ACTIVE_HANDOFF_EXISTS"
  | "BILL_CLOSED"
  | "UNKNOWN_FAILURE";

export type PaymentRecoveryReasonKey =
  | "payerCancelled"
  | "handoffExpired"
  | "handoffProviderFailed"
  | "providerUnavailable"
  | "ledgerUnavailable"
  | "transactionPending"
  | "transactionFailed"
  | "invalidProviderHandoff"
  | "unsupportedVerification"
  | "paymentMismatch"
  | "wrongSigner"
  | "wrongDestination"
  | "wrongAmount"
  | "wrongAsset"
  | "wrongTags"
  | "wrongInvoice"
  | "partialPayment"
  | "crossCurrencyPayment"
  | "accountNotFound"
  | "destinationTagRequired"
  | "depositAuthorizationRequired"
  | "trustLineMissing"
  | "trustLineLimitInsufficient"
  | "trustLineFrozen"
  | "trustLineNotAuthorized"
  | "issuerUnavailable"
  | "issuerGlobalFreeze"
  | "insufficientRlusd"
  | "insufficientSpendableXrp"
  | "trustLineDataInvalid"
  | "duplicatePayment"
  | "multipleCandidates"
  | "activeHandoffExists"
  | "billClosed"
  | "unknownFailure";

export type PaymentRecoveryAssessment = {
  code: PaymentRecoveryCode;
  disposition: PaymentRecoveryDisposition;
  replacementRule: ReplacementRule;
  canRecheck: boolean;
  requiresSetup: boolean;
  requiresReview: boolean;
  reasonKey: PaymentRecoveryReasonKey;
  titleKey: `recovery.disposition.${PaymentRecoveryDisposition}.title`;
  bodyKey: `recovery.reason.${PaymentRecoveryReasonKey}`;
  actionKey:
    | `recovery.disposition.${PaymentRecoveryDisposition}.action`
    | null;
};

export type PaymentRecoverySignal =
  | {
      source: "provider";
      status: "rejected" | "expired" | "failed";
      transactionId?: string | null;
    }
  | {
      source: "verification_pending";
      reason: VerificationPendingReason;
      transactionId?: string | null;
    }
  | {
      source: "verification_failed";
      reason: VerificationFailureReason;
      transactionId?: string | null;
    }
  | {
      source: "readiness";
      role: "payer";
      reason: PayerReadinessBlockReason | "validated_ledger_data_unavailable";
    }
  | {
      source: "readiness";
      role: "recipient";
      reason:
        | RecipientReadinessBlockReason
        | "validated_ledger_data_unavailable";
    }
  | {
      source: "slot";
      code:
        | "SLOT_ALREADY_PAID"
        | "BILL_CLOSED"
        | "ACTIVE_HANDOFF_EXISTS";
    }
  | {
      source: "reconciliation";
      code:
        | "PAYMENT_REQUIRES_REVIEW"
        | "PAYMENT_RECONCILIATION_UNAVAILABLE"
        | "DUPLICATE_PAYMENT"
        | "MULTIPLE_PAYMENT_CANDIDATES";
    };

type PolicyInput = {
  code: PaymentRecoveryCode;
  disposition: PaymentRecoveryDisposition;
  replacementRule?: ReplacementRule;
  reasonKey: PaymentRecoveryReasonKey;
};

function policy(input: PolicyInput): PaymentRecoveryAssessment {
  const actionKey =
    input.disposition === "review_required" ||
    input.disposition === "already_paid" ||
    input.disposition === "terminal"
      ? null
      : (`recovery.disposition.${input.disposition}.action` as const);

  return {
    code: input.code,
    disposition: input.disposition,
    replacementRule: input.replacementRule ?? "blocked",
    canRecheck: input.disposition === "wait_recheck",
    requiresSetup: input.disposition === "setup_required",
    requiresReview: input.disposition === "review_required",
    reasonKey: input.reasonKey,
    titleKey: `recovery.disposition.${input.disposition}.title`,
    bodyKey: `recovery.reason.${input.reasonKey}`,
    actionKey,
  };
}

function uncertainTerminalHandoff(
  code: "PAYER_CANCELLED" | "HANDOFF_EXPIRED",
  reasonKey: "payerCancelled" | "handoffExpired",
  transactionId: string | null | undefined,
) {
  if (transactionId) {
    return policy({
      code: "INVALID_PROVIDER_HANDOFF",
      disposition: "review_required",
      reasonKey: "invalidProviderHandoff",
    });
  }
  return policy({
    code,
    disposition: "safe_retry",
    replacementRule: "reconcile_first",
    reasonKey,
  });
}

function classifyPending(
  reason: VerificationPendingReason,
): PaymentRecoveryAssessment {
  switch (reason) {
    case "HANDOFF_NOT_SUBMITTED":
    case "XAMAN_NOT_RESOLVED":
      return policy({
        code: "TRANSACTION_PENDING",
        disposition: "wait_recheck",
        reasonKey: "transactionPending",
      });
    case "TRANSACTION_NOT_FOUND":
    case "TRANSACTION_NOT_VALIDATED":
      return policy({
        code: "TRANSACTION_PENDING",
        disposition: "wait_recheck",
        reasonKey: "transactionPending",
      });
    case "VERIFICATION_UNAVAILABLE":
      return policy({
        code: "LEDGER_TEMPORARILY_UNAVAILABLE",
        disposition: "wait_recheck",
        reasonKey: "ledgerUnavailable",
      });
  }
}

function classifyFailure(
  reason: VerificationFailureReason,
  transactionId: string | null | undefined,
): PaymentRecoveryAssessment {
  switch (reason) {
    case "HANDOFF_REJECTED":
      return uncertainTerminalHandoff(
        "PAYER_CANCELLED",
        "payerCancelled",
        transactionId,
      );
    case "HANDOFF_EXPIRED":
      return uncertainTerminalHandoff(
        "HANDOFF_EXPIRED",
        "handoffExpired",
        transactionId,
      );
    case "HANDOFF_PROVIDER_FAILED":
      return policy({
        code: "HANDOFF_PROVIDER_FAILED",
        disposition: transactionId ? "review_required" : "wait_recheck",
        reasonKey: transactionId
          ? "invalidProviderHandoff"
          : "handoffProviderFailed",
      });
    case "HANDOFF_FAILED":
    case "INVALID_PROVIDER_HANDOFF":
      return policy({
        code: "INVALID_PROVIDER_HANDOFF",
        disposition: "review_required",
        reasonKey: "invalidProviderHandoff",
      });
    case "UNSUPPORTED_VERIFICATION_STRATEGY":
      return policy({
        code: "UNSUPPORTED_VERIFICATION",
        disposition: "terminal",
        reasonKey: "unsupportedVerification",
      });
    case "TRANSACTION_FAILED":
      return policy({
        code: "TRANSACTION_FAILED",
        disposition: "safe_retry",
        replacementRule: "reconcile_first",
        reasonKey: "transactionFailed",
      });
    case "WRONG_SENDER":
      return policy({
        code: "WRONG_SIGNER",
        disposition: "review_required",
        reasonKey: "wrongSigner",
      });
    case "WRONG_DESTINATION":
      return policy({
        code: "WRONG_DESTINATION",
        disposition: "review_required",
        reasonKey: "wrongDestination",
      });
    case "AMOUNT_MISMATCH":
    case "DELIVERED_AMOUNT_MISMATCH":
      return policy({
        code: "WRONG_AMOUNT",
        disposition: "review_required",
        reasonKey: "wrongAmount",
      });
    case "NON_XRP_PAYMENT":
    case "NON_ISSUED_PAYMENT":
    case "ASSET_MISMATCH":
    case "DELIVERED_ASSET_MISMATCH":
      return policy({
        code: "WRONG_ASSET",
        disposition: "review_required",
        reasonKey: "wrongAsset",
      });
    case "SOURCE_TAG_MISMATCH":
    case "DESTINATION_TAG_MISMATCH":
      return policy({
        code: "WRONG_TAGS",
        disposition: "review_required",
        reasonKey: "wrongTags",
      });
    case "INVOICE_ID_MISMATCH":
      return policy({
        code: "WRONG_INVOICE",
        disposition: "review_required",
        reasonKey: "wrongInvoice",
      });
    case "PARTIAL_PAYMENT":
      return policy({
        code: "PARTIAL_PAYMENT",
        disposition: "review_required",
        reasonKey: "partialPayment",
      });
    case "CROSS_CURRENCY_PAYMENT":
      return policy({
        code: "CROSS_CURRENCY_PAYMENT",
        disposition: "review_required",
        reasonKey: "crossCurrencyPayment",
      });
    case "INVALID_XAMAN_TEMPLATE":
    case "SLOT_EXPECTATION_MISMATCH":
    case "HASH_MISMATCH":
    case "WRONG_TRANSACTION_TYPE":
      return policy({
        code: "PAYMENT_MISMATCH",
        disposition: "review_required",
        reasonKey: "paymentMismatch",
      });
  }
}

function classifyPayerReadiness(
  reason: PayerReadinessBlockReason | "validated_ledger_data_unavailable",
): PaymentRecoveryAssessment {
  switch (reason) {
    case "validated_ledger_data_unavailable":
      return policy({
        code: "LEDGER_TEMPORARILY_UNAVAILABLE",
        disposition: "wait_recheck",
        reasonKey: "ledgerUnavailable",
      });
    case "account_not_found":
      return policy({
        code: "ACCOUNT_NOT_FOUND",
        disposition: "setup_required",
        reasonKey: "accountNotFound",
      });
    case "insufficient_spendable_xrp":
      return policy({
        code: "INSUFFICIENT_SPENDABLE_XRP",
        disposition: "setup_required",
        reasonKey: "insufficientSpendableXrp",
      });
    case "issuer_not_found":
      return policy({
        code: "ISSUER_UNAVAILABLE",
        disposition: "terminal",
        reasonKey: "issuerUnavailable",
      });
    case "issuer_global_freeze":
      return policy({
        code: "ISSUER_GLOBAL_FREEZE",
        disposition: "terminal",
        reasonKey: "issuerGlobalFreeze",
      });
    case "trust_line_missing":
      return policy({
        code: "TRUST_LINE_MISSING",
        disposition: "setup_required",
        reasonKey: "trustLineMissing",
      });
    case "trust_line_frozen":
      return policy({
        code: "TRUST_LINE_FROZEN",
        disposition: "terminal",
        reasonKey: "trustLineFrozen",
      });
    case "trust_line_not_authorized":
      return policy({
        code: "TRUST_LINE_NOT_AUTHORIZED",
        disposition: "setup_required",
        reasonKey: "trustLineNotAuthorized",
      });
    case "issued_balance_insufficient":
      return policy({
        code: "INSUFFICIENT_RLUSD",
        disposition: "setup_required",
        reasonKey: "insufficientRlusd",
      });
    case "trust_line_data_invalid":
      return policy({
        code: "TRUST_LINE_DATA_INVALID",
        disposition: "review_required",
        reasonKey: "trustLineDataInvalid",
      });
  }
}

function classifyRecipientReadiness(
  reason:
    | RecipientReadinessBlockReason
    | "validated_ledger_data_unavailable",
): PaymentRecoveryAssessment {
  switch (reason) {
    case "validated_ledger_data_unavailable":
      return policy({
        code: "LEDGER_TEMPORARILY_UNAVAILABLE",
        disposition: "wait_recheck",
        reasonKey: "ledgerUnavailable",
      });
    case "account_not_found":
      return policy({
        code: "ACCOUNT_NOT_FOUND",
        disposition: "setup_required",
        reasonKey: "accountNotFound",
      });
    case "destination_tag_required":
      return policy({
        code: "DESTINATION_TAG_REQUIRED",
        disposition: "setup_required",
        reasonKey: "destinationTagRequired",
      });
    case "deposit_authorization_required":
      return policy({
        code: "DEPOSIT_AUTHORIZATION_REQUIRED",
        disposition: "setup_required",
        reasonKey: "depositAuthorizationRequired",
      });
    case "issuer_not_found":
      return policy({
        code: "ISSUER_UNAVAILABLE",
        disposition: "terminal",
        reasonKey: "issuerUnavailable",
      });
    case "issuer_global_freeze":
      return policy({
        code: "ISSUER_GLOBAL_FREEZE",
        disposition: "terminal",
        reasonKey: "issuerGlobalFreeze",
      });
    case "trust_line_missing":
      return policy({
        code: "TRUST_LINE_MISSING",
        disposition: "setup_required",
        reasonKey: "trustLineMissing",
      });
    case "trust_line_frozen":
      return policy({
        code: "TRUST_LINE_FROZEN",
        disposition: "terminal",
        reasonKey: "trustLineFrozen",
      });
    case "trust_line_not_authorized":
      return policy({
        code: "TRUST_LINE_NOT_AUTHORIZED",
        disposition: "setup_required",
        reasonKey: "trustLineNotAuthorized",
      });
    case "trust_line_limit_insufficient":
      return policy({
        code: "TRUST_LINE_LIMIT_INSUFFICIENT",
        disposition: "setup_required",
        reasonKey: "trustLineLimitInsufficient",
      });
    case "trust_line_data_invalid":
      return policy({
        code: "TRUST_LINE_DATA_INVALID",
        disposition: "review_required",
        reasonKey: "trustLineDataInvalid",
      });
  }
}

export function classifyPaymentRecovery(
  signal: PaymentRecoverySignal,
): PaymentRecoveryAssessment {
  switch (signal.source) {
    case "provider":
      if (signal.status === "rejected") {
        return uncertainTerminalHandoff(
          "PAYER_CANCELLED",
          "payerCancelled",
          signal.transactionId,
        );
      }
      if (signal.status === "expired") {
        return uncertainTerminalHandoff(
          "HANDOFF_EXPIRED",
          "handoffExpired",
          signal.transactionId,
        );
      }
      return policy({
        code: "HANDOFF_PROVIDER_FAILED",
        disposition: signal.transactionId
          ? "review_required"
          : "wait_recheck",
        reasonKey: signal.transactionId
          ? "invalidProviderHandoff"
          : "handoffProviderFailed",
      });
    case "verification_pending":
      return classifyPending(signal.reason);
    case "verification_failed":
      return classifyFailure(signal.reason, signal.transactionId);
    case "readiness":
      return signal.role === "payer"
        ? classifyPayerReadiness(signal.reason)
        : classifyRecipientReadiness(signal.reason);
    case "slot":
      if (signal.code === "SLOT_ALREADY_PAID") {
        return policy({
          code: "DUPLICATE_PAYMENT",
          disposition: "already_paid",
          reasonKey: "duplicatePayment",
        });
      }
      if (signal.code === "ACTIVE_HANDOFF_EXISTS") {
        return policy({
          code: "ACTIVE_HANDOFF_EXISTS",
          disposition: "wait_recheck",
          reasonKey: "activeHandoffExists",
        });
      }
      return policy({
        code: "BILL_CLOSED",
        disposition: "terminal",
        reasonKey: "billClosed",
      });
    case "reconciliation":
      if (signal.code === "PAYMENT_RECONCILIATION_UNAVAILABLE") {
        return policy({
          code: "LEDGER_TEMPORARILY_UNAVAILABLE",
          disposition: "wait_recheck",
          reasonKey: "ledgerUnavailable",
        });
      }
      if (signal.code === "DUPLICATE_PAYMENT") {
        return policy({
          code: "DUPLICATE_PAYMENT",
          disposition: "already_paid",
          reasonKey: "duplicatePayment",
        });
      }
      return policy({
        code: "MULTIPLE_CANDIDATES",
        disposition: "review_required",
        reasonKey: "multipleCandidates",
      });
  }
}
