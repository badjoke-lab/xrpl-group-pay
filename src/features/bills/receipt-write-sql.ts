export const INSERT_SLOT_RECEIPT = `
  INSERT INTO verified_payment_receipts (
    receipt_id, network, transaction_id, invoice_id, ledger_index,
    sender, destination, amount_drops, delivered_amount_drops,
    source_tag, destination_tag, verified_at, recorded_at, proof_digest
  ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
  ON CONFLICT(network, transaction_id) DO NOTHING
`;

export const SELECT_SLOT_SETTLEMENT = `
  SELECT
    r.receipt_id,
    r.transaction_id,
    r.invoice_id,
    r.recorded_at,
    r.proof_digest,
    s.public_id AS slot_public_id,
    s.status AS slot_status,
    s.paid_tx_hash,
    s.paid_at,
    b.public_id AS bill_public_id,
    b.status AS bill_status
  FROM payment_slots s
  JOIN bills b ON b.id = s.bill_id
  LEFT JOIN verified_payment_receipts r ON r.receipt_id = s.paid_receipt_id
  WHERE s.id = ?1
  LIMIT 1
`;
