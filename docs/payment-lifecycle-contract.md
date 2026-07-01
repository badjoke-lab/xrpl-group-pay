# XRPL Group Pay — Payment Lifecycle Contract

**Status:** Active  
**Scope:** Approved role, payment-mode, lifecycle, recovery, guidance, and presentation contract for PR #132–#149  
**Last reviewed:** 2026-07-01  
**Document class:** Public

## 1. Purpose and precedence

This document defines the specific product contract for the payment-lifecycle revision.

It supplements `product-spec.md` and takes precedence over older creator-centric wording where that wording assumes that the person who creates a Bill is always the recipient. It does not weaken the non-custodial, verification, asset-identity, receipt, privacy, or Mainnet contracts.

Planned behavior in this document is not current availability until the corresponding implementation PR is merged, tested, and verified.

## 2. Roles

### 2.1 Bill operator

The person who creates and manages a Bill.

The Bill operator:

- chooses the payment mode;
- enters the recipient and payer information;
- reviews and freezes the Bill;
- distributes participant capabilities;
- monitors progress through a management capability;
- may close an incomplete Bill or copy it into a new draft when those features are available.

The Bill operator is an application role, not an on-ledger payment fact.

### 2.2 Recipient

The XRPL account that receives every Payment for the Bill.

A Bill has one frozen recipient address and optional Destination Tag. The recipient may be:

- the Bill operator or another representative; or
- an external store, organizer, seller, booking provider, or other destination.

### 2.3 Payer

A person assigned one PaymentSlot.

Each payer:

- has one frozen expected payer XRPL address;
- receives a distinct payment capability;
- reviews the frozen amount, asset, recipient, network, tags, and InvoiceID;
- signs through a payer-controlled wallet;
- settles independently from every other payer.

### 2.4 Viewers

- A progress viewer receives a redacted read-only capability.
- A proof viewer receives public verified ledger facts only.

### 2.5 Role overlap

One person may hold multiple roles. For example:

- in representative mode, the Bill operator is commonly also the recipient;
- in direct mode, the Bill operator may also be one of the payers;
- a recipient is not automatically a payer.

The interface and data model must not infer role equality from the person using the browser.

## 3. Payment modes

### 3.1 Representative mode

Public label: **Pay a representative**.

Participants pay a representative recipient. Typical uses include:

- reimbursement;
- membership or participation fees;
- shared purchases;
- general multi-person collection.

This mode may include a recipient-funded amount.

### 3.2 Direct-recipient mode

Public label: **Pay a store or organizer directly**.

Participants pay an external recipient directly. The Bill operator may be included as a normal payer.

This mode has no recipient-funded amount. The full Bill total is assigned to PaymentSlots.

### 3.3 Mode is frozen

The payment mode is selected before review and becomes immutable when the Bill is frozen.

Changing mode, recipient, payer, amount, network, asset, tag, or InvoiceID requires a new Bill rather than mutation of a published Bill.

## 4. Money and allocation

### 4.1 Recipient-funded amount

The recipient-funded amount is the portion of a representative-mode Bill that is not assigned to any payer.

It is:

- an accounting value;
- not a self-payment;
- not a fee;
- not a PaymentSlot;
- not an application balance;
- not an on-ledger transfer.

The existing `creator_share` storage name may remain temporarily for compatibility, but public copy and domain documentation use **recipient-funded amount**.

### 4.2 Representative invariant

```text
recipient_funded_units
+ sum(payment_slot.obligation_units)
= bill.total_obligation_units
```

### 4.3 Direct invariant

```text
recipient_funded_units = 0
sum(payment_slot.obligation_units)
= bill.total_obligation_units
```

### 4.4 Amount presentation

The interface distinguishes:

- Bill total;
- recipient-funded amount, when applicable;
- amount expected from payers;
- verified amount;
- remaining amount.

The recipient-funded amount must carry a neutral **No transfer** label where confusion is possible.

## 5. Independent settlement

A Bill is a coordination object, not one atomic group transaction.

Each PaymentSlot is an independent settlement opportunity with its own:

- payer;
- amount;
- capability;
- InvoiceID;
- Wallet Handoff lifecycle;
- ledger verification result;
- accepted receipt.

Consequences:

- one payer failure does not reverse another payer's verified Payment;
- successful slots remain paid;
- automatic group rollback is prohibited;
- automatic refund is not performed;
- a Bill may remain partially paid indefinitely until explicitly closed or completed;
- a failed payer retries only their own frozen slot.

## 6. Bill lifecycle

Canonical internal states for the revision:

```text
draft
open
partially_paid
needs_review
settled
closed_incomplete
```

