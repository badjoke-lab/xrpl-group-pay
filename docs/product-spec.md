# XRPL Group Pay — Product Specification

**Status:** Draft for PR 1  
**Document class:** Public  
**Initial asset:** XRP only  
**Initial wallet:** Xaman  
**Initial network:** XRPL Testnet, followed by a controlled XRPL Mainnet release

## 1. Product summary

XRPL Group Pay is a non-custodial shared-expense settlement web application. A bill creator defines a shared expense and allocates an XRP amount to each participant. Every participant reviews their assigned amount and signs an XRP Payment with their own Xaman wallet. Funds move directly from the payer to the bill creator. The application does not hold user funds, private keys, seeds, or app balances.

The application is responsible for:

1. Defining the expected payment conditions.
2. Creating an unsigned XRP Payment template.
3. Handing the template to Xaman for user approval and signing.
4. Receiving transaction status notifications.
5. Re-fetching and verifying the transaction from the XRP Ledger.
6. Updating the relevant payment slot only after final verification.
7. Showing bill progress and settlement completion.

## 2. Problem

A raw XRP transfer proves that one account sent value to another, but it does not by itself provide a complete group-expense workflow. Groups also need to know:

- What the shared expense was.
- How the total was divided.
- Which participant was expected to pay which amount.
- Which transfer belongs to which participant slot.
- Whether a transaction was successful and validated.
- Which participants remain unpaid.
- Whether the bill is fully settled.

XRPL Group Pay adds this coordination and verification layer without becoming a custodian.

## 3. Target users

### 3.1 Bill creator

Creates a bill, sets the recipient XRPL address, allocates participant shares, distributes payment links, and monitors settlement progress.

### 3.2 Payer

Opens an individual payment link, reviews the expected amount and destination, approves the Payment in Xaman, and receives a verified result.

### 3.3 Proof viewer

Views a read-only payment or settlement proof. A proof viewer cannot edit the bill or initiate a replacement payment.

## 4. Initial use cases

- Shared meals.
- Travel expenses.
- Small event costs.
- Community venue or equipment costs.
- Shared purchases.
- Team expenses among existing XRPL users.

## 5. Product principles

1. The payer signs with their own wallet.
2. The operator never receives or controls the payment funds.
3. The payer sends XRP directly to the recipient.
4. The application never asks for a private key or seed.
5. The application does not create an internal balance.
6. The application does not exchange XRP for fiat, RLUSD, or another asset.
7. The application does not guarantee refunds or unpaid balances.
8. Personal information and expense details are not written to XRPL Memos.
9. A transaction hash alone is not proof of a valid payment.
10. A payment slot becomes paid only after strict verification against a validated ledger.

## 6. Initial MVP scope

The first end-to-end MVP includes:

- Bill title.
- Total amount in XRP.
- Recipient XRPL address.
- Optional Destination Tag.
- Creator share that does not require a self-payment.
- Participant label.
- Expected payer XRPL address.
- Participant amount.
- Individual capability-based payment links.
- Xaman signing.
- XRP Payment template creation.
- Configurable Source Tag support.
- Unique InvoiceID for each payment slot.
- Transaction hash capture.
- Validated-ledger verification.
- Unpaid, awaiting-signature, validating, paid, and exception states.
- Bill progress.
- Settled state when all externally payable slots are verified.
- Mobile payment flow.
- Desktop bill-management view.

## 7. Explicit non-goals for the initial release

The initial release does not include:

- Custody.
- Stored-value balances.
- Automatic debits.
- Fiat conversion.
- Token swaps.
- Escrow.
- Payment guarantees.
- Operator-funded refunds.
- Percentage-of-payment service fees.
- Investment or fundraising features.
- Credit scoring.
- Public participant directories.
- Personal expense descriptions written on-ledger.
- Settlement Circles in the initial data model.

## 8. Fund flow

```text
Payer XRPL account
        |
        | User-approved XRP Payment
        v
Bill creator XRPL account
```

The application backend creates an unsigned transaction template and requests a Xaman Sign Request. Xaman presents the transaction to the payer, obtains the payer's approval, signs, and submits according to the Xaman flow. The application cannot sign for the payer.

