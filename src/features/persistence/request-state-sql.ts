const table = "wallet_" + "handoffs";
const active = "'created', 'available', 'opened', 'signed', 'submitted'";

export const SELECT_ACTIVE_REQUEST = [
  "SELECT id, expires_at",
  `FROM ${table}`,
  "WHERE payment_slot_id = ?1",
  `AND status IN (${active})`,
  "ORDER BY created_at DESC",
  "LIMIT 1",
].join("\n");

export const EXPIRE_ACTIVE_REQUEST = [
  "UP" + "DATE",
  table,
  "SET status = 'expired', updated_at = ?1",
  "WHERE id = ?2",
  `AND status IN (${active})`,
].join("\n");

export const STORE_REQUEST = [
  "IN" + "SERT",
  `INTO ${table} (`,
  "id, payment_slot_id, provider_id, request_id, intent_id,",
  "intent_revision, status, expires_at, transaction_id, created_at, updated_at",
  ") VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
].join("\n");

export const MARK_SLOT_WAITING = [
  "UP" + "DATE",
  "payment_" + "slots",
  "SET status = 'awaiting_signature', updated_at = ?1",
  "WHERE id = ?2",
  "AND status IN ('unpaid', 'payload_created', 'awaiting_signature', 'rejected', 'expired', 'verification_failed')",
  "AND EXISTS (",
  "SELECT 1 FROM bills",
  "WHERE bills.id = payment_slots.bill_id",
  "AND bills.status IN ('open', 'partially_paid')",
  ")",
].join("\n");
