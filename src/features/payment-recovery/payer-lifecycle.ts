import type { HelpTopicId } from "@/features/help/help-registry";
import type { AssetPaymentVerificationApiOutcome } from "@/features/payment-verification/asset-api-outcome";

export type PayerLifecycleKind =
  | "retry_safe"
  | "wait_recheck"
  | "setup_required"
  | "review_required"
  | "already_paid"
  | "terminal";

export type PayerLifecycleView = {
  kind: PayerLifecycleKind;
  code: string;
  diagnosticCode: string | null;
  retryAllowed: boolean;
  recheckAllowed: boolean;
  setupAllowed: boolean;
  replacementRule: "allowed" | "reconcile_first" | "blocked";
  helpTopic: HelpTopicId;
};

type RecoveryLike = {
  code: string;
  disposition:
    | "safe_retry"
    | "wait_recheck"
    | "setup_required"
    | "review_required"
    | "already_paid"
    | "terminal";
  replacementRule: "allowed" | "reconcile_first" | "blocked";
  canRecheck: boolean;
  requiresSetup: boolean;
};

function view(
  kind: PayerLifecycleKind,
  code: string,
  options: Partial<Omit<PayerLifecycleView, "kind" | "code">> = {},
): PayerLifecycleView {
  const retryAllowed = kind === "retry_safe";
  const recheckAllowed = kind === "wait_recheck";
  const setupAllowed = kind === "setup_required";
  return {
    kind,
    code,
    diagnosticCode: options.diagnosticCode ?? null,
    retryAllowed: options.retryAllowed ?? retryAllowed,
    recheckAllowed: options.recheckAllowed ?? recheckAllowed,
    setupAllowed: options.setupAllowed ?? setupAllowed,
    replacementRule:
      options.replacementRule ?? (retryAllowed ? "reconcile_first" : "blocked"),
    helpTopic:
      options.helpTopic ??
      (kind === "setup_required"
        ? "rlusd-readiness"
        : kind === "wait_recheck" || kind === "already_paid"
          ? "payment-status"
          : "safe-recovery"),
  };
}

export function payerLifecycleFromRecovery(
  recovery: RecoveryLike,
  diagnosticCode: string | null = null,
): PayerLifecycleView {
  const kind =
    recovery.disposition === "safe_retry"
      ? "retry_safe"
      : recovery.disposition === "wait_recheck"
        ? "wait_recheck"
        : recovery.disposition === "setup_required"
          ? "setup_required"
          : recovery.disposition === "review_required"
            ? "review_required"
            : recovery.disposition;
  return view(kind, recovery.code, {
    diagnosticCode,
    retryAllowed:
      kind === "retry_safe" && recovery.replacementRule !== "blocked",
    recheckAllowed: recovery.canRecheck,
    setupAllowed: recovery.requiresSetup,
    replacementRule: recovery.replacementRule,
  });
}

export function payerLifecycleFromProviderState(
  state: "rejected" | "expired",
): PayerLifecycleView {
  return view(
    "retry_safe",
    state === "rejected" ? "PAYER_CANCELLED" : "HANDOFF_EXPIRED",
    {
      diagnosticCode: state.toUpperCase(),
      replacementRule: "reconcile_first",
    },
  );
}

const REVIEW_FAILURES = new Set([
  "SLOT_EXPECTATION_MISMATCH",
  "HASH_MISMATCH",
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

export function payerLifecycleFromVerification(
  outcome: Exclude<AssetPaymentVerificationApiOutcome, { status: "verified" }>,
): PayerLifecycleView {
  if (outcome.recovery) {
    return payerLifecycleFromRecovery(outcome.recovery, outcome.reason);
  }
  if (outcome.status === "pending") {
    return view("wait_recheck", "TRANSACTION_PENDING", {
      diagnosticCode: outcome.reason,
      recheckAllowed: true,
    });
  }
  if (REVIEW_FAILURES.has(outcome.reason)) {
    return view("review_required", "PAYMENT_MISMATCH", {
      diagnosticCode: outcome.reason,
    });
  }
  if (outcome.reason === "TRANSACTION_FAILED") {
    return view("retry_safe", "TRANSACTION_FAILED", {
      diagnosticCode: outcome.reason,
      replacementRule: "reconcile_first",
    });
  }
  return view("terminal", "UNKNOWN_FAILURE", {
    diagnosticCode: outcome.reason,
  });
}

export function payerLifecycleFromApiError(
  code: string | null,
): PayerLifecycleView {
  switch (code) {
    case "SLOT_ALREADY_PAID":
      return view("already_paid", "DUPLICATE_PAYMENT", {
        diagnosticCode: code,
      });
    case "PAYMENT_REQUIRES_REVIEW":
      return view("review_required", "MULTIPLE_CANDIDATES", {
        diagnosticCode: code,
      });
    case "TRANSACTION_FAILED":
      return view("retry_safe", code, {
        diagnosticCode: code,
        replacementRule: "reconcile_first",
      });
    case "PAYMENT_RECONCILIATION_UNAVAILABLE":
    case "ACTIVE_HANDOFF_EXISTS":
      return view("wait_recheck", code, {
        diagnosticCode: code,
        recheckAllowed: true,
      });
    case "PAYMENT_READINESS_BLOCKED":
      return view("setup_required", "PAYMENT_READINESS_BLOCKED", {
        diagnosticCode: code,
        setupAllowed: true,
      });
    case "PAYMENT_READINESS_UNAVAILABLE":
    case "PAYMENT_SERVICE_UNAVAILABLE":
    case "WALLET_PROVIDER_ERROR":
      return view("wait_recheck", code, {
        diagnosticCode: code,
        recheckAllowed: true,
      });
    case "BILL_NOT_PAYABLE":
      return view("terminal", "BILL_CLOSED", {
        diagnosticCode: code,
      });
    default:
      return view("terminal", "UNKNOWN_FAILURE", {
        diagnosticCode: code,
      });
  }
}
