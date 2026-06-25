CREATE TRIGGER sync_verified_payment_record_after_insert
AFTER INSERT ON verified_payment_receipts
FOR EACH ROW
WHEN NEW.verified_payment_digest IS NOT NULL
BEGIN
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
  ) VALUES (
    NEW.receipt_id,
    NEW.verified_payment_contract_version,
    NEW.receipt_contract,
    NEW.network,
    NEW.transaction_id,
    NEW.invoice_id,
    NEW.ledger_index,
    NEW.sender,
    NEW.destination,
    NEW.asset_id,
    NEW.asset_type,
    NEW.currency_code,
    NEW.issuer,
    NEW.amount_scale,
    NEW.amount_units,
    NEW.delivered_amount_units,
    NEW.source_tag,
    NEW.destination_tag,
    NEW.verified_at,
    NEW.recorded_at,
    NEW.verified_payment_digest,
    NEW.proof_digest
  )
  ON CONFLICT(receipt_id) DO UPDATE SET
    verified_payment_digest = excluded.verified_payment_digest,
    legacy_proof_digest = excluded.legacy_proof_digest
  WHERE verified_payment_records.verified_payment_digest IS NULL
    AND verified_payment_records.transaction_id = excluded.transaction_id
    AND verified_payment_records.invoice_id = excluded.invoice_id
    AND verified_payment_records.asset_id = excluded.asset_id
    AND verified_payment_records.amount_units = excluded.amount_units
    AND verified_payment_records.delivered_amount_units = excluded.delivered_amount_units;
END;

CREATE TRIGGER sync_verified_payment_record_after_digest_update
AFTER UPDATE OF verified_payment_digest ON verified_payment_receipts
FOR EACH ROW
WHEN NEW.verified_payment_digest IS NOT NULL
BEGIN
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
  ) VALUES (
    NEW.receipt_id,
    NEW.verified_payment_contract_version,
    NEW.receipt_contract,
    NEW.network,
    NEW.transaction_id,
    NEW.invoice_id,
    NEW.ledger_index,
    NEW.sender,
    NEW.destination,
    NEW.asset_id,
    NEW.asset_type,
    NEW.currency_code,
    NEW.issuer,
    NEW.amount_scale,
    NEW.amount_units,
    NEW.delivered_amount_units,
    NEW.source_tag,
    NEW.destination_tag,
    NEW.verified_at,
    NEW.recorded_at,
    NEW.verified_payment_digest,
    NEW.proof_digest
  )
  ON CONFLICT(receipt_id) DO UPDATE SET
    verified_payment_digest = excluded.verified_payment_digest,
    legacy_proof_digest = excluded.legacy_proof_digest
  WHERE verified_payment_records.verified_payment_digest IS NULL
    AND verified_payment_records.transaction_id = excluded.transaction_id
    AND verified_payment_records.invoice_id = excluded.invoice_id
    AND verified_payment_records.asset_id = excluded.asset_id
    AND verified_payment_records.amount_units = excluded.amount_units
    AND verified_payment_records.delivered_amount_units = excluded.delivered_amount_units;
END;
