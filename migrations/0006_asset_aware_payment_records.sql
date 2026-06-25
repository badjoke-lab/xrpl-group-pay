ALTER TABLE bills ADD COLUMN settlement_contract_version TEXT;
ALTER TABLE bills ADD COLUMN settlement_asset_id TEXT;
ALTER TABLE bills ADD COLUMN settlement_asset_type TEXT;
ALTER TABLE bills ADD COLUMN settlement_currency TEXT;
ALTER TABLE bills ADD COLUMN settlement_issuer TEXT;
ALTER TABLE bills ADD COLUMN settlement_amount_scale INTEGER;
ALTER TABLE bills ADD COLUMN total_amount_units TEXT;
ALTER TABLE bills ADD COLUMN creator_share_amount_units TEXT;

UPDATE bills
SET settlement_contract_version = 'xrpl-group-pay:bill-settlement:v1',
    settlement_asset_id = 'xrpl:testnet:xrp',
    settlement_asset_type = 'native',
    settlement_currency = 'XRP',
    settlement_issuer = NULL,
    settlement_amount_scale = 6,
    total_amount_units = total_drops,
    creator_share_amount_units = creator_share_drops;

CREATE TRIGGER bills_asset_columns_after_insert
AFTER INSERT ON bills
FOR EACH ROW
WHEN NEW.settlement_asset_id IS NULL
BEGIN
  UPDATE bills
  SET settlement_contract_version = 'xrpl-group-pay:bill-settlement:v1',
      settlement_asset_id = 'xrpl:testnet:xrp',
      settlement_asset_type = 'native',
      settlement_currency = 'XRP',
      settlement_issuer = NULL,
      settlement_amount_scale = 6,
      total_amount_units = NEW.total_drops,
      creator_share_amount_units = NEW.creator_share_drops
  WHERE id = NEW.id;
END;

CREATE INDEX bills_settlement_asset_idx
ON bills(settlement_asset_id, status, updated_at);

ALTER TABLE payment_slots ADD COLUMN payment_contract_version TEXT;
ALTER TABLE payment_slots ADD COLUMN asset_id TEXT;
ALTER TABLE payment_slots ADD COLUMN asset_type TEXT;
ALTER TABLE payment_slots ADD COLUMN currency_code TEXT;
ALTER TABLE payment_slots ADD COLUMN issuer TEXT;
ALTER TABLE payment_slots ADD COLUMN amount_scale INTEGER;
ALTER TABLE payment_slots ADD COLUMN expected_amount_units TEXT;

UPDATE payment_slots
SET payment_contract_version = 'xrpl-group-pay:payment-slot:v1',
    asset_id = 'xrpl:testnet:xrp',
    asset_type = 'native',
    currency_code = 'XRP',
    issuer = NULL,
    amount_scale = 6,
    expected_amount_units = expected_amount_drops;

CREATE TRIGGER payment_slots_asset_columns_after_insert
AFTER INSERT ON payment_slots
FOR EACH ROW
WHEN NEW.asset_id IS NULL
BEGIN
  UPDATE payment_slots
  SET payment_contract_version = 'xrpl-group-pay:payment-slot:v1',
      asset_id = COALESCE(
        (SELECT settlement_asset_id FROM bills WHERE id = NEW.bill_id),
        'xrpl:testnet:xrp'
      ),
      asset_type = COALESCE(
        (SELECT settlement_asset_type FROM bills WHERE id = NEW.bill_id),
        'native'
      ),
      currency_code = COALESCE(
        (SELECT settlement_currency FROM bills WHERE id = NEW.bill_id),
        'XRP'
      ),
      issuer = (SELECT settlement_issuer FROM bills WHERE id = NEW.bill_id),
      amount_scale = COALESCE(
        (SELECT settlement_amount_scale FROM bills WHERE id = NEW.bill_id),
        6
      ),
      expected_amount_units = NEW.expected_amount_drops
  WHERE id = NEW.id;
END;

CREATE INDEX payment_slots_asset_idx
ON payment_slots(asset_id, status, updated_at);

ALTER TABLE verified_payment_receipts
ADD COLUMN verified_payment_contract_version TEXT;
ALTER TABLE verified_payment_receipts ADD COLUMN receipt_contract TEXT;
ALTER TABLE verified_payment_receipts ADD COLUMN asset_id TEXT;
ALTER TABLE verified_payment_receipts ADD COLUMN asset_type TEXT;
ALTER TABLE verified_payment_receipts ADD COLUMN currency_code TEXT;
ALTER TABLE verified_payment_receipts ADD COLUMN issuer TEXT;
ALTER TABLE verified_payment_receipts ADD COLUMN amount_scale INTEGER;
ALTER TABLE verified_payment_receipts ADD COLUMN amount_units TEXT;
ALTER TABLE verified_payment_receipts ADD COLUMN delivered_amount_units TEXT;
ALTER TABLE verified_payment_receipts ADD COLUMN verified_payment_digest TEXT;

UPDATE verified_payment_receipts
SET verified_payment_contract_version = 'xrpl-group-pay:verified-payment:v1',
    receipt_contract = 'xrpl-xrp-payment-v1',
    asset_id = CASE network
      WHEN 'mainnet' THEN 'xrpl:mainnet:xrp'
      ELSE 'xrpl:testnet:xrp'
    END,
    asset_type = 'native',
    currency_code = 'XRP',
    issuer = NULL,
    amount_scale = 6,
    amount_units = amount_drops,
    delivered_amount_units = delivered_amount_drops;

CREATE TRIGGER verified_receipts_asset_columns_after_insert
AFTER INSERT ON verified_payment_receipts
FOR EACH ROW
WHEN NEW.asset_id IS NULL
BEGIN
  UPDATE verified_payment_receipts
  SET verified_payment_contract_version = 'xrpl-group-pay:verified-payment:v1',
      receipt_contract = 'xrpl-xrp-payment-v1',
      asset_id = CASE NEW.network
        WHEN 'mainnet' THEN 'xrpl:mainnet:xrp'
        ELSE 'xrpl:testnet:xrp'
      END,
      asset_type = 'native',
      currency_code = 'XRP',
      issuer = NULL,
      amount_scale = 6,
      amount_units = NEW.amount_drops,
      delivered_amount_units = NEW.delivered_amount_drops
  WHERE receipt_id = NEW.receipt_id;
END;

CREATE INDEX verified_receipts_asset_recorded_idx
ON verified_payment_receipts(asset_id, recorded_at);