Compatibility states such as `expired` or `cancelled` may remain for historical records and draft cancellation, but no automatic Bill deadline is introduced in this revision.

### 6.1 Public Bill statuses

| Public status | Meaning |
|---|---|
| Accepting payments | No payable slot has a verified receipt and the Bill remains open |
| Partially paid | At least one payable slot is paid and at least one remains incomplete |
| Needs review | At least one observed transaction requires human review before another Payment is allowed |
| All paid | Every payable slot has one accepted verified receipt |
| Closed incomplete | The Bill operator ended collection while one or more slots remained unpaid or unresolved |

The product must not use a global **Group payment failed** status.

### 6.2 Recalculation

```text
if bill is closed_incomplete:
    preserve closed_incomplete
else if any slot is needs_review:
    bill = needs_review
else if every payable slot is paid:
    bill = settled
else if at least one payable slot is paid:
    bill = partially_paid
else:
    bill = open
```

### 6.3 Closure

Closing incomplete:

- preserves every verified receipt;
- prevents new Wallet Handoffs;
- does not refund or reverse Payments;
- records the verified, unpaid, and unresolved totals;
- cannot convert an unresolved transaction into paid or unpaid without the normal verification or review process.

## 7. PaymentSlot lifecycle

Canonical internal states:

```text
unpaid
handoff_created
awaiting_signature
rejected
expired
submitted
validating
paid
verification_failed
needs_review
closed
```

### 7.1 Public payer statuses

| Public status | Internal states |
|---|---|
| Unpaid | `unpaid`, initial `handoff_created` before presentation |
| Waiting for Xaman | `handoff_created`, `awaiting_signature` |
| Verifying on XRPL | `submitted`, `validating` |
| Paid | `paid` |
| Retry required | `rejected`, `expired`, safe `verification_failed` |
| Needs review | `needs_review` or a mismatch with possible value movement |
| Closed | `closed` after incomplete Bill closure |

### 7.2 Monotonic paid state

A paid slot cannot return to unpaid, retry required, or review required. It has one accepted verified receipt and one accepted transaction identity.

### 7.3 Provider state is not proof

`submitted`, `signed`, a callback, or a provider transaction identifier can start verification but cannot set `paid`.

## 8. Recovery policy

Every failure or exception maps to one recovery class.

```text
retry_safe
wait_and_recheck
setup_required
needs_review
already_paid
terminal
```

### 8.1 Safe retry

Examples:

- payer rejected the Xaman request;
- the request expired and reconciliation found no matching transaction;
- a validated transaction failed without delivering the expected value and the slot remains safely unpaid.

Retry creates a new Wallet Handoff for the same frozen Payment Intent after reconciliation.

### 8.2 Wait and recheck

Examples:

- a transaction identifier exists but the transaction is not yet on a validated ledger;
- XRPL or the verification service is temporarily unavailable;
- the result is uncertain.

A second Payment must not be created while value movement remains uncertain.

### 8.3 Setup required

Examples:

- missing official RLUSD trust line;
- insufficient RLUSD balance;
- insufficient spendable XRP for the Payment, fee, or reserve requirement;
- recipient not ready to receive official RLUSD.

The user fixes the prerequisite and asks Group Pay to recheck.

### 8.4 Needs review

Examples:

- wrong payer address;
- wrong destination, amount, asset, issuer, tag, or InvoiceID;
- partial or cross-currency Payment;
- multiple candidate transactions;
- any mismatch where value may have moved.

A review-required observation is not automatically paid and is not automatically treated as safely unpaid.

### 8.5 Already paid

The same accepted transaction or an already-paid slot returns the existing verified result. The payer is told not to pay again.

### 8.6 Terminal

Examples include a closed Bill or revoked capability. No new Payment is allowed.

## 9. Reconciliation and retry authorization

Before replacing an earlier Wallet Handoff, Group Pay checks validated account history using the frozen payer and correlation fields.

- no matching transaction: replacement may proceed;
- exactly one valid match: settle the slot and block replacement;
- multiple valid matches: move to review and block replacement.

If an observed mismatch may have transferred value, a Bill operator may authorize a new attempt only after an explicit double-payment warning. This authorization does not mark the earlier transaction paid.

## 10. RLUSD preparation

### 10.1 Recipient readiness

Before an RLUSD Bill is frozen, Group Pay checks that the recipient can receive the canonical network-specific RLUSD asset.

### 10.2 Payer readiness

Before creating a Payment handoff, Group Pay checks, where supported:

- official RLUSD trust line;
- sufficient RLUSD balance;
- sufficient spendable XRP for fees and reserve constraints.

Readiness is preflight information and never replaces wallet approval or validated-ledger verification.

