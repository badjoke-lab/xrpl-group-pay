CREATE TABLE wallet_handoffs (
  id TEXT PRIMARY KEY,
  payment_slot_id TEXT NOT NULL REFERENCES payment_slots(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL CHECK (provider_id IN ('xaman')),
  request_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  intent_revision INTEGER NOT NULL CHECK (intent_revision >= 1),
  status TEXT NOT NULL CHECK (
    status IN (
      'created',
      'available',
      'opened',
      'rejected',
      'expired',
      'signed',
      'submitted',
      'failed'
    )
  ),
  expires_at TEXT NOT NULL,
  transaction_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (provider_id, request_id),
  CHECK (transaction_id IS NULL OR transaction_id = upper(transaction_id))
);

CREATE INDEX wallet_handoffs_slot_created_idx
ON wallet_handoffs(payment_slot_id, created_at DESC);

CREATE UNIQUE INDEX wallet_handoffs_one_active_per_slot_idx
ON wallet_handoffs(payment_slot_id)
WHERE status IN ('created', 'available', 'opened', 'signed', 'submitted');
