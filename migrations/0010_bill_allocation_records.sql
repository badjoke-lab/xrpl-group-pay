CREATE TABLE bill_allocations (
  bill_id TEXT PRIMARY KEY NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  contract_version TEXT NOT NULL CHECK (
    contract_version = 'xrpl-group-pay:bill-allocation:v1'
  ),
  strategy TEXT NOT NULL CHECK (
    strategy IN ('custom', 'equal', 'percentage', 'shares')
  ),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  weight_scale INTEGER CHECK (
    weight_scale IS NULL OR (weight_scale >= 0 AND weight_scale <= 18)
  ),
  weight_total_units TEXT CHECK (
    weight_total_units IS NULL
    OR (
      weight_total_units <> ''
      AND weight_total_units NOT GLOB '*[^0-9]*'
      AND weight_total_units <> '0'
      AND weight_total_units NOT LIKE '0%'
    )
  ),
  remainder_units TEXT NOT NULL CHECK (
    remainder_units <> ''
    AND remainder_units NOT GLOB '*[^0-9]*'
    AND (remainder_units = '0' OR remainder_units NOT LIKE '0%')
  ),
  remainder_kind TEXT NOT NULL CHECK (
    remainder_kind IN (
      'none',
      'creator',
      'first_participant',
      'selected_participant',
      'manual'
    )
  ),
  remainder_participant_id TEXT,
  created_at TEXT NOT NULL,
  CHECK (
    (strategy = 'percentage' AND weight_scale IS NOT NULL AND weight_total_units IS NOT NULL)
    OR
    (strategy = 'shares' AND weight_scale IS NULL AND weight_total_units IS NOT NULL)
    OR
    (strategy IN ('custom', 'equal') AND weight_scale IS NULL AND weight_total_units IS NULL)
  ),
  CHECK (
    (remainder_units = '0' AND remainder_kind = 'none' AND remainder_participant_id IS NULL)
    OR
    (remainder_units <> '0' AND remainder_kind = 'creator' AND remainder_participant_id IS NULL)
    OR
    (remainder_units <> '0' AND remainder_kind IN ('first_participant', 'selected_participant') AND remainder_participant_id IS NOT NULL)
    OR
    (remainder_units <> '0' AND remainder_kind = 'manual' AND remainder_participant_id IS NULL)
  )
) STRICT;

CREATE TABLE bill_allocation_participants (
  bill_id TEXT NOT NULL REFERENCES bill_allocations(bill_id) ON DELETE CASCADE,
  payment_slot_id TEXT NOT NULL UNIQUE REFERENCES payment_slots(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  input_units TEXT CHECK (
    input_units IS NULL
    OR (
      input_units <> ''
      AND input_units NOT GLOB '*[^0-9]*'
      AND (input_units = '0' OR input_units NOT LIKE '0%')
    )
  ),
  base_amount_units TEXT NOT NULL CHECK (
    base_amount_units <> ''
    AND base_amount_units NOT GLOB '*[^0-9]*'
    AND (base_amount_units = '0' OR base_amount_units NOT LIKE '0%')
  ),
  remainder_increment_units TEXT NOT NULL CHECK (
    remainder_increment_units <> ''
    AND remainder_increment_units NOT GLOB '*[^0-9]*'
    AND (
      remainder_increment_units = '0'
      OR remainder_increment_units NOT LIKE '0%'
    )
  ),
  final_amount_units TEXT NOT NULL CHECK (
    final_amount_units <> ''
    AND final_amount_units NOT GLOB '*[^0-9]*'
    AND final_amount_units <> '0'
    AND final_amount_units NOT LIKE '0%'
  ),
  created_at TEXT NOT NULL,
  PRIMARY KEY (bill_id, participant_id)
) STRICT;

INSERT INTO bill_allocations (
  bill_id,
  contract_version,
  strategy,
  revision,
  weight_scale,
  weight_total_units,
  remainder_units,
  remainder_kind,
  remainder_participant_id,
  created_at
)
SELECT
  id,
  'xrpl-group-pay:bill-allocation:v1',
  'custom',
  1,
  NULL,
  NULL,
  '0',
  'none',
  NULL,
  created_at
FROM bills;

INSERT INTO bill_allocation_participants (
  bill_id,
  payment_slot_id,
  participant_id,
  input_units,
  base_amount_units,
  remainder_increment_units,
  final_amount_units,
  created_at
)
SELECT
  bill_id,
  id,
  public_id,
  COALESCE(expected_amount_units, expected_amount_drops),
  COALESCE(expected_amount_units, expected_amount_drops),
  '0',
  COALESCE(expected_amount_units, expected_amount_drops),
  created_at
FROM payment_slots;

CREATE INDEX bill_allocations_strategy_idx
ON bill_allocations(strategy, created_at);

CREATE INDEX bill_allocation_participants_bill_idx
ON bill_allocation_participants(bill_id, payment_slot_id);