### 10.3 TrustSet assistance

Group Pay may prepare a wallet-reviewed TrustSet handoff using only the canonical network-specific RLUSD currency and issuer.

The interface must state that:

- TrustSet is wallet configuration, not the Bill Payment;
- it does not transfer the Bill amount;
- it does not fund the account with RLUSD;
- XRP may be required for fees and reserve;
- completion is accepted only after XRPL confirms the trust line.

A recipient-readiness link may be shared with the person who controls the recipient account. It must not expose Bill-management or participant-payment capabilities.

## 11. Guide and contextual help

### 11.1 Guide

The canonical public page is `/guide`.

It documents:

- what Group Pay is and is not;
- roles and payment modes;
- creation, sharing, payment, verification, and progress;
- XRP and RLUSD preparation;
- every public status;
- every supported failure and recovery pattern;
- independent payer failure and partial completion;
- capability privacy;
- incomplete closure and copy-to-revise;
- security, limitations, and FAQ.

`/about` redirects to `/guide`.

### 11.2 Contextual help

Critical fields and states provide short help in the current view.

- desktop uses a side panel;
- mobile uses a bottom sheet;
- opening help does not abandon the current route;
- form draft, step, and relevant scroll state are preserved;
- verification polling continues while help is open;
- the complete Guide opens in a separate protected tab;
- Guide URLs never receive capability tokens, draft values, or payer data.

### 11.3 Shared help registry

Short copy, detailed in-flow copy, Guide anchor, accessibility name, and translations use one stable help identifier.

## 12. Status presentation

Status meaning uses five semantic families:

| Family | Meaning |
|---|---|
| Neutral | Not started, inactive, or intentionally closed |
| In progress | Wallet or XRPL processing is underway |
| Complete | Validated completion only |
| Action required | Setup, retry, or review is required |
| Destructive | A dangerous confirmation or irreversible management action |

Rules:

- color is never the only indicator;
- text and an icon are required;
- participant cards use small badges and restrained accents rather than full saturated backgrounds;
- green is reserved for validated completion;
- amber covers setup, retry, and review attention;
- red is limited to blocking errors and destructive confirmations;
- Mainnet is prominent but is not styled as an error;
- XRP and RLUSD use neutral asset badges so asset identity does not conflict with state colors.

## 13. Capability roles

The interface distinguishes:

- management capability;
- redacted progress capability;
- participant payment capability;
- public proof capability;
- recipient RLUSD-preparation capability where implemented.

Every capability is labeled with its audience and privacy boundary. Management and participant capabilities must not be posted publicly.

## 14. Draft preservation and copy-to-revise

### 14.1 Browser-local draft

Before Bill creation, form values and current step are stored browser-locally for the active tab. They are removed after successful creation or explicit discard.

The draft is not payment authority and is never used instead of server review and freeze.

### 14.2 Copy-to-revise

Changing frozen payment facts creates a new browser-local draft and then a new Bill.

The new Bill receives new:

- identifiers;
- capability tokens;
- PaymentSlots;
- InvoiceIDs;
- Wallet Handoffs.

The original Bill and verified receipts remain unchanged.

## 15. Localization

English is canonical. English, Japanese, and Korean are required for every critical surface introduced by this revision, including:

- modes and roles;
- Guide and contextual help;
- readiness and TrustSet assistance;
- failure and recovery explanations;
- status badges and accessibility announcements;
- closure and copy-to-revise confirmations;
- copied participant instructions.

Stable internal status, help, mode, and recovery identifiers are not translated.

## 16. Explicit exclusions

This revision does not add:

- multiple recipients in one Bill;
- partial settlement of one PaymentSlot;
- escrow or pooled funds;
- automatic refunds or rollback;
- one atomic group transaction;
- automatic reminders or collection enforcement;
- automatic Bill deadlines;
- in-place waiver, reassignment, amount editing, or destination editing;
- administrator-created proof of payment;
- Wallet Providers other than Xaman;
- assets other than XRP and official network-specific RLUSD.

## 17. Acceptance summary

The contract is satisfied when:

1. roles and modes are distinct in data, validation, copy, and review;
2. mode-specific total invariants are enforced server-side;
3. Mainnet and Testnet progress use the Bill network;
4. Xaman lifecycle is durable but never treated as proof;
5. readiness and TrustSet assistance fail closed around canonical RLUSD identity;
6. every failure maps to a safe recovery class;
7. payer and Bill statuses are understandable without color;
8. Guide and contextual help cover the implemented lifecycle in all three languages;
9. closure and copy-to-revise preserve verified receipts and frozen payment facts;
10. integrated tests show that one payer failure never reverses another payer's verified Payment.
