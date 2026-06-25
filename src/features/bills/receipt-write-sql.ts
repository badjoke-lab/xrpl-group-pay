export const INSERT_SLOT_RECEIPT = `
  INSERT INTO verified_payment_receipts (
    receipt_id, network, transaction_id, invoice_id, ledger_index,
    sender, destination, amount_drops, delivered_amount_drops,
    source_tag, destination_tag, verified_at, recorded_at, proof_digest,
    verified_payment_contract_version, receipt_contract, asset_id,
    asset_type, currency_code, issuer, amount_scale, amount_units,
    delivered_amount_units, verified_payment_digest
  )
  SELECT
    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
    ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24
  WHERE EXISTS (
    SELECT 1
    FROM payment_slots s
    JOIN bills b ON b.id = s.bill_id
    WHERE s.id = ?25
      AND s.invoice_id = ?4
      AND s.expected_payer_address = ?6
      AND s.expected_amount_drops = ?8
      AND s.status <> 'needs_review'
      AND (s.paid_tx_hash IS NULL OR s.paid_tx_hash = ?3)
      AND b.status IN ('open', 'partially_paid', 'settled')
  )
  ON CONFLICT(network, transaction_id) DO UPDATE SET
    verified_payment_contract_version = excluded.verified_payment_contract_version,
    receipt_contract = excluded.receipt_contract,
    asset_id = excluded.asset_id,
    asset_type = excluded.asset_type,
    currency_code = excluded.currency_code,
    issuer = excluded.issuer,
    amount_scale = excluded.amount_scale,
    amount_units = excluded.amount_units,
    delivered_amount_units = excluded.delivered_amount_units,
    verified_payment_digest = excluded.verified_payment_digest
  WHERE verified_payment_receipts.verified_payment_digest IS NULL
    AND verified_payment_receipts.invoice_id = excluded.invoice_id
    AND verified_payment_receipts.sender = excluded.sender
    AND verified_payment_receipts.destination = excluded.destination
    AND verified_payment_receipts.amount_drops = excluded.amount_drops
    AND verified_payment_receipts.delivered_amount_drops = excluded.delivered_amount_drops
    AND verified_payment_receipts.proof_digest = excluded.proof_digest
`;

export const SELECT_SLOT_SETTLEMENT = `
  SELECT
    r.receipt_id,
    r.transaction_id,
    r.invoice_id,
    r.recorded_at,
    r.proof_digest,
    v.verified_payment_digest,
    v.asset_id,
    v.amount_units,
    v.delivered_amount_units,
    s.public_id AS slot_public_id,
    s.status AS slot_status,
    s.paid_tx_hash,
    s.paid_at,
    b.public_id AS bill_public_id,
    b.status AS bill_status
  FROM payment_slots s
  JOIN bills b ON b.id = s.bill_id
  LEFT JOIN verified_payment_receipts r ON r.receipt_id = s.paid_receipt_id
  LEFT JOIN verified_payment_records v ON v.receipt_id = r.receipt_id
  WHERE s.id = ?1
  LIMIT 1
`;
