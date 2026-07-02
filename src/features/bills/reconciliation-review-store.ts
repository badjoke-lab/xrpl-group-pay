import type { D1DatabaseLike } from "@/features/persistence/d1-types";

import type { ResolvedPaymentSlot } from "./payment-slot";

const INSERT_FINDING = `
  INSERT INTO payment_reconciliation_findings (
    id,
    payment_slot_id,
    bill_id,
    finding_type,
    match_count,
    transaction_ids_json,
    reviewed_ledger_min,
    reviewed_ledger_max,
    created_at
  ) VALUES (?1, ?2, ?3, 'multiple_validated_matches', ?4, ?5, ?6, ?7, ?8)
`;

const MARK_SLOT_NEEDS_REVIEW = `
  UPDATE payment_slots
  SET
    status = 'needs_review',
    review_reason_code = 'MULTIPLE_VALIDATED_MATCHES',
    review_details_json = ?1,
    updated_at = ?2
  WHERE id = ?3
    AND status <> 'paid'
`;

const MARK_BILL_NEEDS_REVIEW = `
  UPDATE bills
  SET
    status = 'needs_review',
    review_reason_code = 'MULTIPLE_VALIDATED_MATCHES',
    review_details_json = ?1,
    updated_at = ?2
  WHERE id = ?3
    AND closure_state = 'active'
    AND status IN ('open', 'partially_paid', 'needs_review')
`;

export class ReconciliationReviewPersistenceError extends Error {
  constructor() {
    super("The reconciliation review state could not be persisted.");
    this.name = "ReconciliationReviewPersistenceError";
  }
}

export async function markReconciliationNeedsReview(
  database: D1DatabaseLike,
  slot: ResolvedPaymentSlot,
  input: {
    transactionIds: string[];
    reviewedLedgerMin: number;
    reviewedLedgerMax: number;
    now: Date;
  },
) {
  const transactionIds = [
    ...new Set(input.transactionIds.map((id) => id.toUpperCase())),
  ].sort();
  if (transactionIds.length < 2) {
    throw new ReconciliationReviewPersistenceError();
  }

  const now = input.now.toISOString();
  const transactionIdsJson = JSON.stringify(transactionIds);
  const reviewDetailsJson = JSON.stringify({
    kind: "multiple_validated_matches",
    transactionId: null,
    transactionIds,
    reasonCode: "MULTIPLE_VALIDATED_MATCHES",
    message:
      "Multiple validated transactions match the frozen PaymentSlot. Review is required before any replacement request.",
    reviewedLedgerMin: input.reviewedLedgerMin,
    reviewedLedgerMax: input.reviewedLedgerMax,
    observedAt: now,
  });
  const statements = [
    database
      .prepare(INSERT_FINDING)
      .bind(
        crypto.randomUUID(),
        slot.slotId,
        slot.billId,
        transactionIds.length,
        transactionIdsJson,
        input.reviewedLedgerMin,
        input.reviewedLedgerMax,
        now,
      ),
    database
      .prepare(MARK_SLOT_NEEDS_REVIEW)
      .bind(reviewDetailsJson, now, slot.slotId),
    database
      .prepare(MARK_BILL_NEEDS_REVIEW)
      .bind(reviewDetailsJson, now, slot.billId),
  ];

  try {
    const results = await database.batch(statements);
    if (
      results.length !== statements.length ||
      results.some((result) => !result.success) ||
      (results[0].meta?.changes ?? 0) !== 1 ||
      (results[1].meta?.changes ?? 0) !== 1 ||
      (results[2].meta?.changes ?? 0) !== 1
    ) {
      throw new ReconciliationReviewPersistenceError();
    }
  } catch (error) {
    if (error instanceof ReconciliationReviewPersistenceError) throw error;
    throw new ReconciliationReviewPersistenceError();
  }
}
