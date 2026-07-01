# XRPL Group Pay — Payment Lifecycle Localization Addendum

**Status:** Active  
**Scope:** English, Japanese, and Korean terminology and coverage for PR #132–#149  
**Last reviewed:** 2026-07-01  
**Document class:** Public

## 1. Relationship to the localization contract

This document supplements `localization.md`. English remains canonical, and English, Japanese, and Korean remain the supported critical-flow languages.

A language is not complete when the new mode, Guide, help, readiness, failure, review, closure, or copied-instruction surfaces fall back unintentionally to another language.

## 2. Canonical role meanings

| Meaning | Canonical English term |
|---|---|
| Person who creates and manages a Bill | Bill operator |
| XRPL account receiving Payments | Recipient |
| Person or account assigned a PaymentSlot | Payer |
| Representative-mode amount not assigned to a payer | Recipient-funded amount |
| Participants pay a representative recipient | Pay a representative |
| Participants pay an external recipient | Pay a store or organizer directly |

Translations may use natural wording, but the role meanings must remain separate.

Internal compatibility names such as `creator_share` are not public translation sources.

## 3. Required new coverage

All three catalogs must cover:

- payment-mode selection and examples;
- Bill operator, recipient, and payer explanations;
- recipient-funded amount and the fact that no transfer occurs;
- representative and direct review summaries;
- management, read-only, participant, and recipient-readiness link descriptions;
- payer and recipient readiness;
- RLUSD TrustSet setup and the distinction from Payment;
- insufficient RLUSD and insufficient spendable XRP;
- cancellation, expiry, pending validation, temporary unavailability, retry, and review;
- independent payer settlement and partial completion;
- closed-incomplete and copy-to-revise confirmations;
- semantic status badges and accessible announcements;
- the complete Guide, FAQ, and contextual help;
- copied payment and RLUSD-preparation instructions.

## 4. Stable identifiers

The following remain language-independent:

- payment-mode enums;
- Bill and PaymentSlot state enums;
- recovery-class enums;
- help identifiers;
- Guide anchors;
- API field names;
- XRPL addresses, hashes, currency codes, issuer addresses, tags, InvoiceIDs, and proof digests.

Example help identifiers:

```text
payment-types
recipient-role
recipient-funded-amount
expected-payer
rlusd-trustline
rlusd-balance
xrp-fees
payment-cancelled
request-expired
ledger-pending
transaction-failed
wrong-wallet
payment-mismatch
duplicate-payment
participant-unpaid
close-incomplete
```

## 5. Guide and contextual help

- `/guide` uses localized content with the same stable anchors.
- Contextual help uses one identifier for short copy, detailed copy, Guide target, and accessible label.
- Opening Guide or help must not change locale-sensitive financial state or authorization.
- Guide URLs must not contain capability, payer, recipient, or draft values.
- The full Guide opens without replacing or destroying the active private flow.

## 6. Copied instructions

Copied participant instructions are localized while preserving technical values exactly.

They may contain:

- payer label;
- amount and asset;
- network;
- expected payer address;
- recipient address;
- payment capability;
- RLUSD trust-line requirement;
- required RLUSD balance;
- XRP fee and reserve notice.

Management capabilities must never be included in participant instructions.

## 7. Status language

Public status wording must distinguish:

```text
Accepting payments
Partially paid
Needs review
All paid
Closed incomplete

Unpaid
Waiting for Xaman
Verifying on XRPL
Paid
Retry required
Needs review
Closed
```

`Paid`, `Verified`, and equivalent success wording are reserved for accepted validated-ledger results.

`Retry required` must not be used for uncertain or review-required value movement.

## 8. Layout and accessibility

English, Japanese, and Korean reviews cover:

- 320px and 390px mobile widths;
- desktop Bill-operator layouts;
- long mode, status, Guide, and help labels;
- multi-line badges without clipping;
- 200% zoom;
- keyboard and screen-reader operation of help panels;
- translated accessible names and live-region announcements;
- server-rendered and client-rendered language consistency.

Color is never the only translated status information; the text and accessible label carry the meaning.

## 9. Tests

- every new English key exists in Japanese and Korean;
- no unknown key is used;
- no unintended mixed-language screen appears;
- Guide anchors stay identical across languages;
- financial and capability values stay byte-identical across locale changes;
- copied instructions preserve technical values;
- locale switching does not create a handoff, authorize retry, close a Bill, or discard a draft;
- long translated content does not hide primary actions or warnings.
