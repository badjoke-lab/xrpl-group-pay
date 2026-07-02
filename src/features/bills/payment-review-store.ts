import type { D1DatabaseLike } from "@/features/persistence/d1-types";

import type { ResolvedPaymentSlot } from "./payment-slot";
import { PaymentSlotSettlementDatabaseError } from "./settle-slot";

const MARK_SLOT_REVIEW = `
  UPDATE payment_slots
  SET
    status = 'needs_review',
    review_reason_code = ?1,
    review_details_json = ?2,
    updated_at = ?3
  WHERE id = ?4
    AND status <> 'paid'
`;

const MARK_BILL_REVIEW = `
  UPDATE bills
  SET status = 'needs_review', review_reason_code = ?1, updated_at = ?2
  WHERE id = ?3
    AND closure_state = 'active'
    AND status IN ('open', 'partially_paid', 'needs_review')
`;

export class PaymentReviewPersistenceError extends PaymentSlotSettlementDatabaseError {
  constructor() {
    super();
    this.name = "PaymentReviewPersistenceError";
  }
}

export type PaymentReviewObservation = {
  kind: "verification_mismatch" | "multiple_validated_matches";
  transactionId: string | null;
  transactionIds?: string[];
  reasonCode: string;
  message: string;
  reviewedLedgerMin?: number;
  reviewedLedgerMax?: number;
};

export async function markPaymentSlotNeedsReview(
  database: D1DatabaseLike,
  slot: ResolvedPaymentSlot,
  observation: PaymentReviewObservation,
  now = new Date(),
) {
  const timestamp = now.toISOString();
  const details = JSON.stringify({
    ...observation,
    transactionId: observation.transactionId?.toUpperCase() ?? null,
    ...(observation.transactionIds
      ? {
          transactionIds: [
            ...new Set(observation.transactionIds.map((id) => id.toUpperCase())),
          ].sort(),
        }
      : {}),
    observedAt: timestamp,
  });
  const statements = [
    database
      .prepare(MARK_SLOT_REVIEW)
      .bind(observation.reasonCode, details, timestamp, slot.slotId),
    database
      .prepare(MARK_BILL_REVIEW)
      .bind(observation.reasonCode, timestamp, slot.billId),
  ];

  try {
    const results = await database.batch(statements);
    if (
      results.length !== statements.length ||
      results.some((result) => !result.success) ||
      (results[0].meta?.changes ?? 0) !== 1 ||
      (results[1].meta?.changes ?? 0) !== 1
    ) {
      throw new PaymentReviewPersistenceError();
    }
  } catch (error) {
    if (error instanceof PaymentReviewPersistenceError) throw error;
    throw new PaymentReviewPersistenceError();
  }
}
