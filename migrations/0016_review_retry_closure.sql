ALTER TABLE payment_slots ADD COLUMN retry_authorized_at TEXT;
ALTER TABLE payment_slots ADD COLUMN retry_authorization_json TEXT;

CREATE TABLE bill_management_actions (
  id TEXT PRIMARY KEY NOT NULL,
  bill_id TEXT NOT NULL,
  payment_slot_id TEXT,
  action_type TEXT NOT NULL CHECK (
    action_type IN ('retry_authorized', 'closed_incomplete')
  ),
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (bill_id) REFERENCES bills(id),
  FOREIGN KEY (payment_slot_id) REFERENCES payment_slots(id)
);

CREATE INDEX bill_management_actions_bill_created_idx
ON bill_management_actions(bill_id, created_at);

CREATE INDEX payment_slots_retry_authorized_idx
ON payment_slots(retry_authorized_at, updated_at);

CREATE TRIGGER bills_closed_incomplete_cannot_reopen
BEFORE UPDATE OF closure_state ON bills
FOR EACH ROW
WHEN OLD.closure_state = 'closed_incomplete'
  AND NEW.closure_state <> 'closed_incomplete'
BEGIN
  SELECT RAISE(ABORT, 'closed incomplete Bills cannot be reopened');
END;

CREATE TRIGGER payment_slots_paid_cannot_be_reopened
BEFORE UPDATE OF status ON payment_slots
FOR EACH ROW
WHEN OLD.status = 'paid' AND NEW.status <> 'paid'
BEGIN
  SELECT RAISE(ABORT, 'paid PaymentSlots cannot be reopened');
END;
