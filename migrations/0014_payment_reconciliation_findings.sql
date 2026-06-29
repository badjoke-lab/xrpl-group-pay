CREATE TABLE payment_reconciliation_findings (
  id TEXT PRIMARY KEY NOT NULL,
  payment_slot_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  finding_type TEXT NOT NULL CHECK (
    finding_type IN ('multiple_validated_matches')
  ),
  match_count INTEGER NOT NULL CHECK (match_count >= 2),
  transaction_ids_json TEXT NOT NULL,
  reviewed_ledger_min INTEGER NOT NULL,
  reviewed_ledger_max INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (payment_slot_id) REFERENCES payment_slots(id),
  FOREIGN KEY (bill_id) REFERENCES bills(id)
) STRICT;

CREATE INDEX payment_reconciliation_findings_slot_created_idx
ON payment_reconciliation_findings(payment_slot_id, created_at);
