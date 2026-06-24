# XRPL Group Pay — Responsive Behavior

**Status:** Active  
**Scope:** Make Waves v1 responsive behavior for XRP, RLUSD, allocation, and localization  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Supported viewport targets

```text
Minimum: 320px
Mobile default: 390 × 844
Large mobile: 430 × 932
Tablet: 768 × 1024
Desktop: 1440 × 900
Wide desktop: 1600px+
```

The application is mobile-first. Breakpoints reflect information-structure changes, not device labels.

## 2. Payer pages

### Mobile

- single column;
- 20px page padding where space allows;
- amount and Settlement Asset are visually strongest;
- network remains visible;
- technical details are collapsible;
- Wallet Handoff action may be sticky when it does not cover content;
- issuer and fee details wrap safely;
- no creator navigation.

### Tablet and desktop

- payment card centered around 520–600px;
- security and asset explanation may sit beside the card;
- deep-link and QR options may appear together;
- technical fields may remain expanded;
- no creator sidebar on participant capability routes.

## 3. Creator Bill flow

### Mobile

Use a step flow:

```text
Bill basics and asset
-> Split method
-> Participants
-> RLUSD readiness when needed
-> Review and freeze
-> Share
```

The current total, allocation state, and next action remain visible without covering the active input.

### Tablet

Form and live summary may use two columns. Participant rows become denser, but every unit and allocation input remains labeled.

### Desktop

Use a main editing area and sticky summary. Asset, allocation, participant, and remainder controls support keyboard-efficient editing.

## 4. Asset selection

XRP and RLUSD controls must fit at 320px without abbreviation that removes meaning.

RLUSD issuer detail may open in a dedicated disclosure panel or sheet. The full issuer wraps rather than truncating irreversibly.

Network fee and Settlement Asset remain distinct at every width.

## 5. Allocation controls

Equal, Percentage, Shares, and Custom controls may use segmented controls on wide views and stacked selectable cards on narrow views.

Percentage and Shares rows become labeled blocks on mobile. No horizontal scrolling is required for primary allocation editing.

Remainder assignment remains visible before review.

## 6. Creator management

### Mobile

- top app bar;
- summary cards followed by participant list;
- participant detail opens in sheet or page;
- desktop table columns become labeled rows;
- proof and export actions remain separate from payment state.

### Desktop

```text
Sidebar | Main Bill workspace | Summary and actions
```

The participant list may use a table with:

```text
Participant | Obligation | Asset | Status | Sender | Transaction | Updated
```

## 7. Public Roadmap and Changelog

Roadmap status columns become stacked sections on mobile. Changelog release navigation remains keyboard accessible and does not require a wide table.

Current availability and future direction remain distinguishable without relying on color.

## 8. Sticky behavior

Allowed:

- mobile payer action;
- mobile creation total and next action;
- desktop Bill summary;
- desktop table header.

Sticky regions must respect safe areas, never cover errors or focused controls, and collapse when an on-screen keyboard would obscure input.

## 9. Navigation

Participant routes contain product identity, network, locale selector, and only actions required for payment.

Creator navigation may include Home, Bills, future Groups, Settings, Roadmap, and Changelog. Future product features are not shown as enabled actions before release.

## 10. Long content

- Bill titles wrap in summaries and remain fully available on detail pages.
- Participant labels may ellipsize in dense tables but remain available in detail.
- addresses, issuers, hashes, and proof digests use `overflow-wrap: anywhere`.
- large amounts scale down before wrapping and never lose the unit.
- translated warnings may wrap to multiple lines without moving the action out of reach.

## 11. Localization

Every critical view is tested in English, Japanese, and Korean.

Layouts account for:

- long Japanese and Korean text;
- mixed scripts and identifiers;
- currency placement changes;
- percentage and decimal formatting;
- labels that are longer than English;
- locale selector at narrow widths.

## 12. Zoom and reflow

At 200% zoom, there is no lost action, overlapping panel, clipped issuer, or hidden warning. Multi-column layouts may collapse.

At the supported high-reflow target, the critical payment flow remains usable as one column.

## 13. Dialogs and sheets

Mobile sheets are appropriate for QR, issuer detail, language selection, and short supporting actions. Financial confirmation and Mainnet approval use a full page or non-casual explicit dialog.

Desktop dialogs handle compact actions; side panels handle participant or transaction detail; proof and complex Bill creation use full pages.

## 14. Visual regression matrix

Every UI PR checks:

```text
320 × 568
390 × 844
430 × 932
768 × 1024
1024 × 768
1440 × 900
```

Critical pages also check XRP, RLUSD, wrong/missing readiness, large values, long identifiers, English, Japanese, Korean, loading, empty, and error states.
