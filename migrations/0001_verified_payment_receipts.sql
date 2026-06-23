PRAGMA foreign_keys = ON;

CREATE TABLE verified_payment_receipts (
  receipt_id TEXT PRIMARY KEY NOT NULL,
  network TEXT NOT NULL CHECK (network IN ('testnet', 'mainnet')),
  transaction_id TEXT NOT NULL COLLATE NOCASE,
  invoice_id TEXT NOT NULL COLLATE NOCASE,
  ledger_index INTEGER NOT NULL CHECK (ledger_index >= 0),
  sender TEXT NOT NULL CHECK (length(sender) > 0),
  destination TEXT NOT NULL CHECK (length(destination) > 0),
  amount_drops TEXT NOT NULL,
  delivered_amount_drops TEXT NOT NULL,
  source_tag INTEGER NOT NULL CHECK (source_tag BETWEEN 0 AND 4294967295),
  destination_tag INTEGER CHECK (
    destination_tag IS NULL OR destination_tag BETWEEN 0 AND 4294967295
  ),
  verified_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  proof_digest TEXT NOT NULL,
  CHECK (length(transaction_id) = 64),
  CHECK (transaction_id = upper(transaction_id)),
  CHECK (length(invoice_id) = 64),
  CHECK (invoice_id = upper(invoice_id)),
  CHECK (amount_drops <> '' AND amount_drops NOT GLOB '*[^0-9]*'),
  CHECK (
    delivered_amount_drops <> ''
    AND delivered_amount_drops NOT GLOB '*[^0-9]*'
  ),
  CHECK (delivered_amount_drops = amount_drops),
  CHECK (length(verified_at) > 0),
  CHECK (length(recorded_at) > 0),
  CHECK (length(proof_digest) = 64),
  CHECK (proof_digest = upper(proof_digest)),
  CHECK (receipt_id = network || ':' || transaction_id),
  UNIQUE (network, transaction_id),
  UNIQUE (network, invoice_id)
) STRICT;

CREATE INDEX verified_payment_receipts_recorded_at_idx
  ON verified_payment_receipts (recorded_at);
