# XRPL Group Pay — Payment Mode Persistence

**Status:** Active  
**Scope:** Current PR #133 database and server-domain foundation  
**Last reviewed:** 2026-07-01  
**Document class:** Public

## 1. Stored Bill fields

The payment-lifecycle foundation stores:

```text
payment_mode
recipient_label
recipient_funded_amount_units
closure_state
closed_at
closure_reason_code
review_reason_code
review_details_json
```

PaymentSlots additionally store:

```text
review_reason_code
review_details_json
closed_at
```

## 2. Payment modes

Supported values are:

```text
representative
direct
```

Existing Bills are migrated as `representative`.

The Bill operator is not persisted as the recipient merely because the same browser created the Bill. Recipient display metadata is stored separately from the recipient XRPL address and from payer labels.

## 3. Recipient-funded compatibility

`recipient_funded_amount_units` is the canonical payment-lifecycle field.

Existing creator-share columns remain compatibility fields during this revision.

Rules:

- representative Bills may have a non-zero recipient-funded amount;
- direct Bills require zero recipient-funded amount;
- new representative Bills mirror the amount into creator-share compatibility columns;
- old Bills are backfilled from the existing creator-share value;
- public product copy uses recipient-funded semantics rather than creator-share semantics.

## 4. Server validation

Before persistence, the server rejects:

- a direct Bill with a non-zero recipient-funded amount;
- creator remainder assignment in direct mode;
- duplicate expected payer addresses;
- the recipient address used as an expected payer address;
- invalid XRPL addresses or mode-specific allocation totals.

## 5. Closure and review foundation

The migration introduces closure and structured review fields before the later management PR implements operator actions.

A Bill whose effective status is `closed_incomplete` cannot create a new Wallet Handoff.

Accepted receipts remain immutable and are not reversed by closure or review state.

## 6. Compatibility and rollout

Migration `0015_payment_lifecycle_foundation.sql` is append-only and rollout-compatible.

- existing rows receive representative mode;
- recipient-funded values are backfilled;
- old runtime writes remain valid during staged deployment;
- current XRP and RLUSD receipts and proof digests are unchanged;
- Testnet and Mainnet databases apply the same schema migration independently.

## 7. Not included in PR #133

This foundation does not yet add:

- the public payment-mode selector;
- incomplete-closure management controls;
- reviewed retry authorization;
- durable Xaman callback synchronization;
- readiness or TrustSet UI;
- Mainnet progress-route correction.

Those remain assigned to later PRs in the active revision schedule.
