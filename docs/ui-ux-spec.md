# XRPL Group Pay — UI/UX Specification

**Status:** Active  
**Scope:** Approved payment-lifecycle experience for XRP, RLUSD, Xaman, and English/Japanese/Korean  
**Last reviewed:** 2026-07-01  
**Document class:** Public  
**Design concept:** Warm Settlement Utility

## 1. Product experience

The interface must feel like a modern shared-expense product rather than a generic wallet or token dashboard.

It communicates:

- who receives the Payment;
- who creates and manages the Bill;
- who pays each obligation;
- direct non-custodial settlement;
- exact asset and amount;
- calm financial safety;
- independent payer progress;
- verified completion;
- actionable recovery.

Wallet Providers and assets appear where relevant but do not replace the XRPL Group Pay product identity.

## 2. Brand and semantic color

- Deep Plum: product identity, headings, selected navigation, important financial values.
- Coral: one primary action per view.
- Neutral: not started, inactive, secondary information, intentional incomplete closure.
- Blue: in-progress wallet or XRPL activity.
- Emerald: validated success only.
- Amber: setup, retry, review, expiry, or Mainnet attention.
- Red: blocking error or destructive confirmation only.

Rules:

- Color is never the only state indicator.
- Every status uses text and an icon.
- Participant cards use a small badge and thin accent, not a fully saturated background.
- XRP and RLUSD use neutral asset badges so asset identity does not conflict with state color.
- Mainnet is prominent but is not styled as an error.
- Wallet Provider branding must not override the Group Pay design system.

## 3. User roles

### Bill operator

```text
Choose payment mode
-> Enter recipient and Bill details
-> Allocate payer obligations
-> Review and freeze
-> Share capabilities
-> Monitor progress
-> Resolve review states or close incomplete
```

### Recipient

The XRPL account that receives every payer Payment. The recipient may be the Bill operator or an external store or organizer.

### Payer

```text
Payment details
-> Readiness check
-> Final review
-> Wallet Handoff
-> Waiting for wallet
-> Ledger verification
-> Verified result or safe recovery
```

### Progress and proof viewer

Receives a read-only view containing only information permitted by the relevant capability or proof contract.

## 4. Mobile and desktop

Mobile is the primary payer environment. Use one primary action, a prominent amount, visible asset and network, and no management navigation on payer pages.

Desktop is a Bill-operator workspace with dense payer editing, a persistent summary, progress, proof, Guide access, and future group-management space. It is not an enlarged mobile layout.

Contextual help uses:

- a bottom sheet on mobile;
- a side panel on desktop.

Opening help must not discard draft input or interrupt payment verification.

## 5. Bill creation entry

The first decision is:

```text
Who will participants pay?
```

Two equal-weight cards are shown.

### Pay a representative

Use when a representative receives the Payments, including reimbursements, fees, shared purchases, and general multi-person collection.

Required distinction:

```text
The representative receives the Payments.
```

### Pay a store or organizer directly

Use when participants pay an external recipient directly. The Bill operator may also be added as a normal payer.

Required distinction:

```text
The Bill operator does not receive the Payments.
```

Do not add a redundant arrow diagram when the explanatory text and use-case list already communicate the difference. Selecting either card uses the same visual weight; neither mode appears safer or preferred.

## 6. Mode-specific creation order

### Representative mode

1. Payment mode.
2. Recipient name and XRPL address.
3. Optional Destination Tag.
4. Settlement Asset.
5. Bill title and total.
6. Optional recipient-funded amount.
7. Allocation Strategy.
8. Payers and expected addresses.
9. Remainder handling.
10. RLUSD recipient readiness when applicable.
11. Review and freeze.

The recipient-funded amount is hidden until explicitly enabled and is labeled as **No transfer**.

### Direct mode

1. Payment mode.
2. External recipient name and XRPL address.
3. Optional Destination Tag.
4. Settlement Asset.
5. Bill title and total.
6. Payers and expected addresses.
7. Optional “Add myself as a payer”.
8. Allocation Strategy and remainder handling.
9. RLUSD recipient readiness when applicable.
10. Review and freeze.

Direct mode never displays or accepts a recipient-funded amount.

## 7. Draft preservation

Before publication, creation data remains browser-local.

The active-tab draft preserves:

- payment mode;
- current step;
- recipient values;
- asset and Bill values;
- allocation inputs;
- payer labels, addresses, and amounts.

