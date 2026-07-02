# XRPL Group Pay — Review, Retry Authorization, and Incomplete Closure

**Status:** Active  
**Scope:** Current implementation for PR #146  
**Last reviewed:** 2026-07-03  
**Document class:** Public

## 1. Purpose

This contract defines how XRPL Group Pay handles PaymentSlots that cannot be accepted as paid automatically, how a Bill operator may explicitly authorize another payer attempt, and how a Bill may be closed incomplete without weakening validated-ledger verification.

The management capability never provides a manual “mark paid” control. A PaymentSlot becomes paid only through the existing verified settlement path.

## 2. Review-required observations

A PaymentSlot enters review when verified transaction facts do not match the frozen PaymentSlot or when more than one validated transaction matches the same frozen payment identity.

The review record preserves:

- the normalized reason code;
- the observed transaction identifier or candidate identifiers;
- the observation message;
- the observation time;
- reviewed ledger bounds where reconciliation supplied them.

The management view shows frozen expected facts beside observed facts:

- expected payer address;
- frozen recipient address;
- frozen amount and Asset;
- frozen InvoiceID;
- observed transaction identifier or candidate identifiers;
- review reason.

Explorer links are built only from the transaction identifier and frozen XRPL network. They never include management, progress, or participant capability values.

## 3. Retry authorization

A review-required PaymentSlot cannot silently return to `unpaid`.

Before another attempt can be authorized, the Bill operator must explicitly acknowledge both statements:

1. a prior transaction may already have moved value;
2. authorizing another attempt may cause a repeated payment.

The authorization is written to the audit log and the PaymentSlot stores the authorization time and acknowledgement record. The prior review reason and observed facts remain preserved.

Authorization does not create a wallet handoff. The payer must use the private participant payment link and sign for themselves.

Before any replacement handoff is created, Group Pay still reconciles validated ledger history. A matching validated payment settles the slot instead of creating another request. Multiple matching payments return the slot to review.

## 4. Incomplete closure

An active, unsettled Bill may be closed incomplete through the private management capability.

Closure requires:

- a selected normalized closure reason;
- acknowledgement that new Payments will stop;
- acknowledgement that Group Pay does not reverse or automatically refund validated transfers;
- the exact typed confirmation `CLOSE_INCOMPLETE`.

After closure:

- the Bill state is `closed_incomplete`;
- all unpaid PaymentSlots receive a closure timestamp;
- new wallet handoffs are blocked by the Bill state;
- verified receipts and paid transaction facts remain unchanged;
- the Bill cannot be reopened;
- a paid PaymentSlot cannot be reverted to another status.

The management view shows paid count, verified amount, unpaid amount, and the no-refund disclosure.

## 5. Persistence and audit

`bill_management_actions` records the following actions:

- `retry_authorized` with PaymentSlot identity, prior status, prior reason, and warning acknowledgement;
- `closed_incomplete` with closure reason, closure time, payment-stop meaning, and no-automatic-refund meaning.

PaymentSlot review observations remain in `review_reason_code` and `review_details_json`. Retry authorization is stored separately so authorization cannot erase the evidence that required review.

## 6. Capability and privacy boundary

Only an admin capability can load review diagnostics or submit retry and closure actions.

The read-only progress capability continues to hide:

- payer labels;
- expected payer addresses;
- InvoiceIDs;
- review details;
- retry authorization controls;
- closure controls.

Malformed or unknown management capabilities do not expose Bill existence.

## 7. Failure behavior

The implementation fails closed when:

- either retry warning is not acknowledged;
- the PaymentSlot is no longer review-actionable;
- the Bill is settled or already closed;
- closure confirmation is incomplete;
- storage cannot atomically write the action and state change;
- the management capability is missing or invalid.

A retry authorization never asserts that an observed transaction failed to transfer value. It only records that the operator accepted the repeated-payment risk and allows the existing reconciliation-gated payer flow to be attempted again.

## 8. Reviewed specifications

This implementation was reviewed against:

- `state-machine.md`;
- `payment-reconciliation.md`;
- `non-custodial-boundary.md`;
- `threat-model.md`;
- `privacy-data-map.md`;
- `ui-ux-spec.md`;
- `payment-failure-taxonomy.md`;
- `operator-progress-dashboard.md`.
