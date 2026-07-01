# XRPL Group Pay — Durable Xaman Lifecycle

**Status:** Active  
**Scope:** PR #135 Wallet Handoff persistence, synchronization, and resume behavior  
**Last reviewed:** 2026-07-02  
**Document class:** Public

## 1. Purpose

XRPL Group Pay stores the lifecycle of each Xaman Wallet Handoff so that payer and progress views remain consistent across reloads, delayed callbacks, and temporary browser disconnection.

A Xaman lifecycle state is not payment proof. Only validated XRPL ledger verification against the frozen PaymentSlot can mark a slot paid.

## 2. Durable states

The stored Wallet Handoff states are:

```text
created
available
opened
signed
submitted
rejected
expired
failed
```

The corresponding PaymentSlot presentation state is updated without changing frozen payment facts.

- `created`, `available`, `opened`, and `signed` map to signature waiting;
- `submitted` maps to submitted and awaiting ledger verification;
- `rejected` maps to payer cancellation;
- `expired` maps to expired handoff;
- `failed` maps to verification failure.

`submitted` never maps directly to `paid`.

## 3. Synchronization sources

Lifecycle observations may arrive from:

1. a signature-verified Xaman callback;
2. payer polling of the Xaman payload endpoint;
3. a browser focus, visibility, or WebSocket-triggered refresh.

Callbacks do not write their notification fields directly as authoritative state. After signature verification, the application retrieves the current payload from Xaman and normalizes that response through the same synchronization path used by polling.

## 4. Ordering and idempotency

Lifecycle updates are monotonic for active states:

```text
created → available → opened → signed → submitted
```

Duplicate observations are safe.

Delayed observations cannot regress a submitted handoff to rejected, expired, opened, or signed. A provider-confirmed submitted observation containing a transaction identifier may be accepted after an earlier rejected or expired observation so the transaction can still be checked on XRPL.

Database updates compare the previously read state before writing. Concurrent observations that race are re-read rather than blindly overwriting newer state.

## 5. Resume behavior

New Xaman handoffs persist the participant-facing launch information required to resume:

- mobile or browser deep link;
- QR image URL;
- WebSocket status channel;
- provider metadata;
- expiry and last synchronization time.

When a payer requests a handoff and one is still active, the application returns the existing launch information instead of creating a duplicate Xaman payload.

Legacy active records that do not contain resumable launch information are not duplicated automatically. They remain blocked until their state becomes safely retryable or is reconciled.

## 6. Expiry and retry

Only unsigned active handoffs in `created`, `available`, or `opened` are expired solely from their stored expiry time.

A `signed` or `submitted` handoff is not discarded merely because the original QR expiry time passed. The application continues to synchronize and, for a submitted transaction, proceeds to validated-ledger verification.

After `rejected` or `expired` is durably stored, the slot is eligible for the existing reconciliation-before-replacement flow. Before a replacement handoff is created, XRPL history is checked to prevent duplicate payment.

## 7. Security boundaries

- callback signatures are verified before processing;
- unknown payload identifiers are not fetched from Xaman through the public status route;
- capability tokens are not stored in Wallet Handoff records;
- Wallet Handoff status cannot bypass PaymentSlot verification;
- paid and review-required slots are not overwritten by lifecycle synchronization;
- transaction identifiers are normalized before storage;
- Mainnet and Testnet remain separated by the stored intent and handoff network.

## 8. Validation

Required coverage includes:

- active QR and deep-link resume;
- available, opened, signed, submitted, rejected, and expired normalization;
- duplicate callback idempotency;
- delayed callback non-regression;
- late submitted observation after expiry;
- submitted state remaining distinct from paid;
- rejected and expired replacement eligibility;
- callback and polling synchronization using the same state service;
- unknown payload rejection before a provider request;
- migration and D1 compatibility.
