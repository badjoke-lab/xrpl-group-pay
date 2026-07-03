CREATE TRIGGER bills_frozen_content_immutable
BEFORE UPDATE OF
  public_id,
  public_token_hash,
  admin_token_hash,
  title,
  network,
  payment_mode,
  recipient_label,
  destination_address,
  destination_tag,
  total_drops,
  creator_share_drops,
  settlement_contract_version,
  settlement_asset_id,
  settlement_asset_type,
  settlement_currency,
  settlement_issuer,
  settlement_amount_scale,
  total_amount_units,
  creator_share_amount_units,
  recipient_funded_amount_units,
  revision,
  frozen_at,
  created_at
ON bills
FOR EACH ROW
WHEN
  OLD.public_id IS NOT NEW.public_id
  OR OLD.public_token_hash IS NOT NEW.public_token_hash
  OR OLD.admin_token_hash IS NOT NEW.admin_token_hash
  OR OLD.title IS NOT NEW.title
  OR OLD.network IS NOT NEW.network
  OR OLD.payment_mode IS NOT NEW.payment_mode
  OR OLD.recipient_label IS NOT NEW.recipient_label
  OR OLD.destination_address IS NOT NEW.destination_address
  OR OLD.destination_tag IS NOT NEW.destination_tag
  OR OLD.total_drops IS NOT NEW.total_drops
  OR OLD.creator_share_drops IS NOT NEW.creator_share_drops
  OR OLD.settlement_contract_version IS NOT NEW.settlement_contract_version
  OR OLD.settlement_asset_id IS NOT NEW.settlement_asset_id
  OR OLD.settlement_asset_type IS NOT NEW.settlement_asset_type
  OR OLD.settlement_currency IS NOT NEW.settlement_currency
  OR OLD.settlement_issuer IS NOT NEW.settlement_issuer
  OR OLD.settlement_amount_scale IS NOT NEW.settlement_amount_scale
  OR OLD.total_amount_units IS NOT NEW.total_amount_units
  OR OLD.creator_share_amount_units IS NOT NEW.creator_share_amount_units
  OR (
    OLD.recipient_funded_amount_units IS NOT NEW.recipient_funded_amount_units
    AND NOT (
      OLD.recipient_funded_amount_units IS NULL
      AND NEW.recipient_funded_amount_units = COALESCE(
        OLD.creator_share_amount_units,
        OLD.creator_share_drops,
        '0'
      )
    )
  )
  OR OLD.revision IS NOT NEW.revision
  OR OLD.frozen_at IS NOT NEW.frozen_at
  OR OLD.created_at IS NOT NEW.created_at
BEGIN
  SELECT RAISE(ABORT, 'frozen Bill content is immutable; create a new Bill');
END;

CREATE TRIGGER payment_slots_frozen_content_immutable
BEFORE UPDATE OF
  public_id,
  bill_id,
  public_token_hash,
  participant_label,
  expected_payer_address,
  expected_amount_drops,
  invoice_id,
  payment_contract_version,
  asset_id,
  asset_type,
  currency_code,
  issuer,
  amount_scale,
  expected_amount_units,
  created_at
ON payment_slots
FOR EACH ROW
WHEN
  OLD.public_id IS NOT NEW.public_id
  OR OLD.bill_id IS NOT NEW.bill_id
  OR OLD.public_token_hash IS NOT NEW.public_token_hash
  OR OLD.participant_label IS NOT NEW.participant_label
  OR OLD.expected_payer_address IS NOT NEW.expected_payer_address
  OR OLD.expected_amount_drops IS NOT NEW.expected_amount_drops
  OR OLD.invoice_id IS NOT NEW.invoice_id
  OR OLD.payment_contract_version IS NOT NEW.payment_contract_version
  OR OLD.asset_id IS NOT NEW.asset_id
  OR OLD.asset_type IS NOT NEW.asset_type
  OR OLD.currency_code IS NOT NEW.currency_code
  OR OLD.issuer IS NOT NEW.issuer
  OR OLD.amount_scale IS NOT NEW.amount_scale
  OR OLD.expected_amount_units IS NOT NEW.expected_amount_units
  OR OLD.created_at IS NOT NEW.created_at
BEGIN
  SELECT RAISE(ABORT, 'frozen PaymentSlot content is immutable; create a new Bill');
END;
