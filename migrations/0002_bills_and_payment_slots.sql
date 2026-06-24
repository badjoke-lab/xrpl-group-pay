CREATE TABLE bills (
  id TEXT PRIMARY KEY NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  public_token_hash TEXT NOT NULL UNIQUE,
  admin_token_hash TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  network TEXT NOT NULL CHECK (network = 'testnet'),
  destination_address TEXT NOT NULL,
  destination_tag INTEGER,
  total_drops TEXT NOT NULL,
  creator_share_drops TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'partially_paid', 'settled', 'needs_review')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  frozen_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (destination_tag IS NULL OR destination_tag BETWEEN 0 AND 4294967295),
  CHECK (total_drops <> '' AND total_drops NOT GLOB '*[^0-9]*'),
  CHECK (creator_share_drops <> '' AND creator_share_drops NOT GLOB '*[^0-9]*')
) STRICT;

CREATE INDEX bills_status_updated_at_idx ON bills (status, updated_at);
