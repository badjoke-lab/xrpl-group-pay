CREATE TRIGGER verified_payment_receipts_uppercase_insert
BEFORE INSERT ON verified_payment_receipts
FOR EACH ROW
WHEN
  NEW.transaction_id COLLATE BINARY <> upper(NEW.transaction_id)
  OR NEW.invoice_id COLLATE BINARY <> upper(NEW.invoice_id)
BEGIN
  SELECT RAISE(ABORT, 'verified receipt identifiers must be uppercase');
END;

CREATE TRIGGER verified_payment_receipts_uppercase_update
BEFORE UPDATE OF transaction_id, invoice_id ON verified_payment_receipts
FOR EACH ROW
WHEN
  NEW.transaction_id COLLATE BINARY <> upper(NEW.transaction_id)
  OR NEW.invoice_id COLLATE BINARY <> upper(NEW.invoice_id)
BEGIN
  SELECT RAISE(ABORT, 'verified receipt identifiers must be uppercase');
END;
