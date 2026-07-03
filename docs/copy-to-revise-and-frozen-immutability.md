# XRPL Group Pay — Copy-to-Revise and Frozen Bill Immutability

**Status:** Active  
**Scope:** Current implementation for PR #147  
**Last reviewed:** 2026-07-03  
**Document class:** Public

## 1. Purpose

This contract defines how XRPL Group Pay supports revisions after a Bill has been frozen without editing the original Bill or any existing PaymentSlot.

A Bill operator may copy the frozen payment facts into a new browser-local draft, edit that draft, and create a separate Bill. Copying never changes the source Bill, its links, its PaymentSlots, its InvoiceIDs, its observed transactions, or its verified receipts.

## 2. Copy-to-revise entry point

The private management view provides **Copy into a new Bill draft** after the management capability has loaded the complete Bill progress record.

The action is not available from a read-only progress capability because the copied draft requires management-only payer labels and expected payer addresses.

Copying writes only a browser-session draft and then opens the Bill creation flow. It does not call the Bill creation API, create a wallet handoff, or submit an XRPL transaction.

## 3. Facts copied into the draft

The copied draft restores:

- payment mode;
- recipient label and destination address;
- destination tag when present;
- settlement network and Asset;
- Bill title;
- total amount;
- recipient-funded amount for representative mode;
- payer labels;
- expected payer addresses;
- each frozen final payer amount.

The copied allocation strategy is always `custom`. This preserves the final frozen amounts even when the source Bill was originally created with equal, percentage, shares, or remainder allocation.

Each copied payer receives a new browser-draft participant identifier.

## 4. Identities that are never copied

The new draft does not contain or reuse:

- the source Bill public identifier;
- source PaymentSlot public identifiers;
- public, management, or participant capability tokens;
- capability-token hashes;
- source InvoiceIDs;
- existing progress or payment links;
- Xaman payload identities;
- observed transaction identifiers;
- paid transaction facts;
- proof digests or receipt identities;
- review records or recovery authorizations.

When the operator confirms creation, the normal Bill creation path generates new Bill, PaymentSlot, capability, InvoiceID, and link identities.

## 5. Browser-session behavior

The draft is stored in `sessionStorage` under the existing network-specific Bill draft key.

A validated source Bill public identifier is retained only as local draft metadata so the creation page can explain that this is a separate Bill and the source remains unchanged. Ordinary draft autosaves preserve this metadata.

The source metadata is removed together with the draft when:

- the operator discards the draft; or
- the new Bill is created successfully.

The source identifier is not submitted in the create-Bill request.

## 6. User-facing revision notice

The creation page displays localized English, Japanese, or Korean guidance stating that:

- the operator is editing a new browser-local draft;
- creation produces a separate Bill with new identities;
- the original Bill remains unchanged.

The notice is informational and does not weaken the normal review-and-freeze confirmation.

## 7. Database immutability

D1 triggers reject updates that attempt to change frozen Bill content, including:

- Bill identity and capability hashes;
- title, network, payment mode, and recipient label;
- destination address and destination tag;
- settlement Asset identity and precision;
- total and recipient-funded amounts;
- revision, freeze time, and creation time.

D1 triggers also reject updates that attempt to change frozen PaymentSlot content, including:

- PaymentSlot identity, Bill ownership, and public capability hash;
- payer label and expected payer address;
- expected amount and Asset identity;
- InvoiceID;
- payment-contract version and creation time.

Rejected edits fail with an instruction to create a new Bill instead.

## 8. Lifecycle fields that remain mutable

The immutability triggers do not block legitimate lifecycle and verification changes, including:

- Bill and PaymentSlot status updates;
- Xaman lifecycle state;
- validated-ledger verification results;
- paid transaction identity, ledger index, and paid time;
- review reason and structured review facts;
- retry authorization metadata;
- incomplete-closure state and timestamps;
- ordinary `updated_at` maintenance.

A paid PaymentSlot and an incomplete-closed Bill remain subject to the stronger lifecycle protections introduced by the review and closure contract.

## 9. Privacy and capability boundary

Copy-to-revise is capability-scoped and browser-local.

The implementation must not expose management capabilities, payer details, InvoiceIDs, or source draft values in public URLs, logs, analytics, explorer links, or public proof records.

Malformed or read-only progress data fails closed rather than producing a partially redacted draft.

## 10. Failure behavior

The copy action fails closed when:

- the progress record is not management-authorized;
- fewer than two frozen PaymentSlots are available;
- a management-only payer address is missing;
- the source network or Asset cannot be represented by the current Bill form;
- browser session storage is unavailable;
- a frozen database field is updated in place.

Failure to copy does not modify the source Bill.

## 11. Reviewed specifications

This implementation was reviewed against:

- `bill-review.md`;
- `money-and-allocation.md`;
- `state-machine.md`;
- `privacy-data-map.md`;
- `ui-ux-spec.md`;
- `payment-lifecycle-security.md`;
- `operator-progress-dashboard.md`;
- `review-retry-closure.md`.
