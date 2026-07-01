# XRPL Group Pay — Payer Final Confirmation

**Status:** Active  
**Scope:** Approved payer confirmation, readiness, handoff, and recovery boundary  
**Last reviewed:** 2026-07-01  
**Document class:** Public

## 1. Purpose

A payer must see and explicitly confirm the complete frozen Payment Intent before the application creates a short-lived Wallet Handoff.

Loading a payer capability does not create a provider request, mutate the PaymentSlot, or move funds.

## 2. Capability-bound details

The details endpoint:

- receives the payer capability through the protected request contract;
- performs a read-only Bill and PaymentSlot lookup;
- requires the Bill and slot to remain eligible;
- returns `Cache-Control: no-store`;
- does not create a Wallet Handoff or change state;
- reveals only the frozen slot and approved Bill context.

## 3. Frozen fields shown

- Bill title;
- optional payer label;
- payment mode;
- Accounting Currency obligation;
- Settlement Asset and exact Settlement Amount;
- network and Payment Rail;
- recipient account;
- expected payer account;
- optional Destination Tag, including explicit absence;
- Source Tag;
- InvoiceID;
- selected Wallet Provider;
- Bill revision.

For RLUSD, the interface also shows official asset identity, issuer access, trust-line readiness, and that fees and reserve requirements use XRP.

## 4. Readiness boundary

Before Payment handoff creation, the application may check:

- recipient readiness for official RLUSD;
- payer official RLUSD trust line;
- payer RLUSD balance;
- payer spendable XRP for the Payment, fee, and reserve constraints.

Readiness is preflight information. It does not move funds, approve a transaction, or replace validated-ledger verification.

A transient readiness outage is shown as unavailable and does not falsely claim a missing trust line or insufficient balance.

## 5. TrustSet preparation

When the official RLUSD trust line is missing, Group Pay may prepare a separate Xaman-reviewed TrustSet request.

The payer must be told that:

- TrustSet is wallet configuration, not the Bill Payment;
- it does not transfer the Bill amount;
- it does not add RLUSD balance;
- XRP may be required for fees and reserve;
- Payment remains unavailable until XRPL confirms readiness and all other prerequisites pass.

A TrustSet request never marks the PaymentSlot paid.

## 6. Interaction boundary

```text
Open payer capability
  -> load frozen details without writes
  -> check readiness
  -> complete TrustSet setup when required
  -> review assigned obligation and Settlement Asset
  -> open final confirmation
  -> confirm exact Payment Intent
  -> create or resume short-lived Wallet Handoff
  -> inspect and approve in the wallet
  -> verify the submitted transaction on a validated ledger
```

Only the explicit final Payment action creates a Payment Wallet Handoff.

## 7. Wallet Provider boundary

Xaman is the Make Waves v1 provider. The UI may use provider-specific wording when Xaman is selected, while the domain action remains `Create Wallet Handoff`.

A future provider uses the same frozen Payment Intent and confirmation fields. Provider status is never presented as verified settlement.

An existing active handoff is resumed rather than silently replaced.

## 8. Fund movement

Creating or opening a Wallet Handoff does not move funds. XRP or RLUSD moves directly from payer to recipient only after wallet approval and transaction submission.

Group Pay does not hold the settlement asset and cannot sign for the payer.

One payer's failure or rejection does not reverse another payer's verified Payment.

## 9. State and recovery handling

- invalid or unknown capabilities reveal no payment details;
- an already-paid slot returns a completed state without reopening Payment;
- a closed Bill or slot fails terminally;
- rejected and expired handoffs require another final review and reconciliation before replacement;
- submitted Payments continue into ledger verification and block another Payment;
- temporary provider or XRPL failure uses wait-and-recheck;
- confirmed readiness blockers use setup-required;
- mismatches with possible value movement use needs-review;
- retry cannot change mode, asset, amount, recipient, payer, tags, InvoiceID, network, or revision.

## 10. Public status and action

| Status | Allowed primary action |
|---|---|
| Unpaid | Continue to readiness and final review |
| Waiting for Xaman | Resume QR or deep link; refresh state |
| Verifying on XRPL | Recheck the same transaction; do not pay again |
| Paid | View verified result and proof |
| Retry required | Retry only after the approved reconciliation path |
| Needs review | Stop and contact the Bill operator |
| Closed | No new Payment |

## 11. Contextual help and Guide

Readiness, fees, TrustSet, rejection, expiry, pending verification, failure, mismatch, and duplicate states provide contextual help in the active view.

Opening help:

- does not leave the payer route;
- does not stop verification polling;
- does not expose the payer capability to `/guide`;
- opens the full Guide in a separate protected tab only when requested.

## 12. Localization

The same PaymentSlot may be reviewed in English, Japanese, or Korean. Locale changes labels, help, and formatting only.

Canonical amounts, addresses, mode, asset identity, issuer, tags, InvoiceID, readiness results, recovery classification, and serialized Payment Intent remain unchanged.

## 13. Configuration boundary

Reading frozen details does not require Wallet Provider credentials. Provider configuration is required only when a confirmed handoff is created or resumed.

Asset Registry and Source Tag configuration are required for details and verification. Readiness configuration is required only for the relevant preflight or TrustSet flow.
