export const INSERT_ISSUED_SLOT_RECEIPT = `
  INSERT INTO verified_payment_records (
    receipt_id,
    verified_payment_contract_version,
    receipt_contract,
    network,
    transaction_id,
    invoice_id,
    ledger_index,
    sender,
    destination,
    asset_id,
    asset_type,
    currency_code,
    issuer,
    amount_scale,
    amount_units,
    delivered_amount_units,
    source_tag,
    destination_tag,
    verified_at,
    recorded_at,
    verified_payment_digest,
    legacy_proof_digest
  )
  SELECT
    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11,
    ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22
  WHERE EXISTS (
    SELECT 1
    FROM payment_slots s
    JOIN bills b ON b.id = s.bill_id
    WHERE s.id = ?23
      AND s.invoice_id = ?6
      AND s.expected_payer_address = ?8
      AND s.payment_contract_version = ?24
      AND s.asset_id = ?10
      AND s.asset_type = ?11
      AND s.currency_code = ?12
      AND s.issuer IS ?13
      AND s.amount_scale = ?14
      AND s.expected_amount_units = ?15
      AND s.status <> 'needs_review'
      AND (s.paid_tx_hash IS NULL OR s.paid_tx_hash = ?5)
      AND b.network = ?4
      AND b.destination_address = ?9
      AND b.destination_tag IS ?18
      AND b.status IN ('open', 'partially_paid', 'settled')
  )
  ON CONFLICT(receipt_id) DO UPDATE SET
    verified_payment_digest = excluded.verified_payment_digest,
    legacy_proof_digest = COALESCE(
      verified_payment_records.legacy_proof_digest,
      excluded.legacy_proof_digest
    )
  WHERE verified_payment_records.verified_payment_digest IS NULL
    AND verified_payment_records.verified_payment_contract_version = excluded.verified_payment_contract_version
    AND verified_payment_records.receipt_contract = excluded.receipt_contract
    AND verified_payment_records.network = excluded.network
    AND verified_payment_records.transaction_id = excluded.transaction_id
    AND verified_payment_records.invoice_id = excluded.invoice_id
    AND verified_payment_records.ledger_index = excluded.ledger_index
    AND verified_payment_records.sender = excluded.sender
    AND verified_payment_records.destination = excluded.destination
    AND verified_payment_records.asset_id = excluded.asset_id
    AND verified_payment_records.asset_type = excluded.asset_type
    AND verified_payment_records.currency_code = excluded.currency_code
    AND verified_payment_records.issuer IS excluded.issuer
    AND verified_payment_records.amount_scale = excluded.amount_scale
    AND verified_payment_records.amount_units = excluded.amount_units
    AND verified_payment_records.delivered_amount_units = excluded.delivered_amount_units
    AND verified_payment_records.source_tag = excluded.source_tag
    AND verified_payment_records.destination_tag IS excluded.destination_tag
    AND verified_payment_records.verified_at = excluded.verified_at
`;

export const MARK_ISSUED_SLOT_PAID = `
  UPDATE payment_slots
  SET status = 'paid',
      paid_receipt_id = COALESCE(paid_receipt_id, ?1),
      paid_tx_hash = COALESCE(paid_tx_hash, ?2),
      paid_ledger_index = COALESCE(paid_ledger_index, ?3),
      paid_at = COALESCE(paid_at, ?4),
      updated_at = ?4
  WHERE id = ?5
    AND status <> 'needs_review'
    AND invoice_id = ?6
    AND expected_payer_address = ?7
    AND payment_contract_version = ?8
    AND asset_id = ?9
    AND asset_type = ?10
    AND currency_code = ?11
    AND issuer IS ?12
    AND amount_scale = ?13
    AND expected_amount_units = ?14
    AND (paid_tx_hash IS NULL OR paid_tx_hash = ?2)
    AND EXISTS (
      SELECT 1
      FROM verified_payment_records r
      WHERE r.receipt_id = ?1
        AND r.network = ?15
        AND r.transaction_id = ?2
        AND r.invoice_id = ?6
        AND r.ledger_index = ?3
        AND r.sender = ?7
        AND r.destination = ?16
        AND r.asset_id = ?9
        AND r.asset_type = ?10
        AND r.currency_code = ?11
        AND r.issuer IS ?12
        AND r.amount_scale = ?13
        AND r.amount_units = ?14
        AND r.delivered_amount_units = ?14
        AND r.destination_tag IS ?17
        AND r.verified_payment_digest = ?18
    )
`;

export const SELECT_ISSUED_SLOT_SETTLEMENT = `
  SELECT
    r.receipt_id,
    r.network,
    r.transaction_id,
    r.invoice_id,
    r.asset_id,
    r.recorded_at,
    r.verified_payment_digest,
    r.legacy_proof_digest,
    s.public_id AS slot_public_id,
    s.status AS slot_status,
    s.paid_tx_hash,
    s.paid_at,
    b.public_id AS bill_public_id,
    b.status AS bill_status
  FROM payment_slots s
  JOIN bills b ON b.id = s.bill_id
  LEFT JOIN verified_payment_records r ON r.receipt_id = s.paid_receipt_id
  WHERE s.id = ?1
  LIMIT 1
`;
