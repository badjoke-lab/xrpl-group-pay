# XRPL Group Pay — Participant Final Confirmation

**Status:** Active  
**Document class:** Public  
**Initial network:** XRPL Testnet

## 1. Purpose

A participant must see and explicitly confirm the complete frozen Payment conditions before XRPL Group Pay creates a short-lived Xaman Sign Request.

Loading a participant link must not itself create a Xaman payload, change the PaymentSlot state, or move XRP.

## 2. Capability-bound details

The browser sends the payment capability in the JSON body of:

```text
POST /api/payments/details
```

The endpoint:

- hashes the capability before database lookup;
- performs a read-only PaymentSlot and Bill query;
- requires the slot and Bill to remain eligible for a new Sign Request;
- returns `Cache-Control: no-store`;
- does not place the capability in a URL query string;
- does not create or update a Xaman payload;
- does not change Bill or PaymentSlot state.

## 3. Frozen fields shown to the participant

The participant details and final-confirmation screens show:

- Bill title;
- optional participant label;
- XRP amount;
- destination XRPL account;
- expected payer XRPL account;
- optional Destination Tag, including explicit absence;
- configured Source Tag;
- PaymentSlot InvoiceID;
- Testnet network.

These values come from the stored Bill and PaymentSlot plus the deployment Source Tag. They cannot be edited from the participant route.

## 4. Interaction boundary

The participant flow is:

```text
Open private payment capability
  -> Load frozen details without writes
  -> Review assigned share
  -> Open final confirmation
  -> Confirm exact Testnet fields
  -> Create short-lived Xaman Sign Request
  -> Inspect and approve in Xaman
  -> Verify the submitted transaction on a validated ledger
```

The first action only moves from details to final confirmation. It does not contact Xaman.

Only **Create Xaman Sign Request** calls the payload-creation endpoint.

## 5. Fund movement

Creating or opening a Sign Request does not by itself transfer XRP. XRP moves directly from the payer account to the Bill destination only after the payer approves the exact transaction in Xaman and it is submitted.

XRPL Group Pay never holds the XRP or signs for the payer.

## 6. State handling

- Invalid or unknown capabilities reveal no Payment details.
- An already-paid slot returns a completed state without re-exposing its private expected conditions.
- A Bill or slot that cannot accept a new payload fails closed.
- Rejected and expired requests require another final review before replacement.
- Submitted payments continue into validated-ledger verification.
- A payload-creation failure leaves the frozen details available for review and retry.

## 7. Configuration boundary

Reading frozen Payment details requires the configured XRPL Source Tag but does not require Xaman API credentials. Xaman credentials are required only when the confirmed Sign Request is created.
