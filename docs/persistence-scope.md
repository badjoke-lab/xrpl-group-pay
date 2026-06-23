# XRPL Group Pay — Persistence Scope

## Current durable record

A verified Payment receipt is created only after the server has re-fetched the Xaman payload and matched it against a validated XRPL Testnet transaction.

Stored fields:

- Network.
- Transaction ID.
- InvoiceID.
- Ledger index.
- Sender and destination.
- Expected and delivered drops.
- Source Tag and optional Destination Tag.
- Verification timestamp.
- Receipt timestamp.
- SHA-256 digest of the normalized proof.

## Idempotency rules

- `network + transaction_id` is unique.
- `network + invoice_id` is unique.
- An exact retry returns the original receipt as `existing`.
- The original `recorded_at` value is preserved.
- Different facts for an existing transaction are rejected.
- Reusing an InvoiceID for another transaction is rejected.
- Storage failure prevents a verified success response.

## Not implemented in this migration

- Bill records.
- Participant payment slots.
- Creator-management capabilities.
- Participant capabilities.
- Xaman payload lifecycle persistence.
- Bill-level `paid` state transitions.
- Retention and deletion jobs.

A stored receipt proves that a Payment was verified and durably deduplicated. It does not yet prove that a specific bill or participant slot was atomically marked paid.
