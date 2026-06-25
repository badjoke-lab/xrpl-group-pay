ALTER TABLE wallet_handoffs ADD COLUMN network TEXT;
ALTER TABLE wallet_handoffs ADD COLUMN asset_id TEXT;
ALTER TABLE wallet_handoffs ADD COLUMN asset_type TEXT;
ALTER TABLE wallet_handoffs ADD COLUMN currency_code TEXT;
ALTER TABLE wallet_handoffs ADD COLUMN issuer TEXT;

UPDATE wallet_handoffs
SET network = CASE
      WHEN COALESCE(
        (SELECT asset_id FROM payment_slots WHERE payment_slots.id = wallet_handoffs.payment_slot_id),
        'xrpl:testnet:xrp'
      ) LIKE 'xrpl:mainnet:%'
      THEN 'mainnet'
      ELSE 'testnet'
    END,
    asset_id = COALESCE(
      (SELECT asset_id FROM payment_slots WHERE payment_slots.id = wallet_handoffs.payment_slot_id),
      'xrpl:testnet:xrp'
    ),
    asset_type = COALESCE(
      (SELECT asset_type FROM payment_slots WHERE payment_slots.id = wallet_handoffs.payment_slot_id),
      'native'
    ),
    currency_code = COALESCE(
      (SELECT currency_code FROM payment_slots WHERE payment_slots.id = wallet_handoffs.payment_slot_id),
      'XRP'
    ),
    issuer = (
      SELECT issuer FROM payment_slots WHERE payment_slots.id = wallet_handoffs.payment_slot_id
    );

CREATE TRIGGER wallet_handoffs_identity_before_insert
BEFORE INSERT ON wallet_handoffs
FOR EACH ROW
WHEN NEW.network IS NULL
  OR NEW.network NOT IN ('testnet', 'mainnet')
  OR NEW.asset_id IS NULL
  OR NEW.asset_id NOT LIKE ('xrpl:' || NEW.network || ':%')
  OR NEW.asset_type IS NULL
  OR NEW.asset_type NOT IN ('native', 'issued')
  OR NEW.currency_code IS NULL
  OR length(NEW.currency_code) = 0
  OR (NEW.asset_type = 'native' AND (NEW.currency_code <> 'XRP' OR NEW.issuer IS NOT NULL))
  OR (NEW.asset_type = 'issued' AND (NEW.issuer IS NULL OR length(NEW.issuer) = 0))
BEGIN
  SELECT RAISE(ABORT, 'wallet handoff network and Asset identity are required');
END;

CREATE TRIGGER wallet_handoffs_identity_before_update
BEFORE UPDATE OF network, asset_id, asset_type, currency_code, issuer
ON wallet_handoffs
FOR EACH ROW
WHEN NEW.network IS NULL
  OR NEW.network NOT IN ('testnet', 'mainnet')
  OR NEW.asset_id IS NULL
  OR NEW.asset_id NOT LIKE ('xrpl:' || NEW.network || ':%')
  OR NEW.asset_type IS NULL
  OR NEW.asset_type NOT IN ('native', 'issued')
  OR NEW.currency_code IS NULL
  OR length(NEW.currency_code) = 0
  OR (NEW.asset_type = 'native' AND (NEW.currency_code <> 'XRP' OR NEW.issuer IS NOT NULL))
  OR (NEW.asset_type = 'issued' AND (NEW.issuer IS NULL OR length(NEW.issuer) = 0))
BEGIN
  SELECT RAISE(ABORT, 'wallet handoff network and Asset identity are required');
END;

CREATE INDEX wallet_handoffs_network_asset_idx
ON wallet_handoffs(network, asset_id, created_at DESC);
