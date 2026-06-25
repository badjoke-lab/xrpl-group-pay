CREATE TABLE verified_payment_records (
  receipt_id TEXT PRIMARY KEY NOT NULL,
  verified_payment_contract_version TEXT NOT NULL CHECK (
    verified_payment_contract_version = 'xrpl-group-pay:verified-payment:v1'
  ),
  receipt_contract TEXT NOT NULL CHECK (
    receipt_contract IN ('xrpl-xrp-payment-v1', 'xrpl-issued-payment-v1')
  ),
  network TEXT NOT NULL CHECK (network IN ('testnet', 'mainnet')),
  transaction_id TEXT NOT NULL COLLATE NOCASE,
  invoice_id TEXT NOT NULL COLLATE NOCASE,
  ledger_index INTEGER NOT NULL CHECK (ledger_index >= 0),
  sender TEXT NOT NULL CHECK (length(sender) > 0),
  destination TEXT NOT NULL CHECK (length(destination) > 0),
  asset_id TEXT NOT NULL CHECK (length(asset_id) > 0),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('native', 'issued')),
  currency_code TEXT NOT NULL CHECK (length(currency_code) > 0),
  issuer TEXT,
  amount_scale INTEGER NOT NULL CHECK (amount_scale BETWEEN 0 AND 18),
  amount_units TEXT NOT NULL,
  delivered_amount_units TEXT NOT NULL,
  source_tag INTEGER NOT NULL CHECK (source_tag BETWEEN 0 AND 4294967295),
  destination_tag INTEGER CHECK (
    destination_tag IS NULL OR destination_tag BETWEEN 0 AND 4294967295
  ),
  verified_at TEXT NOT NULL CHECK (length(verified_at) > 0),
  recorded_at TEXT NOT NULL CHECK (length(recorded_at) > 0),
  verified_payment_digest TEXT,
  legacy_proof_digest TEXT,
  CHECK (length(transaction_id) = 64),
  CHECK (transaction_id = upper(transaction_id)),
  CHECK (length(invoice_id) = 64),
  CHECK (invoice_id = upper(invoice_id)),
  CHECK (amount_units <> '' AND amount_units NOT GLOB '*[^0-9]*'),
  CHECK (
    delivered_amount_units <> ''
    AND delivered_amount_units NOT GLOB '*[^0-9]*'
  ),
  CHECK (amount_units <> '0'),
  CHECK (delivered_amount_units = amount_units),
  CHECK (
    (asset_type = 'native' AND issuer IS NULL AND receipt_contract = 'xrpl-xrp-payment-v1')
    OR
    (asset_type = 'issued' AND issuer IS NOT NULL AND length(issuer) > 0 AND receipt_contract = 'xrpl-issued-payment-v1')
  ),
  CHECK (
    verified_payment_digest IS NULL
    OR (
      length(verified_payment_digest) = 64
      AND verified_payment_digest = upper(verified_payment_digest)
    )
  ),
  CHECK (
    legacy_proof_digest IS NULL
    OR (
      length(legacy_proof_digest) = 64
      AND legacy_proof_digest = upper(legacy_proof_digest)
    )
  ),
  CHECK (verified_payment_digest IS NOT NULL OR legacy_proof_digest IS NOT NULL),
  CHECK (receipt_id = network || ':' || transaction_id),
  UNIQUE (network, transaction_id),
  UNIQUE (network, invoice_id)
) STRICT;

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
  proof_digest
FROM verified_payment_receipts;

CREATE INDEX verified_payment_records_asset_recorded_idx
ON verified_payment_records(asset_id, recorded_at);

CREATE INDEX verified_payment_records_invoice_idx
ON verified_payment_records(network, invoice_id);
