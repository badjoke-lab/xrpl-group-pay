# XRPL Group Pay — Bill Review and Freeze Boundary

**Status:** Active  
**Scope:** Approved role-aware and mode-aware Bill review contract  
**Last reviewed:** 2026-07-01  
**Document class:** Public

## 1. Purpose

A Bill operator reviews a shared Bill before the application freezes settlement conditions and issues payer capabilities.

Review prevents an accidental payment mode, recipient, asset, issuer, allocation, payer, tag, or amount from becoming signable.

The Bill operator is not assumed to be the recipient or a payer.

## 2. Browser-local draft

Before final confirmation, the draft remains browser-local and cannot receive Payments.

The draft contains:

- payment mode;
- Bill title;
- network;
- recipient display name;
- recipient XRPL address and optional Destination Tag;
- Accounting Currency and Settlement Asset;
- Bill total;
- recipient-funded amount in representative mode only;
- Allocation Strategy, metadata, and remainder policy;
- payer labels, expected addresses, and final obligations;
- whether the Bill operator is included as a normal payer in direct mode;
- RLUSD recipient-readiness result where applicable;
- default shared-instruction locale.

The current step and entered values remain available after contextual help, Guide viewing, validation failure, or page reload in the active tab. The draft is removed after successful creation or explicit discard.

## 3. Mode-specific invariants

### Representative mode

```text
recipient_funded_units
+ sum(payment_slot.obligation_units)
= bill.total_obligation_units
```

The recipient-funded amount creates no PaymentSlot and no transfer.

### Direct mode

```text
recipient_funded_units = 0
sum(payment_slot.obligation_units)
= bill.total_obligation_units
```

The Bill operator participates only by being added as a normal payer.

### Shared validation

- expected payer addresses are unique within one Bill;
- the recipient address cannot also be an expected payer address;
- every payer amount is positive;
- the payment mode is frozen at publication;
- direct mode rejects a recipient-funded amount.

## 4. Allocation states

The editor performs fixed-precision calculations and shows:

```text
incomplete
under
exact
over
```

Equal, Percentage, Shares, and Custom Amount strategies must produce one exact normalized allocation result before server review.

Remainder handling follows the selected mode. Direct mode cannot assign a remainder to the recipient-funded amount.

## 5. No-write server review

The browser sends the complete draft to the review endpoint.

The endpoint:

- validates schema, mode, network, addresses, tags, asset identity, precision, strategy inputs, and exact allocation;
- enforces the applicable mode invariant;
- checks payer-address uniqueness and recipient separation;
- checks the official Asset Registry entry;
- normalizes financial values to integer units;
- checks RLUSD recipient readiness when selected;
- returns a normalized review snapshot;
- uses `Cache-Control: no-store`;
- creates no durable Bill, PaymentSlot, capability, Wallet Handoff, or receipt.

## 6. Final confirmation

The review screen shows:

- payment mode;
- network;
- Bill title;
- Accounting Currency and Settlement Asset;
- official RLUSD issuer information when applicable;
- recipient and optional tag;
- Bill total;
- recipient-funded amount with a **No transfer** label when applicable;
- amount expected from payers;
- Allocation Strategy and remainder handling;
- every payer, expected address, and final obligation;
- whether the Bill operator is also a payer;
- recipient-readiness result;
- warning that publication freezes payment conditions.

Only the explicit create-payment-links action publishes the Bill. The action must not imply that any Payment has completed.

## 7. Freeze result

After successful creation:

- the Bill is stored as `open` revision 1;
- mode, network, recipient, tags, currency, asset, total, recipient-funded amount, allocation output, payer addresses, and obligations are frozen;
- every PaymentSlot receives a unique InvoiceID and payer capability;
- management, redacted progress, and payer links are returned;
- a separate recipient-readiness link may be returned for RLUSD preparation;
- no asset moves during review or creation.

A published Bill cannot change mode, recipient, payer, amount, network, asset, tag, or InvoiceID.

Changing a frozen fact requires copy-to-revise and a new Bill with new payment-critical identities.

## 8. Capability review

The created-Bill screen distinguishes:

- management capability;
- redacted progress capability;
- payer payment capabilities;
- recipient RLUSD-preparation capability where applicable.

Each capability states its intended audience and privacy boundary. Payer instructions never include the management capability.

## 9. Make Waves v1 constraint

```text
Accounting Currency = Settlement Asset
One Bill = One Settlement Asset
One Bill = One frozen recipient
```

Fiat-denominated, mixed-asset, and multiple-recipient settlement remain later extensions.

## 10. Failure behavior

Invalid input returns a specific error. An unavailable review remains retryable and creates no durable Bill.

A failed final creation leaves the browser-local draft available for retry or editing. Repeated review calls have no persistence side effects.

A readiness service outage is distinct from a confirmed recipient-readiness failure.
