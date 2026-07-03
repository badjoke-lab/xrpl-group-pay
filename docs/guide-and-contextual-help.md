# XRPL Group Pay — Guide and Contextual Help

**Status:** Active  
**Scope:** Current implementation for PR #148  
**Last reviewed:** 2026-07-03  
**Document class:** Public

## 1. Purpose

This contract defines the public, searchable, multilingual explanation of the current XRPL Group Pay product and the contextual-help links embedded in critical flows.

The Guide describes only behavior implemented by the merged payment-lifecycle revision. Future product directions remain in the Roadmap and are not presented as currently available Guide functionality.

## 2. Supported languages

Critical Guide and contextual-help content is available in:

- English;
- Japanese;
- Korean.

Every supported locale uses the same stable section identifiers and help-topic identifiers. A locale must not silently omit a critical section or fall back to mixed-language guidance.

## 3. Stable Guide sections

`/guide` exposes the following language-independent anchors:

- `overview`;
- `roles`;
- `payment-modes`;
- `create-and-freeze`;
- `capability-links`;
- `xrp`;
- `rlusd`;
- `trustset`;
- `readiness`;
- `payment-flow`;
- `verification`;
- `progress`;
- `status-meanings`;
- `failures`;
- `recovery`;
- `review-required`;
- `partial-completion`;
- `incomplete-closure`;
- `copy-to-revise`;
- `privacy`;
- `security-limitations`;
- `faq`.

The visible title may be translated. The anchor must not change by locale.

## 4. Required current-product coverage

The Guide explains:

- product purpose and the non-custodial boundary;
- Bill operator, recipient, and payer roles;
- representative and direct-recipient payment modes;
- creation, allocation, review, freeze, sharing, signing, verification, and progress;
- XRP and official network-specific RLUSD identity;
- TrustSet, trust lines, issued balance, XRP fee, and reserve behavior;
- management, read-only progress, payer, setup, and proof capability scopes;
- Bill, PaymentSlot, wallet-handoff, verification, and recovery meanings;
- safe retry, wait-and-recheck, setup-required, review-required, already-paid, and terminal recovery;
- independent PaymentSlots and partial completion;
- expected-versus-observed review and repeated-payment warning;
- incomplete closure and its no-refund meaning;
- copy-to-revise and new-identity generation;
- privacy boundaries, security checks, product limitations, and FAQ.

## 5. Search and navigation

Guide search matches localized section titles, paragraphs, and bullet guidance.

The search experience:

- does not change the stable section anchors;
- reports the matching section count through an accessible live region;
- provides a recoverable no-results state;
- supports `/` to focus search when the user is not editing another control;
- supports `Escape` to clear and leave the focused search control;
- keeps all displayed result links keyboard reachable;
- works in the mobile single-column and desktop sticky-navigation layouts.

## 6. Contextual-help topics

The typed help registry covers:

- roles and payment modes;
- recipient and Destination Tag fields;
- settlement Asset and allocation fields;
- capability-link privacy;
- XRP, RLUSD, TrustSet, and general readiness;
- payment states and validated-ledger verification;
- safe recovery and review-required states;
- partial completion;
- incomplete closure and destructive confirmation;
- copy-to-revise;
- security limitations.

Each topic contains localized short guidance, localized detailed guidance, and one stable Guide target.

## 7. Private-flow safety

Opening contextual help:

- does not submit a form;
- does not create a Xaman request;
- does not authorize a retry;
- does not close a Bill;
- does not discard a draft;
- does not replace the active private page;
- restores focus to the trigger when closed.

The help panel supports close-button, backdrop, and `Escape` dismissal and traps keyboard focus while open.

## 8. URL and capability privacy

Guide and help URLs consist only of the public `/guide` path and an approved stable anchor.

They must not include:

- management, progress, payer, setup, or proof capabilities;
- query parameters copied from the active flow;
- payer or recipient addresses;
- Bill titles or draft values;
- InvoiceIDs, transaction identifiers, or proof data.

Full Guide links open in a protected new tab with `noopener`, `noreferrer`, and no referrer policy so the active private flow remains intact.

## 9. Accessibility and responsive behavior

The Guide and contextual help require:

- visible keyboard focus;
- semantic headings and navigation labels;
- accessible search and clear controls;
- a modal dialog name and description;
- focus restoration after close;
- readable long Japanese and Korean text;
- mobile bottom-sheet and desktop side-panel help layouts;
- no reliance on color alone.

## 10. Validation

Automated coverage verifies:

- all stable sections exist in every supported locale;
- all typed help topics exist in every supported locale;
- every help target is an approved Guide anchor;
- Guide and help links contain no query or capability fragment;
- search filtering, no-results recovery, slash focus, and Escape behavior;
- help open, close, protected-tab, and focus-restoration behavior;
- critical payer states resolve to the correct help family.
