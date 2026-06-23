CREATE TABLE verified_payment_receipts (
  receipt_id TEXT PRIMARY KEY NOT NULL,
  network TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  ledger_index INTEGER NOT NULL,
  sender TEXT NOT NULL,
  destination TEXT NOT NULL,
  amount_drops TEXT NOT NULL,
  delivered_amount_drops TEXT NOT NULL,
  source_tag INTEGER NOT NULL,
  destination_tag INTEGER,
  verified_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  proof_digest TEXT NOT NULL,
  UNIQUE (network, transaction_id),
  UNIQUE (network, invoice_id)
) STRICT;
