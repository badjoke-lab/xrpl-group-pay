CREATE TABLE payment_slots (
  id TEXT PRIMARY KEY NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  public_token_hash TEXT NOT NULL UNIQUE,
  participant_label TEXT CHECK (participant_label IS NULL OR length(participant_label) <= 60),
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
  paid_receipt_id TEXT UNIQUE REFERENCES verified_payment_receipts(receipt_id),
  paid_tx_hash TEXT UNIQUE COLLATE NOCASE,
  paid_ledger_index INTEGER,
  paid_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
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

CREATE INDEX payment_slots_bill_id_idx ON payment_slots (bill_id);
CREATE INDEX payment_slots_invoice_id_idx ON payment_slots (invoice_id);
