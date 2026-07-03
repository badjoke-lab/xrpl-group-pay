# XRPL Group Pay — Payment Lifecycle Localization Addendum

**Status:** Active  
**Scope:** English, Japanese, and Korean terminology and coverage for PR #132–#149  
**Last reviewed:** 2026-07-03  
**Document class:** Public

## 1. Relationship to the localization contract

This document supplements `localization.md`. English remains canonical, and English, Japanese, and Korean remain the supported critical-flow languages.

A language is not complete when payment modes, Guide, help, readiness, failure, review, closure, copied-draft, or security surfaces unintentionally fall back to another language.

## 2. Canonical role meanings

| Meaning | Canonical English term |
|---|---|
| Person who creates and manages a Bill | Bill operator |
| XRPL account receiving Payments | Recipient |
| Person or account assigned a PaymentSlot | Payer |
| Representative-mode amount not assigned to a payer | Recipient-funded amount |
| Participants pay a representative recipient | Pay a representative |
| Participants pay an external recipient | Pay a store or organizer directly |

Translations may use natural wording, but the role meanings must remain separate. Internal compatibility names such as `creator_share` are not public translation sources.

## 3. Required critical coverage

All three languages cover:

- payment-mode selection and role examples;
- recipient, Destination Tag, settlement Asset, allocation, and recipient-funded explanations;
- creation, review, freeze, sharing, signing, verification, and progress;
- management, read-only, payer, setup, and proof link scopes;
- payer and recipient XRP/RLUSD readiness;
- official RLUSD TrustSet and its distinction from Payment;
- issued balance, spendable XRP, fee, and reserve conditions;
- cancellation, expiry, pending validation, temporary unavailability, retry, and review;
- independent payer settlement and partial completion;
- expected-versus-observed review and repeated-payment risk;
- closed-incomplete and copy-to-revise guidance;
- semantic status text and accessible announcements;
- the complete searchable Guide, FAQ, and contextual help;
- copied payment and RLUSD-preparation instructions;
- security limitations and irreversible Mainnet warnings.

## 4. Stable Guide identifiers

The following Guide anchors are language-independent:

```text
overview
roles
payment-modes
create-and-freeze
capability-links
xrp
rlusd
trustset
readiness
payment-flow
verification
progress
status-meanings
failures
recovery
review-required
partial-completion
incomplete-closure
copy-to-revise
privacy
security-limitations
faq
```

Every locale exposes the same anchors in the same order. Visible titles and explanations are localized.

## 5. Stable contextual-help identifiers

The typed help registry uses these language-independent identifiers:

```text
overview
roles
payment-modes
recipient
destination-tag
settlement-asset
allocation
capability-privacy
readiness
xrp-readiness
rlusd-readiness
trustset
payment-status
verification
safe-recovery
review-required
partial-completion
incomplete-closure
copy-to-revise
destructive-confirmation
security-limitations
```

Each identifier resolves to localized short guidance, localized detailed guidance, and one approved stable Guide anchor.

## 6. Guide search and navigation

- `/guide` searches localized titles, paragraphs, and bullet guidance.
- Search results retain the language-independent Guide anchors.
- The result count, no-results state, clear action, and search instructions are localized.
- `/` focuses Guide search when another editable control is not active.
- `Escape` clears and leaves the focused Guide search control.
- Search and anchor navigation remain keyboard accessible on mobile and desktop.
- No Guide section describes an unimplemented capability as currently available.

## 7. Contextual help behavior

- Help opens without submitting a form, creating a wallet handoff, authorizing retry, closing a Bill, or discarding a draft.
- Mobile uses the bottom-sheet presentation and desktop uses the side-panel presentation.
- Close button, backdrop, and `Escape` close the help panel.
- Keyboard focus remains trapped while open and returns to the original trigger after close.
- The full Guide opens in a protected new tab so the active private flow remains intact.
- Guide URLs contain only `/guide` and an approved anchor.

## 8. Copied instructions

Copied participant instructions are localized while preserving technical values exactly.

They may contain:

- payer label;
- amount and Asset;
- network;
- expected payer address;
- recipient address;
- payer capability;
- RLUSD trust-line requirement;
- required RLUSD balance;
- XRP fee and reserve notice.

Management capabilities must never be included in participant instructions.

## 9. Status language

Public wording distinguishes:

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

`Retry required` must not be used for uncertain, pending, or review-required value movement. Those conditions use wait-and-recheck or review guidance.

## 10. Layout and accessibility

English, Japanese, and Korean reviews cover:

- 320px and 390px mobile widths;
- desktop Bill-operator layouts;
- long mode, status, Guide, help, warning, and FAQ text;
- multi-line badges without clipping;
- 200% zoom;
- keyboard and screen-reader operation of Guide search and help panels;
- translated accessible names and live-region announcements;
- server-rendered and client-rendered language consistency.

Color is never the only translated status information; text and accessible labels carry the meaning.

## 11. Tests

Automated checks require:

- every critical English Guide section exists in Japanese and Korean;
- every typed help topic exists in all three languages;
- no unknown Guide anchor or help identifier is used;
- Guide anchors remain identical across languages;
- help targets remain fixed public URLs with no capability or query data;
- Guide search, no-results recovery, slash focus, and Escape behavior pass;
- help open, close, focus trap, focus restoration, and protected-tab behavior pass;
- payer state families point to the correct recovery or verification guidance;
- financial and capability values remain byte-identical across locale changes;
- locale switching does not create a handoff, authorize retry, close a Bill, or discard a draft;
- long translated content does not hide primary actions or warnings.
