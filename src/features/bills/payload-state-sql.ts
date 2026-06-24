export const MARK_AWAITING_SIGNATURE = [
  "UPDATE payment_slots",
  "SET " + "status = 'awaiting_signature', updated_at = ?1",
  "WHERE id = ?2",
  "AND status IN ('unpaid', 'payload_created', 'awaiting_signature', 'rejected', 'expired', 'verification_failed')",
  "AND EXISTS (",
  "SELECT 1 FROM bills",
  "WHERE bills.id = payment_slots.bill_id",
  "AND bills.status IN ('open', 'partially_paid')",
  ")",
].join("\n");
