import type { PaymentRecoveryAssessment } from "./taxonomy";

export function unknownPaymentRecovery(): PaymentRecoveryAssessment {
  return {
    code: "UNKNOWN_FAILURE",
    disposition: "review_required",
    replacementRule: "blocked",
    canRecheck: false,
    requiresSetup: false,
    requiresReview: true,
    reasonKey: "unknownFailure",
    titleKey: "recovery.disposition.review_required.title",
    bodyKey: "recovery.reason.unknownFailure",
    actionKey: null,
  };
}