The draft is removed after successful Bill creation or explicit discard. It is not payment authority and is never passed to the public Guide.

## 8. Asset presentation

### XRP

- Display `XRP` next to every financial value.
- Use up to six decimals without meaningless trailing zeros.
- Explain that the wallet determines the network fee.

### RLUSD

- Display `RLUSD`, not a dollar sign alone.
- Label it as official RLUSD on the selected XRPL network.
- Provide access to the full issuer value.
- Show recipient readiness before Bill freeze.
- Show payer trust-line, RLUSD-balance, and spendable-XRP readiness before Payment handoff.
- Explain that the settlement amount is RLUSD while fees and reserve requirements use XRP.

The interface never implies that Group Pay exchanges XRP and RLUSD.

## 9. Allocation presentation

### Equal

Show the calculated obligations and any remainder assignment.

### Percentage

Show each percentage and calculated obligation. The total must visibly equal 100%.

### Shares

Show each weight and calculated obligation. Explain shares as relative weights rather than percentages.

### Custom Amount

Show under-, exact-, and over-allocation states as the Bill operator types.

For every strategy, final review shows exact payer obligations, not only strategy inputs.

## 10. Bill review

The review page shows:

- payment mode;
- network;
- Bill title;
- Accounting Currency and Settlement Asset;
- recipient and optional tag;
- Bill total;
- recipient-funded amount and **No transfer** label when applicable;
- amount expected from payers;
- Allocation Strategy and remainder policy;
- each payer, expected address, and final obligation;
- RLUSD issuer and readiness summary;
- warning that publication freezes these conditions.

The primary action is `Create payment links` or its localized equivalent. The copy must not imply that creating links completes payment.

## 11. Created Bill and sharing

Clearly separate:

- management link;
- redacted progress link;
- participant payment link;
- recipient RLUSD-preparation link when applicable.

Each link shows:

- its intended audience;
- what information it reveals;
- whether it may be shared publicly;
- a neutral link-type badge.

Copy actions may include:

- payment link;
- complete payment instructions;
- RLUSD preparation instructions.

Copied instructions include network, asset, amount, expected payer, recipient, fee requirements, and the participant capability without exposing management capability material.

## 12. Payer details and readiness

Content order:

1. product identity;
2. network badge;
3. Bill title;
4. payer label when allowed;
5. exact amount and asset;
6. recipient;
7. expected payer address;
8. official issuer detail for RLUSD;
9. readiness results;
10. direct-payment and ledger-verification explanation;
11. primary review action.

Readiness states distinguish:

- checking;
- ready;
- missing trust line;
- insufficient RLUSD;
- insufficient spendable XRP;
- recipient not ready;
- temporarily unavailable.

A confirmed blocker prevents Payment handoff creation. Temporary unavailability does not falsely report insufficient funds.

## 13. RLUSD TrustSet assistance

When the official trust line is missing, show:

- what must be configured;
- that TrustSet is not the Bill Payment;
- that setup does not add RLUSD balance;
- that XRP may be required for fees and reserve;
- `Add official RLUSD in Xaman`;
- `Recheck setup`;
- contextual help and the matching Guide section.

TrustSet and Payment use visually and verbally distinct flows.

## 14. Final confirmation

Must show:

- exact asset and amount;
- full recipient available by expansion or copy;
- expected payer;
- optional Destination Tag;
- Source Tag;
- InvoiceID;
- network;
- selected Wallet Provider;
- RLUSD official issuer and XRP fee notice when applicable;
- Mainnet irreversibility warning.

The action may say `Continue to Xaman`. Its domain meaning is `Create Wallet Handoff`, not `Payment complete`.

## 15. Wallet Handoff

- Wallet Provider branding appears only in handoff contexts.
- Group Pay colors remain dominant.
- Deep-link, QR, and recovery options are clearly separated.
- Wallet opening does not imply submission.
- Signed or submitted does not imply verification.
- Reopening the participant capability resumes an active handoff when possible.
- A replacement handoff is reconciliation-gated.

## 16. Payer statuses and actions

