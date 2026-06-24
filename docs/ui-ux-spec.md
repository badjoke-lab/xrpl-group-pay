# XRPL Group Pay — UI/UX Specification

**Status:** Active  
**Scope:** Approved Make Waves v1 experience for XRP, RLUSD, Xaman, and English/Japanese/Korean  
**Last reviewed:** 2026-06-24  
**Document class:** Public  
**Design concept:** Warm Settlement Utility

## 1. Product experience

The interface must feel like a modern shared-expense product rather than a generic wallet or token dashboard.

It communicates:

- direct settlement;
- clear participant responsibility;
- exact asset and amount;
- calm financial safety;
- verified completion;
- human group context.

Wallet Providers and assets appear where relevant but do not replace the XRPL Group Pay product identity.

## 2. Brand direction

- Deep Plum: product identity, headings, selected navigation, important financial values.
- Coral: one primary action per view.
- Emerald: validated success only.
- Amber: pending attention, expiry, readiness, or Mainnet caution.
- Red: blocking error or dangerous mismatch.
- Neutral: unpaid, inactive, or secondary information.

XRP, RLUSD, and Wallet Provider branding must not override the Group Pay design system.

## 3. User roles

### Payer

```text
Payment details
-> Final review
-> Wallet Handoff
-> Waiting for wallet
-> Ledger verification
-> Verified result or actionable error
```

### Creator

```text
Create Bill
-> Select asset
-> Select allocation strategy
-> Enter participants
-> Review and freeze
-> Share links
-> Monitor progress
-> View proof
```

### Progress and proof viewer

Receives a read-only view with only the information allowed by the corresponding capability or proof contract.

## 4. Mobile and desktop

Mobile is the primary payer environment. Use one primary action, a prominent amount, visible asset and network, and no creator navigation on participant pages.

Desktop is a creator workspace with dense participant editing, a persistent summary, progress, proof, and future group-management space. It is not an enlarged mobile layout.

## 5. Bill creation content order

1. Bill title.
2. Network notice.
3. Settlement Asset.
4. Destination and optional Destination Tag.
5. Total and creator share.
6. Allocation Strategy.
7. Participants and strategy inputs.
8. Remainder handling.
9. RLUSD recipient readiness when applicable.
10. Default shared-link language.
11. Review and freeze.

Make Waves v1 presents:

```text
Settlement Asset
[ XRP ] [ RLUSD ]

Split method
[ Equal ] [ Percentage ] [ Shares ] [ Custom ]
```

A published Bill cannot switch assets.

## 6. Asset presentation

### XRP

- display `XRP` next to every financial value;
- use up to six decimals without meaningless trailing zeros;
- explain that the wallet determines the network fee.

### RLUSD

- display `RLUSD`, not a dollar sign alone;
- label it as official RLUSD on the selected XRPL network;
- provide access to the full issuer value;
- show recipient readiness before Bill freeze;
- explain that the settlement amount is RLUSD while the network fee is paid in XRP.

The interface never implies that Group Pay exchanges XRP and RLUSD.

## 7. Allocation presentation

### Equal

Show the calculated obligations and any remainder assignment.

### Percentage

Show each percentage and calculated obligation. The total must visibly equal 100%.

### Shares

Show each weight and calculated obligation. Explain shares as relative weights rather than percentages.

### Custom Amount

Show under-, exact-, and over-allocation states as the creator types.

For every strategy, the final review shows exact participant obligations, not only the strategy inputs.

## 8. Creator review

The review page shows:

- network;
- Bill title;
- Accounting Currency and Settlement Asset;
- destination and optional tag;
- total and creator share;
- Allocation Strategy;
- remainder policy;
- each participant, expected payer, and final obligation;
- RLUSD issuer and readiness summary;
- warning that publication freezes these conditions.

The primary action is `Freeze Bill and create payment links` or its localized equivalent.

## 9. Payer details

Content order:

