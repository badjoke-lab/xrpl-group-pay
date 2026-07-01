ALTER TABLE bills ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'representative'
CHECK (payment_mode IN ('representative', 'direct'));

ALTER TABLE bills ADD COLUMN recipient_label TEXT
CHECK (recipient_label IS NULL OR length(recipient_label) <= 100);

ALTER TABLE bills ADD COLUMN recipient_funded_amount_units TEXT NOT NULL DEFAULT '0'
CHECK (
  recipient_funded_amount_units <> ''
  AND recipient_funded_amount_units NOT GLOB '*[^0-9]*'
);

ALTER TABLE bills ADD COLUMN closure_state TEXT NOT NULL DEFAULT 'active'
CHECK (closure_state IN ('active', 'closed_incomplete'));

ALTER TABLE bills ADD COLUMN closed_at TEXT;
ALTER TABLE bills ADD COLUMN closure_reason_code TEXT;
ALTER TABLE bills ADD COLUMN review_reason_code TEXT;
ALTER TABLE bills ADD COLUMN review_details_json TEXT;

ALTER TABLE payment_slots ADD COLUMN review_reason_code TEXT;
ALTER TABLE payment_slots ADD COLUMN review_details_json TEXT;
ALTER TABLE payment_slots ADD COLUMN closed_at TEXT;

UPDATE bills
SET recipient_funded_amount_units = COALESCE(
  creator_share_amount_units,
  creator_share_drops,
  '0'
);

CREATE INDEX bills_mode_closure_updated_idx
ON bills(payment_mode, closure_state, updated_at);

CREATE INDEX payment_slots_review_reason_idx
ON payment_slots(review_reason_code, updated_at);
