# XRPL Group Pay — Operator Progress Dashboard

**Status:** Active  
**Scope:** Current implementation for PR #145  
**Last reviewed:** 2026-07-02  
**Document class:** Public

## 1. Purpose

The Bill progress surface shows collection facts derived from frozen PaymentSlots and validated XRPL settlement records. It does not treat a wallet callback, signature request, or submitted transaction as payment completion.

## 2. Mode-correct totals

The progress response and interface distinguish:

- Bill total;
- recipient-funded amount;
- amount expected from payer PaymentSlots;
- verified amount;
- remaining amount;
- verified and remaining payer counts.

For a representative-recipient Bill:

`Bill total = recipient-funded amount + payer PaymentSlot total`

For a direct-recipient Bill:

`recipient-funded amount = 0`

and:

`Bill total = payer PaymentSlot total`

The server fails closed when stored mode, recipient-funded amount, Bill total, and PaymentSlot totals do not satisfy these identities.

## 3. Capability scopes

### Management capability

The management view may show:

- recipient label;
- payer label;
- expected payer address;
- frozen InvoiceID;
- frozen amount;
- normalized review reason code;
- transaction identity, ledger index, confirmation time, and proof link when verified.

The management link is private. The interface allows the operator to copy it for private storage but explicitly warns against sending it to payers or publishing it.

### Read-only progress capability

The read-only view hides:

- recipient label;
- payer labels;
- expected payer addresses;
- InvoiceIDs;
- review reason diagnostics.

It may show aggregate totals, redacted slot numbers, semantic statuses, verified transaction identifiers, confirmation times, approved XRPL Explorer links, and public proof links.

## 4. Safe payer actions

Each PaymentSlot shows exactly one state-specific explanation:

- unpaid: use the private participant link created with the Bill;
- awaiting signature: wait for the payer to approve the existing request;
- rejected or expired: ask the payer to reopen the private link; reconciliation still precedes replacement;
- submitted or validating: do not request a second payment; refresh the same attempt;
- review required or verification failed: do not request another payment until review is complete;
- paid: no action required;
- closed Bill: no new Payment can be started.

The Bill operator never receives a control that opens Xaman or signs a Payment on behalf of a payer.

## 5. Status and links

Group and PaymentSlot states use the shared semantic status system. Verified slots may show:

- an official XRPL Explorer transaction link selected from the frozen network;
- a public proof link when a durable proof capability exists.

Explorer and proof links do not contain management, progress, or participant capability values.

## 6. Refresh and timestamps

Progress is a no-store snapshot. The user can refresh the current capability-bound view. The interface shows the Bill snapshot update time, PaymentSlot update time, and validated confirmation time where available.

## 7. Reviewed specifications

This implementation was reviewed against:

- `state-machine.md`;
- `privacy-data-map.md`;
- `screen-inventory.md`;
- `ui-ux-spec.md`;
- `localization.md`;
- `non-custodial-boundary.md`;
- `payment-reconciliation.md`.
