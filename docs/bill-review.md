# XRPL Group Pay — Bill Review and Freeze Boundary

**Status:** Active  
**Document class:** Public  
**Initial network:** XRPL Testnet

## 1. Purpose

A creator must review a shared bill before XRPL Group Pay freezes its payment conditions and issues participant capability links.

The review step prevents an accidental destination, tag, payer, or amount from immediately becoming part of an immutable payment request.

## 2. Draft boundary

Before final confirmation, the creator draft exists only in the browser. It is not a published Bill and cannot receive payments.

The draft contains:

- bill title;
- destination address;
- optional Destination Tag;
- bill total;
- creator share;
- participant labels;
- expected payer addresses;
- participant amounts.

The creator can return from review to editing without losing these values.

## 3. Live allocation states

The editing screen calculates the allocation from decimal XRP strings without floating-point arithmetic.

It displays one of four states:

- incomplete — one or more amounts are missing or invalid;
- under — the creator share and participant amounts are below the bill total;
- exact — all allocations equal the total;
- over — allocations exceed the total.

The creator cannot request the server review until the local allocation is exact. This is a usability guard only; the server independently validates every value.

## 4. Server review

The browser sends the complete draft to:

```text
POST /api/bills/review
```

The endpoint:

- performs no database writes;
- applies the same schema, classic-address, UInt32 tag, decimal precision, positive participant amount, and exact-allocation rules used by final creation;
- converts XRP amounts to canonical drops;
- trims labels and addresses;
- returns a normalized Testnet review snapshot;
- uses `Cache-Control: no-store`.

A successful review does not reserve identifiers, create capabilities, create Xaman payloads, or move XRP.

## 5. Final confirmation

The review screen shows:

- Testnet network;
- bill title;
- destination and optional Destination Tag;
- total and creator share;
- participant count;
- every participant label, expected payer, and amount;
- a warning that the next action freezes payment conditions.

Only the explicit **Freeze bill and create payment links** action calls the Bill creation endpoint.

Final creation validates the original draft again. The review response is never trusted as authority for persistence.

## 6. Freeze result

After successful final creation:

- the Bill is stored as `open` revision 1;
- destination, tag, total, creator share, payer addresses, and participant amounts are frozen;
- each PaymentSlot receives a unique InvoiceID and capability;
- the creator receives management, read-only progress, and participant payment links.

No XRP moves during review or Bill creation.

## 7. Failure behavior

- Invalid draft fields return a specific validation message.
- An unavailable review request remains retryable and does not publish a Bill.
- A failed final creation leaves the normalized review visible so the creator can retry or return to editing.
- Repeating review requests has no persistence side effects.
