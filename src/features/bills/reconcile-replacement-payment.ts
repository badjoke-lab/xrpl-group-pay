import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import { dispatchAssetPaymentVerification } from "@/features/payment-verification/strategy";
import type { XrplTxResult } from "@/features/xrpl/schemas";
import {
  XrplAccountHistoryIncompleteError,
  XrplAccountHistoryUnavailableError,
  type AccountTransactionSearchResult,
} from "@/features/xrpl/account-transaction-client";

import {
  PaymentSlotStateError,
  type ResolvedPaymentSlot,
} from "./payment-slot";
import {
  markReconciliationNeedsReview,
  ReconciliationReviewPersistenceError,
} from "./reconciliation-review-store";
import { settleVerifiedIssuedPaymentSlot } from "./settle-issued-slot";
import { settleVerifiedPaymentSlot } from "./settle-slot";
import { buildStoredSlotPaymentIntent } from "./slot-payment-request";

export class PaymentReconciliationUnavailableError extends Error {
  readonly code = "PAYMENT_RECONCILIATION_UNAVAILABLE" as const;

  constructor(message = "Validated payment history could not be reconciled safely.") {
    super(message);
    this.name = "PaymentReconciliationUnavailableError";
  }
}

export class PaymentReconciliationReviewRequiredError extends Error {
  readonly code = "PAYMENT_REQUIRES_REVIEW" as const;

  constructor(readonly matchCount: number) {
    super(
      "Multiple validated payments match this PaymentSlot. No replacement request was created.",
    );
    this.name = "PaymentReconciliationReviewRequiredError";
  }
}

export type ReplacementPaymentReconciliationDependencies = {
  sourceTag: number;
  findTransactions(
    account: string,
    invoiceId: string,
  ): Promise<AccountTransactionSearchResult>;
  settleXrp?: typeof settleVerifiedPaymentSlot;
  settleIssued?: typeof settleVerifiedIssuedPaymentSlot;
  markNeedsReview?: typeof markReconciliationNeedsReview;
  now?: () => Date;
};

function uniqueTransactions(transactions: XrplTxResult[]) {
  const unique = new Map<string, XrplTxResult>();
  for (const transaction of transactions) {
    unique.set(transaction.hash.toUpperCase(), transaction);
  }
  return [...unique.values()];
}

export async function reconcileReplacementPayment(
  database: D1DatabaseLike,
  slot: ResolvedPaymentSlot,
  dependencies: ReplacementPaymentReconciliationDependencies,
): Promise<void> {
  const now = dependencies.now?.() ?? new Date();
  let search: AccountTransactionSearchResult;

  try {
    search = await dependencies.findTransactions(
      slot.expectedPayerAddress,
      slot.invoiceId,
    );
  } catch (error) {
    if (
      error instanceof XrplAccountHistoryUnavailableError ||
      error instanceof XrplAccountHistoryIncompleteError
    ) {
      throw new PaymentReconciliationUnavailableError(error.message);
    }
    throw error;
  }

  const intent = buildStoredSlotPaymentIntent(slot, dependencies.sourceTag, now);
  const verified = uniqueTransactions(search.transactions)
    .map((transaction) =>
      dispatchAssetPaymentVerification(
        intent,
        transaction.hash,
        transaction,
        now,
      ),
    )
    .filter((outcome) => outcome.status === "verified");

  if (verified.length === 0) return;

  if (verified.length === 1) {
    const [outcome] = verified;
    if (outcome.legacyProof !== null) {
      await (dependencies.settleXrp ?? settleVerifiedPaymentSlot)(
        database,
        slot,
        outcome.legacyProof,
      );
    } else {
      await (dependencies.settleIssued ?? settleVerifiedIssuedPaymentSlot)(
        database,
        slot,
        outcome.payment,
      );
    }

    throw new PaymentSlotStateError(
      "SLOT_ALREADY_PAID",
      "A validated payment already satisfies this PaymentSlot. No replacement request was created.",
    );
  }

  const transactionIds = verified.map((outcome) =>
    outcome.payment.transactionId.toUpperCase(),
  );

  try {
    await (dependencies.markNeedsReview ?? markReconciliationNeedsReview)(
      database,
      slot,
      {
        transactionIds,
        reviewedLedgerMin: search.reviewedLedgerMin,
        reviewedLedgerMax: search.reviewedLedgerMax,
        now,
      },
    );
  } catch (error) {
    if (error instanceof ReconciliationReviewPersistenceError) {
      throw new PaymentReconciliationUnavailableError(error.message);
    }
    throw error;
  }

  throw new PaymentReconciliationReviewRequiredError(transactionIds.length);
}
