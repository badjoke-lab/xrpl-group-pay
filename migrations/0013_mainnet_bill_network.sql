CREATE TABLE _migration_0013_counts (
  singleton INTEGER PRIMARY KEY NOT NULL CHECK (singleton = 1),
  bills_count INTEGER NOT NULL,
  payment_slots_count INTEGER NOT NULL,
  wallet_handoffs_count INTEGER NOT NULL,
  bill_allocations_count INTEGER NOT NULL,
  allocation_participants_count INTEGER NOT NULL
) STRICT;

INSERT INTO _migration_0013_counts (
  singleton,
  bills_count,
  payment_slots_count,
  wallet_handoffs_count,
  bill_allocations_count,
  allocation_participants_count
)
SELECT
  1,
  (SELECT COUNT(*) FROM bills),
  (SELECT COUNT(*) FROM payment_slots),
  (SELECT COUNT(*) FROM wallet_handoffs),
  (SELECT COUNT(*) FROM bill_allocations),
  (SELECT COUNT(*) FROM bill_allocation_participants);

CREATE TABLE _migration_0013_bills AS SELECT * FROM bills;
CREATE TABLE _migration_0013_payment_slots AS SELECT * FROM payment_slots;
CREATE TABLE _migration_0013_wallet_handoffs AS SELECT * FROM wallet_handoffs;
CREATE TABLE _migration_0013_bill_allocations AS SELECT * FROM bill_allocations;
CREATE TABLE _migration_0013_allocation_participants AS
SELECT * FROM bill_allocation_participants;

DELETE FROM bill_allocation_participants;
DELETE FROM wallet_handoffs;
DELETE FROM bill_allocations;
DELETE FROM payment_slots;
DROP TABLE bills;

CREATE TABLE bills (
  id TEXT PRIMARY KEY NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  public_token_hash TEXT NOT NULL UNIQUE,
  admin_token_hash TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  network TEXT NOT NULL CHECK (network IN ('testnet', 'mainnet')),
  destination_address TEXT NOT NULL,
  destination_tag INTEGER,
  total_drops TEXT NOT NULL,
  creator_share_drops TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('open', 'partially_paid', 'settled', 'needs_review')
  ),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  frozen_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  settlement_contract_version TEXT,
  settlement_asset_id TEXT,
  settlement_asset_type TEXT,
  settlement_currency TEXT,
  settlement_issuer TEXT,
  settlement_amount_scale INTEGER,
  total_amount_units TEXT,
  creator_share_amount_units TEXT,
  CHECK (destination_tag IS NULL OR destination_tag BETWEEN 0 AND 4294967295),
  CHECK (total_drops <> '' AND total_drops NOT GLOB '*[^0-9]*'),
  CHECK (creator_share_drops <> '' AND creator_share_drops NOT GLOB '*[^0-9]*')
) STRICT;

INSERT INTO bills SELECT * FROM _migration_0013_bills;

CREATE INDEX bills_status_updated_at_idx ON bills (status, updated_at);
CREATE INDEX bills_settlement_asset_idx
ON bills(settlement_asset_id, status, updated_at);

CREATE TRIGGER bills_asset_columns_after_insert
AFTER INSERT ON bills
FOR EACH ROW
WHEN NEW.settlement_asset_id IS NULL
BEGIN
  UPDATE bills
  SET settlement_contract_version = 'xrpl-group-pay:bill-settlement:v1',
      settlement_asset_id = CASE NEW.network
        WHEN 'mainnet' THEN 'xrpl:mainnet:xrp'
        ELSE 'xrpl:testnet:xrp'
      END,
      settlement_asset_type = 'native',
      settlement_currency = 'XRP',
      settlement_issuer = NULL,
      settlement_amount_scale = 6,
      total_amount_units = NEW.total_drops,
      creator_share_amount_units = NEW.creator_share_drops
  WHERE id = NEW.id;
END;

INSERT INTO payment_slots SELECT * FROM _migration_0013_payment_slots;
INSERT INTO bill_allocations SELECT * FROM _migration_0013_bill_allocations;
INSERT INTO wallet_handoffs SELECT * FROM _migration_0013_wallet_handoffs;
INSERT INTO bill_allocation_participants
SELECT * FROM _migration_0013_allocation_participants;

CREATE TABLE _migration_0013_assertions (
  ok INTEGER NOT NULL CHECK (ok = 1)
) STRICT;

INSERT INTO _migration_0013_assertions (ok)
SELECT CASE
  WHEN
    (SELECT COUNT(*) FROM bills) = bills_count
    AND (SELECT COUNT(*) FROM payment_slots) = payment_slots_count
    AND (SELECT COUNT(*) FROM wallet_handoffs) = wallet_handoffs_count
    AND (SELECT COUNT(*) FROM bill_allocations) = bill_allocations_count
    AND (
      SELECT COUNT(*) FROM bill_allocation_participants
    ) = allocation_participants_count
    AND NOT EXISTS (SELECT 1 FROM pragma_foreign_key_check)
  THEN 1
  ELSE 0
END
FROM _migration_0013_counts
WHERE singleton = 1;

DROP TABLE _migration_0013_assertions;
DROP TABLE _migration_0013_allocation_participants;
DROP TABLE _migration_0013_bill_allocations;
DROP TABLE _migration_0013_wallet_handoffs;
DROP TABLE _migration_0013_payment_slots;
DROP TABLE _migration_0013_bills;
DROP TABLE _migration_0013_counts;