1. product identity;
2. network badge;
3. Bill title;
4. participant label when allowed;
5. `Your share`;
6. exact Settlement Amount and asset;
7. recipient;
8. official issuer detail for RLUSD;
9. direct-payment and ledger-verification explanation;
10. primary review action.

Technical fields such as InvoiceID and Source Tag are available in details but do not lead the page.

## 10. Final confirmation

Must show:

- exact asset and amount;
- full destination available by expansion or copy;
- expected payer;
- optional Destination Tag;
- Source Tag;
- InvoiceID;
- network;
- selected Wallet Provider;
- RLUSD official issuer and XRP fee notice when applicable;
- Mainnet irreversibility warning.

The action may say `Continue to Xaman` when Xaman is selected. The domain meaning is `Create Wallet Handoff`, not `Payment complete`.

## 11. Wallet Handoff

- Wallet Provider branding appears only in handoff contexts.
- Group Pay colors remain dominant.
- Deep-link, QR, and recovery options are clearly separated.
- Wallet opening does not imply submission.
- Signed or submitted does not imply verification.
- Future providers use the same content hierarchy and safety boundary.

## 12. Verification states

```text
Waiting for wallet approval
Payment submitted
Verifying on the XRP Ledger
Payment verified
Payment requires review
Request rejected
Request expired
```

`Verified` is used only after the validated-ledger verification contract passes.

Errors explain the expected and observed category when safe. Internal codes are not the only user-facing explanation.

## 13. Bill progress

A progress page shows:

- Bill total in Accounting Currency;
- paid amount;
- remaining amount;
- participant counts and states;
- Settlement Asset for Make Waves v1;
- verified transaction references where permitted;
- settled state.

XRP and RLUSD volumes are never added together.

## 14. Localization

The critical flow supports English, Japanese, and Korean.

Rules:

- language selection is visible but not dominant;
- switching language preserves the same Bill and capability;
- user-entered titles and labels remain unchanged;
- financial values are formatted by locale but stored identically;
- no concatenated sentence fragments;
- no text embedded in required images;
- layouts tolerate longer translated strings;
- the document `lang` value follows the selected locale.

## 15. Roadmap and Changelog pages

Public pages use the same visual system as the application.

Roadmap:

- displays Available, In Progress, Next, Later, and Research;
- clearly separates current availability from direction;
- does not promise dates.

Changelog:

- groups meaningful completed changes by release;
- distinguishes Added, Changed, Fixed, Security, Deprecated, and Removed;
- never lists unimplemented roadmap items as completed.

## 16. Network presentation

Testnet uses a persistent badge and calm explanation that it is not production-value settlement.

Mainnet uses a clear real-value warning before Bill freeze and payment approval. Network remains visible during confirmation and verification.

## 17. Error design

Recoverable interaction errors provide retry or return actions without erasing entered data.

Verification exceptions include wrong sender, destination, network, asset, issuer, amount, tag, InvoiceID, duplicate transaction, and unsupported path behavior.

RLUSD readiness errors distinguish missing trust line, insufficient capacity, wrong issuer, and unavailable check.

## 18. Copy rules

- use `payment` or `settlement`, not `transfer execution`;
- use `verified` only after ledger verification;
- use `submitted` before validation;
- use `recipient` for destination;
- avoid `guaranteed`, `reversible`, and `protected funds`;
- show asset units on every financial value;
- use shortened addresses with copy and full-view controls;
- distinguish Accounting Currency, Settlement Asset, and network fee when they differ;
- do not imply Group Pay performs conversion.

## 19. Visual anti-patterns

Do not use neon crypto gradients, excessive wallet branding, decorative charts without decisions, low-readability glass effects, multiple primary actions, tiny gray text, color-only status, repeated confetti, delayed proof access, or asset-specific themes that fragment the product.

## 20. Approved visual baseline

- warm off-white background;
- white surfaces;
- Deep Plum brand color;
- Coral primary action;
- restrained rounding and shadow;
- large settlement amount;
- calm spacing;
- mobile-first payer flow;
- information-dense desktop creator workspace.