## 9. Bill model

A `Bill` represents one shared expense.

Proposed fields:

```text
id
public_id
admin_token_hash
title
network
destination_address
destination_tag
total_drops
creator_share_drops
status
revision
frozen_at
expires_at
created_at
updated_at
```

### 9.1 Creator share

The creator share records the creator's portion of the expense. It is not an instruction for the creator to send XRP to themselves.

The following invariant must hold:

```text
creator_share_drops + sum(payment_slot.expected_amount_drops)
= bill.total_drops
```

### 9.2 Bill status

```text
draft
open
partially_paid
settled
expired
cancelled
needs_review
```

## 10. Payment-slot model

A `PaymentSlot` represents one expected participant payment.

Proposed fields:

```text
id
bill_id
public_token_hash
participant_label
expected_payer_address
expected_amount_drops
invoice_id
status
paid_tx_hash
paid_ledger_index
paid_at
created_at
updated_at
```

Each payment slot has:

- One expected payer address in the initial MVP.
- One expected XRP amount expressed internally in drops.
- One unique InvoiceID.
- One capability-based payment URL.
- At most one accepted transaction hash.

A payment from a different address is not silently accepted. It enters an exception or review state.

## 11. URL and capability model

```text
/pay/{paymentToken}       Participant payment capability
/bill/{publicToken}       Read-only bill progress capability
/manage/{adminToken}      Bill-management capability
/proof/{proofToken}       Read-only transaction proof
```

Requirements:

- Tokens use cryptographically secure random values.
- Only token hashes are stored where practical.
- Management tokens are never included in participant URLs.
- Tokens are excluded from application logs and analytics payloads.
- Invalid or revoked capability URLs reveal no bill details.

## 12. Transaction template

The intended XRP Payment template is:

```json
{
  "TransactionType": "Payment",
  "Destination": "<BILL_DESTINATION>",
  "Amount": "<EXPECTED_DROPS_AS_STRING>",
  "SourceTag": "<CONFIGURED_SOURCE_TAG>",
  "InvoiceID": "<PAYMENT_SLOT_UINT256>",
  "DestinationTag": "<OPTIONAL_DESTINATION_TAG>"
}
```

Rules:

- `Account`, `Fee`, and `Sequence` may be filled by Xaman.
- `Amount` is a string containing XRP drops, not a currency object.
- `SourceTag` is configured separately from bill identification.
- `InvoiceID` identifies the payment slot.
- `DestinationTag` is included only when required by the recipient.
- The initial flow does not set `SendMax`, `Paths`, or `DeliverMin`.
- The initial flow does not enable the Partial Payment flag.
- Memos are omitted.

## 13. Source Tag and InvoiceID

`SourceTag` and `InvoiceID` have separate responsibilities.

- `SourceTag`: project or source attribution configured for the deployment.
- `InvoiceID`: unique payment-slot correlation.

The same configured Source Tag may be used across relevant project transactions. Every payment slot receives a distinct 256-bit InvoiceID.

InvoiceID generation must:

- Use a cryptographically secure source.
- Avoid embedding names, bill titles, emails, or other personal data.
- Be unique across all networks and payment slots.
- Be stored in canonical uppercase hexadecimal form.

## 14. Xaman flow

```text
Open payment link
  -> Review amount and destination
  -> Request Xaman payload
  -> Open Xaman by deep link or QR
  -> Payer approves or rejects
  -> Webhook or status channel reports resolution
  -> Application re-fetches full payload result
  -> Application fetches transaction from expected XRPL network
  -> Application verifies transaction
  -> Payment slot transitions to paid or exception
```

A webhook is a notification, not final payment evidence.

## 15. Verification contract

A payment slot can transition to `paid` only when all applicable checks pass:

