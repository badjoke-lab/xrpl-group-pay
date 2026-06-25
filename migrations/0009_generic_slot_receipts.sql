CREATE TABLE payment_slots_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  public_token_hash TEXT NOT NULL UNIQUE,
  participant_label TEXT CHECK (
    participant_label IS NULL OR length(participant_label) <= 60
  ),
  expected_payer_address TEXT NOT NULL,
  expected_amount_drops TEXT NOT NULL,
  invoice_id TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status TEXT NOT NULL CHECK (
    status IN (
      'unpaid',
      'payload_created',
      'awaiting_signature',
      'rejected',
      'expired',
      'submitted',
      'validating',
      'paid',
      'verification_failed',
      'needs_review'
    )
  ),
  paid_receipt_id TEXT UNIQUE REFERENCES verified_payment_records(receipt_id),
  paid_tx_hash TEXT UNIQUE COLLATE NOCASE,
  paid_ledger_index INTEGER,
  paid_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payment_contract_version TEXT,
  asset_id TEXT,
  asset_type TEXT,
  currency_code TEXT,
  issuer TEXT,
  amount_scale INTEGER,
  expected_amount_units TEXT,
  CHECK (expected_amount_drops <> ''),
  CHECK (expected_amount_drops NOT GLOB '*[^0-9]*'),
  CHECK (expected_amount_drops <> '0'),
  CHECK (length(invoice_id) = 64),
  CHECK (invoice_id COLLATE BINARY = upper(invoice_id)),
  CHECK (
    paid_tx_hash IS NULL
    OR paid_tx_hash COLLATE BINARY = upper(paid_tx_hash)
  ),
  CHECK (paid_ledger_index IS NULL OR paid_ledger_index >= 0),
  CHECK (
    (status = 'paid' AND paid_receipt_id IS NOT NULL AND paid_tx_hash IS NOT NULL AND paid_ledger_index IS NOT NULL AND paid_at IS NOT NULL)
    OR
    (status <> 'paid' AND paid_receipt_id IS NULL AND paid_tx_hash IS NULL AND paid_ledger_index IS NULL AND paid_at IS NULL)
  )
) STRICT;

INSERT INTO payment_slots_v2 (
  id,
  public_id,
  bill_id,
  public_token_hash,
  participant_label,
  expected_payer_address,
  expected_amount_drops,
  invoice_id,
  status,
  paid_receipt_id,
  paid_tx_hash,
  paid_ledger_index,
  paid_at,
  created_at,
  updated_at,
  payment_contract_version,
  asset_id,
  asset_type,
  currency_code,
  issuer,
  amount_scale,
  expected_amount_units
)
SELECT
  id,
  public_id,
  bill_id,
  public_token_hash,
  participant_label,
  expected_payer_address,
  expected_amount_drops,
  invoice_id,
  status,
  paid_receipt_id,
  paid_tx_hash,
  paid_ledger_index,
  paid_at,
  created_at,
  updated_at,
  payment_contract_version,
  asset_id,
  asset_type,
  currency_code,
  issuer,
  amount_scale,
  expected_amount_units
FROM payment_slots;

CREATE TABLE wallet_handoffs_v2 (
  id TEXT PRIMARY KEY,
  payment_slot_id TEXT NOT NULL REFERENCES payment_slots_v2(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL CHECK (provider_id IN ('xaman')),
  request_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  intent_revision INTEGER NOT NULL CHECK (intent_revision >= 1),
  status TEXT NOT NULL CHECK (
    status IN (
      'created',
      'available',
      'opened',
      'rejected',
      'expired',
      'signed',
      'submitted',
      'failed'
    )
  ),
  expires_at TEXT NOT NULL,
  transaction_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (provider_id, request_id),
  CHECK (transaction_id IS NULL OR transaction_id = upper(transaction_id))
);

INSERT INTO wallet_handoffs_v2 (
  id,
  payment_slot_id,
  provider_id,
  request_id,
  intent_id,
  intent_revision,
  status,
  expires_at,
  transaction_id,
  created_at,
  updated_at
)
SELECT
  id,
  payment_slot_id,
  provider_id,
  request_id,
  intent_id,
  intent_revision,
  status,
  expires_at,
  transaction_id,
  created_at,
  updated_at
FROM wallet_handoffs;

DROP TABLE wallet_handoffs;
DROP TABLE payment_slots;

ALTER TABLE payment_slots_v2 RENAME TO payment_slots;
ALTER TABLE wallet_handoffs_v2 RENAME TO wallet_handoffs;

CREATE INDEX payment_slots_bill_id_idx ON payment_slots (bill_id);
CREATE INDEX payment_slots_invoice_id_idx ON payment_slots (invoice_id);
CREATE INDEX payment_slots_asset_idx
ON payment_slots(asset_id, status, updated_at);

CREATE INDEX wallet_handoffs_slot_created_idx
ON wallet_handoffs(payment_slot_id, created_at DESC);

CREATE UNIQUE INDEX wallet_handoffs_one_active_per_slot_idx
ON wallet_handoffs(payment_slot_id)
WHERE status IN ('created', 'available', 'opened', 'signed', 'submitted');

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
