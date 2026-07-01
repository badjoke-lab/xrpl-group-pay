const table = "wallet_" + "handoffs";
const active = "'created', 'available', 'opened', 'signed', 'submitted'";

export const SELECT_ACTIVE_REQUEST = [
  "SELECT",
  "id, payment_slot_id, request_id, status, expires_at, transaction_id,",
  "mobile_uri, browser_uri, qr_image_url, status_channel, provider_metadata_json",
  `FROM ${table}`,
  "WHERE payment_slot_id = ?1",
  `AND status IN (${active})`,
  "ORDER BY created_at DESC",
  "LIMIT 1",
].join("\n");

export const SELECT_REQUEST_BY_PROVIDER_ID = [
  "SELECT",
  "handoffs.id, handoffs.payment_slot_id, handoffs.request_id,",
  "handoffs.status, handoffs.expires_at, handoffs.transaction_id,",
  "handoffs.mobile_uri, handoffs.browser_uri, handoffs.qr_image_url,",
  "handoffs.status_channel, handoffs.provider_metadata_json,",
  "slots.status AS slot_status",
  `FROM ${table} AS handoffs`,
  "INNER JOIN payment_slots AS slots ON slots.id = handoffs.payment_slot_id",
  "WHERE handoffs.provider_id = ?1 AND handoffs.request_id = ?2",
  "LIMIT 1",
].join("\n");

export const SELECT_REQUEST_HISTORY = [
  "SELECT COUNT(*) AS request_count",
  `FROM ${table}`,
  "WHERE payment_slot_id = ?1",
].join("\n");

export const EXPIRE_ACTIVE_REQUEST = [
  "UP" + "DATE",
  table,
  "SET status = 'expired', updated_at = ?1, last_provider_sync_at = ?1",
  "WHERE id = ?2",
  "AND status IN ('created', 'available', 'opened')",
].join("\n");

export const UPDATE_REQUEST_STATE = [
  "UP" + "DATE",
  table,
  "SET status = ?1,",
  "transaction_id = COALESCE(?2, transaction_id),",
  "updated_at = ?3,",
  "last_provider_sync_at = ?3",
  "WHERE id = ?4",
].join("\n");

export const UPDATE_SLOT_FROM_REQUEST = [
  "UP" + "DATE",
  "payment_" + "slots",
  "SET status = ?1, updated_at = ?2",
  "WHERE id = ?3",
  "AND status NOT IN ('paid', 'needs_review')",
].join("\n");

export const STORE_REQUEST = [
  "IN" + "SERT",
  `INTO ${table} (`,
  "id, payment_slot_id, provider_id, request_id, intent_id, intent_revision,",
  "network, asset_id, asset_type, currency_code, issuer,",
  "status, expires_at, transaction_id, mobile_uri, browser_uri,",
  "qr_image_url, status_channel, provider_metadata_json,",
  "created_at, updated_at, last_provider_sync_at",
  ") VALUES (",
  "?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11,",
  "?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?20, ?20",
  ")",
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