```text
Xaman payload resolved = true
Xaman payload signed = true
transaction hash exists
transaction is found on the expected network
validated = true
TransactionType = Payment
meta.TransactionResult = tesSUCCESS
Account = expected payer address
Destination = bill destination address
DestinationTag matches, including absence
SourceTag matches configured value
InvoiceID = payment-slot InvoiceID
Amount is XRP drops
Amount = expected drops
meta.delivered_amount is XRP drops
meta.delivered_amount = expected drops
Partial Payment flag is absent
SendMax is absent
Paths is absent
DeliverMin is absent
transaction hash has not been processed before
payment slot has not already accepted another transaction
```

The verification service returns a structured result rather than a single boolean:

```text
verified
not_found
not_yet_validated
validated_failure
wrong_network
wrong_type
wrong_sender
wrong_destination
wrong_destination_tag
wrong_source_tag
wrong_invoice_id
wrong_asset
wrong_amount
partial_payment
duplicate_transaction
slot_already_paid
malformed_response
```

## 16. Idempotency and concurrency

Database constraints must enforce:

- Unique transaction hash within a network.
- Unique InvoiceID.
- At most one accepted transaction per payment slot.
- Atomic transition from an unpaid/validating state to paid.
- Safe handling of duplicate webhooks.
- Safe handling of simultaneous page polling and webhook processing.

Repeated verification of the same valid transaction must return the same result without double-counting it.

## 17. Network separation

Testnet and Mainnet must be visibly and operationally separated.

Requirements:

- Separate environment variables.
- Separate XRPL endpoints.
- Separate Xaman network requirements.
- Network stored on every bill, payload, and observation.
- Mainnet warnings before creating or approving a payment.
- No automatic copying of Testnet bills to Mainnet.
- A transaction found on a different network does not satisfy the payment slot.

## 18. Bill freezing

A bill starts as `draft`. The creator may edit it before publishing.

When the bill is opened for payment, the following fields are frozen:

- Network.
- Destination address.
- Destination Tag.
- Total amount.
- Creator share.
- Payment-slot amount.
- Payment-slot InvoiceID.
- Expected payer address for an already-issued slot.

Any supported post-publication change must create a new revision or replacement slot rather than mutating the expected conditions behind an existing signing request.

## 19. Settlement rule

A bill becomes `settled` when every externally payable slot is `paid`.

Creator share does not create a payment slot. Cancelled, removed, expired, or exception slots cannot be ignored unless a defined bill revision or administrative resolution updates the bill consistently.

## 20. Public roadmap

### Phase 1 — Group Pay Core

One-time bills, direct XRP payments, strict verification, progress, and proofs.

### Phase 2 — Reliable Group Payments

Equal split, custom split, deadlines, bill freezing, exception handling, re-verification, exports, rate limits, and Mainnet safeguards.

### Phase 3 — Persistent Groups

Saved groups, reusable members, recurring expense entry, group history, and shared activity.

### Phase 4 — Settlement Circles

Multiple expense records, member approvals, disputes, net balances, settlement periods, reduced transfer routes, partial settlement, and carry-over balances.

### Phase 5 — Event Collection

Event fees, participant self-claim, shared QR entry, capacity and deadline controls, organizer dashboard, and event settlement records.

Roadmap items after Phase 1 are directions, not implementation commitments.

## 21. MVP acceptance criteria

The MVP is accepted when:

1. A creator can create a Testnet bill with at least two external payment slots.
2. Each participant can open a distinct link on Android.
3. Each participant can approve the correct XRP Payment in Xaman.
4. The application verifies each Payment from the expected Testnet.
5. The application rejects a transaction with a wrong sender, destination, amount, InvoiceID, Source Tag, asset, or result.
6. Duplicate notifications do not duplicate state.
7. The creator sees independent participant states.
8. The bill becomes settled only after all payable slots are verified.
9. No private key, seed, or user fund is handled by the application.
10. The UI works at supported mobile and desktop widths.

## 22. Official technical references

- XRP Ledger: Payment transaction reference.
- XRP Ledger: Source and Destination Tags.
- XRP Ledger: Transaction metadata and `delivered_amount`.
- XRP Ledger: Robustly monitoring for payments.
- Xaman: Payloads and Sign Requests.
- Xaman: Secure payment verification.
- Xaman: Networks.
- Xaman: Webhooks and webhook signature verification.
