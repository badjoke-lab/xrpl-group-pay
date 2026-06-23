export const MARK_SLOT_PAID = `
  UPDATE payment_slots
  SET status = 'paid',
      paid_receipt_id = COALESCE(paid_receipt_id, ?1),
      paid_tx_hash = COALESCE(paid_tx_hash, ?2),
      paid_ledger_index = COALESCE(paid_ledger_index, ?3),
      paid_at = COALESCE(paid_at, ?4),
      updated_at = ?4
  WHERE id = ?5
    AND (paid_tx_hash IS NULL OR paid_tx_hash = ?2)
`;

export const RECOMPUTE_BILL = `
  UPDATE bills
  SET status = CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM payment_slots
          WHERE payment_slots.bill_id = bills.id
            AND payment_slots.status <> 'paid'
        ) THEN 'settled'
        WHEN EXISTS (
          SELECT 1 FROM payment_slots
          WHERE payment_slots.bill_id = bills.id
            AND payment_slots.status = 'paid'
        ) THEN 'partially_paid'
        ELSE 'open'
      END,
      updated_at = ?1
  WHERE id = ?2
`;
