CREATE TABLE rlusd_trustset_preparations (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  capability_hash TEXT NOT NULL UNIQUE,
  network TEXT NOT NULL CHECK (network IN ('testnet', 'mainnet')),
  purpose TEXT NOT NULL CHECK (purpose IN ('recipient', 'payer')),
  account_address TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  issuer TEXT NOT NULL,
  required_amount_units TEXT NOT NULL,
  amount_scale INTEGER NOT NULL,
  trust_limit_units TEXT NOT NULL,
  trust_limit_value TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'not_required',
      'required',
      'handoff_created',
      'awaiting_signature',
      'rejected',
      'expired',
      'submitted',
      'verifying',
      'ready',
      'failed'
    )
  ),
  xaman_payload_id TEXT UNIQUE,
  mobile_uri TEXT,
  browser_uri TEXT,
  qr_image_url TEXT,
  status_channel TEXT,
  expires_at TEXT,
  transaction_id TEXT,
  failure_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  verified_at TEXT
);

CREATE INDEX rlusd_trustset_preparations_account_idx
ON rlusd_trustset_preparations(network, account_address, asset_id);

CREATE INDEX rlusd_trustset_preparations_payload_idx
ON rlusd_trustset_preparations(xaman_payload_id);