| Status | Semantic family | Primary behavior |
|---|---|---|
| Unpaid | Neutral | Show payment preparation action |
| Waiting for Xaman | In progress | Show QR/deep link and status refresh |
| Verifying on XRPL | In progress | Block another Payment and allow recheck |
| Paid | Complete | Show verified transaction and proof |
| Retry required | Action required | Explain reason and show retry only when safe |
| Needs review | Action required | Block new Payment and direct user to Bill operator |
| Closed | Neutral | Explain that collection ended |

`Verified` and green styling are used only after the validated-ledger verification contract passes.

Raw provider or XRPL codes are not the only user-facing explanation.

## 17. Bill progress

The management progress page shows mode-appropriate totals.

Representative mode:

- Bill total;
- recipient-funded amount;
- expected from payers;
- verified amount;
- remaining amount;
- paid count.

Direct mode:

- payment total;
- verified amount;
- remaining amount;
- paid count.

Public Bill statuses:

- Accepting payments;
- Partially paid;
- Needs review;
- All paid;
- Closed incomplete.

The page never presents one payer failure as failure of every payer.

## 18. Management actions

State-dependent actions include:

- copy payment link or instructions;
- copy RLUSD preparation instructions;
- refresh status;
- open transaction or proof;
- review expected versus observed facts;
- authorize a new attempt after an explicit double-payment warning;
- close incomplete;
- copy the Bill into a new draft.

The Bill operator cannot initiate Xaman signing for a payer and cannot manually mark a transaction ledger-verified.

## 19. Guide and contextual help

The canonical public page is `/guide`; `/about` redirects to it.

The Guide covers product purpose, roles, modes, XRP, RLUSD, TrustSet, progress, every failure pattern, recovery, privacy, limitations, security, and FAQ.

Critical fields and states expose short help in the current view. Detailed help opens in the side panel or bottom sheet.

Rules:

- opening help does not leave the current route;
- draft values, current step, and relevant scroll state are preserved;
- payment-status polling continues;
- the complete Guide opens in a separate protected tab;
- Guide URLs contain no capability, payer, or draft data;
- stable anchors do not change by language.

## 20. Localization

The critical flow supports English, Japanese, and Korean.

Rules:

- language selection is visible but not dominant;
- switching language preserves the same Bill and capability;
- user-entered titles and labels remain unchanged;
- financial values are formatted by locale but stored identically;
- no concatenated sentence fragments;
- no text embedded in required images;
- layouts tolerate longer translated strings;
- Guide, help, copied instructions, statuses, readiness, retry, review, closure, and accessibility announcements are translated together;
- the document `lang` value follows the selected locale.

## 21. Network presentation

Testnet uses a persistent badge and calm explanation that it is not production-value settlement.

Mainnet uses a clear real-value warning before Bill freeze and payment approval. Network remains visible during readiness, confirmation, verification, and progress.

## 22. Error and recovery design

Recoverable interaction errors provide the approved retry, setup, recheck, or return action without erasing entered data.

Uncertain submission uses wait-and-recheck and prohibits another Payment.

Mismatch with possible value movement uses Needs review and prohibits automatic retry.

RLUSD readiness errors distinguish missing trust line, insufficient RLUSD, insufficient spendable XRP, recipient blocking state, and unavailable check.

Destructive confirmations such as close incomplete or reviewed retry authorization use red only at the confirmation boundary.

## 23. Copy rules

- use `Bill operator`, `recipient`, and `payer` according to the actual role;
- use `recipient-funded amount`, not public `creator share` wording;
- use `payment` or `settlement`, not `transfer execution`;
- use `verified` only after ledger verification;
- use `submitted` before validation;
- avoid `guaranteed`, `reversible`, and `protected funds`;
- show asset units on every financial value;
- use shortened addresses with copy and full-view controls;
- distinguish Accounting Currency, Settlement Asset, and fee asset when they differ;
- do not imply Group Pay performs conversion, custody, refund, or atomic group settlement.

## 24. Visual anti-patterns

Do not use neon crypto gradients, excessive wallet branding, decorative charts without decisions, low-readability glass effects, multiple primary actions, tiny gray text, color-only status, full-card traffic-light coloring, repeated confetti, delayed proof access, or asset-specific themes that fragment the product.

## 25. Approved visual baseline

- warm off-white background;
- white surfaces;
- Deep Plum brand color;
- Coral primary action;
- restrained rounding and shadow;
- small semantic badges and thin status accents;
- large settlement amount;
- calm spacing;
- mobile-first payer flow;
- information-dense desktop Bill-operator workspace.
