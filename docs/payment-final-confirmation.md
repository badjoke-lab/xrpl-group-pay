# XRPL Group Pay — Participant Final Confirmation

**Status:** Active  
**Scope:** Current participant confirmation with approved wallet- and asset-aware amendments  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Purpose

A participant must see and explicitly confirm the complete frozen Payment Intent before the application creates a short-lived Wallet Handoff.

Loading a participant link does not create a provider request, mutate the PaymentSlot, or move funds.

## 2. Capability-bound details

The details endpoint:

- receives the participant capability through the protected request contract;
- performs a read-only Bill and PaymentSlot lookup;
- requires the Bill and slot to remain eligible;
- returns `Cache-Control: no-store`;
- does not create a Wallet Handoff or change state.

## 3. Frozen fields shown

- Bill title;
- optional participant label;
- Accounting Currency obligation;
- Settlement Asset and exact Settlement Amount;
- network and Payment Rail;
- destination account;
- expected payer account;
- optional Destination Tag, including explicit absence;
- Source Tag;
- InvoiceID;
- selected Wallet Provider;
- Bill revision.

For RLUSD, the interface also shows official asset identity, issuer access, and that the network fee is paid in XRP.

## 4. Interaction boundary

```text
Open participant capability
  -> load frozen details without writes
  -> review assigned obligation and Settlement Asset
  -> open final confirmation
  -> confirm exact Payment Intent
  -> create short-lived Wallet Handoff
  -> inspect and approve in the wallet
  -> verify the submitted transaction on a validated ledger
```

Only the explicit final action creates the provider request.

## 5. Wallet Provider boundary

Xaman is the Make Waves v1 provider. The UI may use provider-specific wording when Xaman is selected, while the domain action remains `Create Wallet Handoff`.

A future provider uses the same frozen Payment Intent and confirmation fields. Provider status is never presented as verified settlement.

## 6. Fund movement

Creating or opening a Wallet Handoff does not move funds. XRP or RLUSD moves directly from payer to Bill destination only after wallet approval and transaction submission.

Group Pay does not hold the settlement asset and cannot sign for the payer.

## 7. State handling

- invalid or unknown capabilities reveal no payment details;
- an already-paid slot returns a completed state without reopening payment;
- an ineligible Bill or slot fails closed;
- rejected and expired handoffs require another final review;
- submitted payments continue into ledger verification;
- provider failure leaves frozen details available for safe retry;
- retry cannot change asset, amount, destination, tags, InvoiceID, network, or revision.

## 8. Localization

The same PaymentSlot may be reviewed in English, Japanese, or Korean. Locale changes labels and formatting only. Canonical amounts, addresses, asset identity, issuer, tags, InvoiceID, and serialized Payment Intent remain unchanged.

## 9. Configuration boundary

Reading frozen details does not require Wallet Provider credentials. Provider configuration is required only when the confirmed handoff is created. Asset Registry and Source Tag configuration are required for details and verification.
