ALTER TABLE wallet_handoffs ADD COLUMN mobile_uri TEXT;
ALTER TABLE wallet_handoffs ADD COLUMN browser_uri TEXT;
ALTER TABLE wallet_handoffs ADD COLUMN qr_image_url TEXT;
ALTER TABLE wallet_handoffs ADD COLUMN status_channel TEXT;
ALTER TABLE wallet_handoffs ADD COLUMN provider_metadata_json TEXT;
ALTER TABLE wallet_handoffs ADD COLUMN last_provider_sync_at TEXT;

CREATE INDEX wallet_handoffs_provider_request_idx
ON wallet_handoffs(provider_id, request_id);
