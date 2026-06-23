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
- First verification timestamp.
- First receipt timestamp.
- SHA-256 digest of the stable Payment facts.

The digest does not include verification or receipt timestamps. A later verification of the same ledger transaction therefore matches the original receipt.

## Idempotency rules

- `network + transaction_id` is unique.
- `network + invoice_id` is unique.
- A repeated observation of the same Payment facts returns the original receipt as `existing`.
- The original timestamps are preserved.
- Different Payment facts for an existing transaction are rejected.
- Reusing an InvoiceID for another transaction is rejected.
- Storage failure prevents a verified success response.

## Database checks

The migration checks identifier format, tag ranges, non-negative ledger indexes, decimal drop strings, matching expected and delivered drops, and receipt ID consistency.

## Not implemented in this migration

- Bill records.
- Participant payment slots.
- Creator-management capabilities.
- Participant capabilities.
- Xaman payload lifecycle persistence.
- Bill-level `paid` state transitions.
- Retention and deletion jobs.

A stored receipt proves that a Payment was verified and durably deduplicated. It does not yet prove that a specific bill or participant slot was atomically marked paid.
