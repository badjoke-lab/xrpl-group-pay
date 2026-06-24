# XRPL Group Pay — Persistence Scope

**Status:** Active  
**Scope:** Current durable records and approved asset-aware migration direction  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Current durable records

The current application persists:

- Bills;
- PaymentSlots;
- hashed participant, progress, and creator capabilities;
- frozen XRP payment conditions;
- verified XRP payment receipts;
- accepted transaction references;
- Bill progress and settled state;
- public proof-digest lookup.

This supersedes the earlier receipt-only migration description.

## 2. Current guarantees

- `network + transaction_id` is unique;
- `network + invoice_id` is unique;
- one PaymentSlot accepts at most one receipt;
- receipt persistence, slot payment, and Bill recomputation are atomic;
- exact re-verification is idempotent;
- a conflicting transaction or InvoiceID reuse is rejected;
- storage failure prevents verified success;
- existing XRP proof digest inputs remain stable.

## 3. Current XRP receipt

Current stored XRP facts include network, transaction ID, InvoiceID, ledger index, sender, destination, requested and delivered drops, Source Tag, optional Destination Tag, timestamps, and proof digest.

Observation timestamps do not participate in the stable proof digest.

## 4. Approved asset-aware additions

A forward migration will add or normalize:

- Payment Rail;
- Accounting Currency;
- Settlement Asset ID;
- asset type, currency, and issuer;
- obligation units and scale;
- Settlement Amount units and scale;
- Allocation Strategy and metadata;
- Wallet Provider ID and request reference;
- Receipt Contract ID;
- issued-asset requested and delivered values;
- Asset Readiness result where required;
- future Settlement Quote linkage.

## 5. Compatibility

- Existing XRP Bills and PaymentSlots remain readable.
- Existing drops columns remain valid until a reviewed migration replaces or shadows them.
- Existing XRP Receipt Contract meaning and proof digests remain unchanged.
- RLUSD uses `xrpl-issued-payment-v1` rather than changing historical XRP receipts.
- New schema fields are introduced through forward migrations.
- Unsupported or incomplete asset records fail closed.

## 6. Proof lookup

Public proof is addressed through the stored digest and a unique lookup. The server validates the Receipt Contract, parses stored facts, recomputes the digest, and publishes only the contract-specific public allowlist.

## 7. Retention and deletion

Retention and deletion follow `privacy-data-map.md`. Removing off-chain Bill content does not remove XRPL facts. Deletion must not create a false history in durable settlement records.

## 8. Database checks

Migration and runtime checks cover identifier formats, network values, tags, non-negative ledger indexes, canonical integer or decimal values, exact requested/delivered matching, Receipt Contract consistency, asset identity, issuer presence rules, and unique receipt ownership.

## 9. Not yet implemented

- RLUSD storage and issued-asset receipts;
- generic Wallet Handoff persistence;
- Allocation Strategy fields;
- Accounting Currency separate from Settlement Asset;
- Settlement Quotes;
- mixed-asset Bills;
- retention and deletion jobs.

These are approved directions, not claims about current `main` behavior.
