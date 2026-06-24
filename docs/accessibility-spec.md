# XRPL Group Pay — Accessibility Specification

**Status:** Active  
**Scope:** Make Waves v1 critical flows  
**Last reviewed:** 2026-06-24  
**Document class:** Public  
**Target:** WCAG 2.2 AA

## 1. Objective

A user must be able to create, allocate, review, sign, verify, and inspect a group payment without relying on precise pointer movement, color perception, animation, English-only content, or visual layout alone.

## 2. Semantic structure

- one clear `h1` per page;
- logical heading order;
- native buttons and links;
- labels associated with every control;
- tables used for real tabular data;
- status and progress use text and programmatic semantics;
- dialogs and sheets have accessible names and focus management;
- document `lang` matches English, Japanese, or Korean locale.

## 3. Keyboard and touch

All creator desktop actions support keyboard operation. There is a visible focus indicator, logical tab order, no keyboard trap, and no accidental incomplete financial submission.

Primary mobile actions are at least 48×48 CSS px. Other controls target at least 44×44 px where practical. Asset, allocation, participant, language, and wallet controls must remain distinguishable.

## 4. Color and status

Text and interactive controls meet AA contrast. Status, network, asset readiness, and selected allocation are not represented by color alone.

Testnet/Mainnet and official/wrong issuer distinctions include explicit text.

## 5. Financial forms

Every financial field has:

- persistent label;
- visible unit;
- help text where needed;
- associated error;
- required/optional status;
- correct input mode;
- no silent rounding.

Asset unit is dynamic:

```text
XRP
RLUSD
future Accounting Currency
```

Percentage controls announce the current total. Shares controls explain relative weights. Custom Amount announces under-, exact-, or over-allocation. Remainder assignment is keyboard accessible and announced.

## 6. Asset and issuer accessibility

RLUSD content announces:

- official RLUSD;
- selected XRPL network;
- full issuer available on demand;
- recipient readiness state;
- RLUSD payment amount;
- XRP network-fee distinction.

Issuer verification cannot rely on an icon or color alone.

## 7. Errors

On failed submit:

- focus moves to an error summary or first invalid field;
- summary links to affected fields;
- entered values remain;
- correction is explained;
- a toast is not the only notification.

Verification and readiness errors use live-region announcements and plain language, with technical detail separately available.

## 8. Dynamic announcements

Use polite live regions for:

- allocation total changes;
- participant addition/removal;
- RLUSD readiness result;
- Wallet Handoff creation;
- request rejection or expiry;
- transaction submission;
- waiting for validation;
- payment verification;
- Bill progress updates;
- locale change completion.

Use assertive announcements only for blocking safety conditions.

## 9. Progress

Bill progress includes textual count, amount, Accounting Currency, programmatic progress value, and settled label. A visual ring or bar alone is insufficient.

XRP and RLUSD are never combined into one unlabeled amount.

## 10. Motion

Respect `prefers-reduced-motion`. No motion is required to understand a state. No flashing content or success animation appears before ledger verification.

Timed wallet requests communicate expiry before it occurs where possible.

## 11. Zoom and reflow

At 200% zoom, actions remain visible, panels do not overlap, addresses wrap, and translated safety text is not clipped.

At supported reflow targets, the critical flow remains usable without ordinary-text horizontal scrolling.

## 12. Screen-reader review order

Final confirmation announces:

1. Bill title;
2. obligation and Settlement Asset;
3. Mainnet or Testnet;
4. destination;
5. expected payer;
6. Destination Tag when present;
7. Source Tag and InvoiceID details;
8. official RLUSD issuer and XRP fee notice when applicable;
9. irreversibility notice;
10. Wallet Provider action.

## 13. QR alternative

QR is never the only Wallet Handoff path. Provide deep link, copyable instruction where safe, text guidance, accessible QR name, and a clear distinction between participant and creator links.

## 14. Localization accessibility

English, Japanese, and Korean include translated:

- labels;
- help text;
- error summaries;
- warnings;
- status announcements;
- control names;
- Roadmap and Changelog navigation.

User-entered text and technical identifiers remain unchanged. Locale switching must not skip a review step or lose focus context without explanation.

## 15. Testing

Automated:

- accessibility scanner;
- semantic linting;
- focus-visible checks;
- catalog completeness;
- document-language tests;
- critical live-region tests;
- color-token contrast checks where possible.

Manual:

- keyboard-only desktop flow;
- TalkBack on Android in all three languages for the payer path;
- VoiceOver/Safari before broad iOS claims;
- 200% zoom;
- reduced motion;
- forced-colors review;
- long Japanese and Korean strings;
- XRP and RLUSD final confirmation.

## 16. Release gate

A critical flow cannot ship with an unlabeled financial input, unreachable primary action, missing focus state, color-only status, untranslated blocking warning, unannounced verification completion, QR-only handoff, clipped issuer/amount information, or an error that forces complete re-entry.
