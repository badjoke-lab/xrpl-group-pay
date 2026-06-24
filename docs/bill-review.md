# XRPL Group Pay — Bill Review and Freeze Boundary

**Status:** Active  
**Scope:** Current creator review with approved asset and allocation amendments  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Purpose

A creator reviews a shared Bill before the application freezes settlement conditions and issues participant capabilities.

Review prevents an accidental destination, asset, issuer, allocation, payer, tag, or amount from immediately becoming a signable request.

## 2. Draft boundary

Before final confirmation, the draft remains browser-local and cannot receive payments.

The approved v1 draft contains:

- Bill title;
- network;
- destination and optional Destination Tag;
- Accounting Currency;
- Settlement Asset;
- total and creator share;
- Allocation Strategy;
- allocation metadata and remainder policy;
- participant labels;
- expected payer addresses;
- final participant obligations;
- RLUSD recipient readiness where applicable;
- default shared-link locale.

## 3. Allocation states

The editor performs fixed-precision calculations without floating-point authority and shows:

```text
incomplete
under
exact
over
```

Equal, Percentage, Shares, and Custom Amount strategies must all produce one exact normalized allocation result before server review.

## 4. Server review

The browser sends the complete draft to the no-write review endpoint.

The endpoint:

- validates schema, network, address, tags, asset identity, amount precision, strategy inputs, and exact allocation;
- checks the official Asset Registry entry;
- normalizes financial values to integer units;
- verifies RLUSD recipient readiness when selected;
- trims labels and addresses;
- returns a normalized review snapshot;
- uses `Cache-Control: no-store`;
- does not create identifiers, capabilities, wallet handoffs, or receipts.

## 5. Final confirmation

The review screen shows:

- network;
- Bill title;
- Accounting Currency and Settlement Asset;
- full asset details for RLUSD, including verified official issuer access;
- destination and optional tag;
- total and creator share;
- Allocation Strategy and remainder handling;
- every participant, expected payer, and final obligation;
- recipient readiness result where applicable;
- warning that the next action freezes payment conditions.

Only the explicit freeze-and-create action publishes the Bill.

## 6. Freeze result

After successful creation:

- the Bill is stored as `open` revision 1;
- network, destination, tags, currency, asset, total, creator share, allocation output, payer addresses, and obligations are frozen;
- every PaymentSlot receives a unique InvoiceID and capability;
- creator, progress, and participant links are returned;
- no asset moves during review or creation.

A published Bill cannot switch between XRP and RLUSD. A change of Settlement Asset requires a new Bill or a later defined revision flow that invalidates earlier handoffs.

## 7. Make Waves v1 constraint

```text
Accounting Currency = Settlement Asset
One Bill = One Settlement Asset
```

Fiat-denominated and mixed-asset settlement remain later extensions.

## 8. Failure behavior

Invalid input returns a specific error. An unavailable review remains retryable and creates no durable Bill. A failed final creation leaves the normalized review available for retry or editing. Repeated review calls have no persistence side effects.
