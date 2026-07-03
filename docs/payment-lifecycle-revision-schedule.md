# XRPL Group Pay — Payment Lifecycle Revision Schedule

**Status:** Completed  
**Scope:** Completed implementation sequence for the payment-lifecycle, role, recovery, guidance, and status-system revision  
**Last reviewed:** 2026-07-03  
**Document class:** Public  
**Completed PR range:** #132–#149

## 1. Purpose

This document records the completed implementation order for the XRPL Group Pay payment-lifecycle revision.

The revision separates the Bill operator, recipient, and payers; introduces two explicit payment modes; makes progress network-aware; persists the Xaman lifecycle; adds XRP and official RLUSD readiness and TrustSet preparation; defines safe failure recovery and administration; adds immutable copy-to-revise; and completes the semantic status system, public Guide, contextual help, and English, Japanese, and Korean review.

PR #149 completed the integrated lifecycle, multilingual, accessibility, visual, privacy, Testnet, and Mainnet-safe release audit. The final decision is recorded in `payment-lifecycle-release-audit.md` and `config/payment-lifecycle-release-audit.json`.

This schedule records implementation history. It does not override product, safety, verification, custody, privacy, asset, or Mainnet operational requirements.

## 2. Authority and document precedence

The documentation precedence remains:

1. external requirements;
2. product and architecture specifications;
3. safety, state, privacy, verification, and persistence contracts;
4. feature contracts;
5. user-experience specifications;
6. implementation schedules;
7. public Roadmap and Changelog.

The revision was reviewed against the relevant sections of:

- `product-spec.md`;
- `payment-lifecycle-contract.md`;
- `architecture.md`;
- `payment-contracts.md`;
- `money-and-allocation.md`;
- `state-machine.md`;
- `persistence-scope.md`;
- `payment-reconciliation.md`;
- `non-custodial-boundary.md`;
- `threat-model.md`;
- `privacy-data-map.md`;
- `localization.md`;
- `payment-lifecycle-localization.md`;
- `ui-ux-spec.md`;
- `screen-inventory.md`;
- `accessibility-spec.md`;
- `responsive-behavior.md`;
- `design-tokens.md`;
- `mainnet-operational-controls.md`;
- `mainnet-acceptance-audit.md`.

Current availability is stated in the root `README.md`, `ROADMAP.md`, and `CHANGELOG.md`.

## 3. Approved product behavior implemented by the revision

### 3.1 Roles

The public interface and domain distinguish:

- the Bill operator who creates or manages a Bill;
- the recipient XRPL account that receives XRP or official RLUSD;
- each payer account that signs and sends its own Payment.

One person may hold more than one role, but the roles and capability scopes remain separate.

### 3.2 Payment modes

The Bill operator chooses one of two modes:

1. **Pay a representative** — participants pay the representative recipient. This includes reimbursements, fees, shared purchases, and general multi-person collection. A recipient-funded accounting portion may exist without a self-transfer.
2. **Pay a store or organizer directly** — all assigned payers send directly to an external recipient. The full Bill total is assigned to payer PaymentSlots.

### 3.3 Independent PaymentSlots

A Group Pay Bill is not an atomic group transaction. Each payer has an independent frozen PaymentSlot and signs an independent Payment.

Therefore:

- one payer failure does not reverse another payer's validated Payment;
- verified PaymentSlots remain paid;
- a Bill may remain open or partially paid while other slots are incomplete;
- no automatic refund or rollback is performed;
- only a validated transaction matching the frozen slot may mark that slot paid.

### 3.4 Assets and readiness

The revision supports one frozen Settlement Asset per Bill:

- XRP;
- official network-specific RLUSD.

Readiness checks cover the validated-ledger facts required by the selected Asset, including account existence, Destination Tag, Deposit Authorization, reserve, fee, spendable XRP, official RLUSD trust line, authorization, freeze state, issued balance, and recipient capacity.

TrustSet preparation is a separate payer-controlled XRPL transaction. It prepares the wallet to hold official RLUSD and does not pay the Bill or provide an RLUSD balance.

### 3.5 Wallet lifecycle and verification

Xaman requests are bound to the selected network, frozen Payment Intent, expected payer, one XRPL Sequence, and a bounded ledger window.

A wallet status, signature, callback, payload resolution, or transaction identifier alone is not payment proof. The server re-resolves the frozen PaymentSlot, re-fetches the Xaman payload, and verifies the validated transaction against:

- network;
- successful result;
- payer and recipient;
- XRP or exact issued-Asset identity;
- requested and delivered amount;
- Source Tag and optional Destination Tag;
- InvoiceID;
- partial-payment and unsupported path rules;
- transaction and PaymentSlot state;
- duplicate and replay boundaries.

The durable settlement path stores or reuses the verified receipt, marks only the matching PaymentSlot paid, and recomputes Bill progress atomically.

### 3.6 Recovery and review

Every supported failure maps to one disposition:

- safe retry;
- wait and recheck;
- setup required;
- review required;
- already paid;
- terminal.

Replacement wallet handoffs remain reconciliation-gated. Pending, mismatched, duplicate, or multiple-candidate observations cannot be silently replaced or manually marked paid.

Management review shows frozen expected facts beside observed facts. Authorizing another attempt requires explicit acknowledgement that a prior transaction may have moved value and that a repeated payment is possible.

### 3.7 Incomplete closure

A management capability may close an active unsettled Bill incomplete after the required disclosures and typed confirmation.

Closure:

- stops new wallet handoffs for unpaid slots;
- preserves verified receipts, paid transaction facts, and paid totals;
- does not reverse or automatically refund validated transfers;
- cannot be reopened.

### 3.8 Copy-to-revise and immutability

Frozen payment facts are not edited in place. Management may copy editable facts and final allocations into a new browser-local draft and create a separate Bill.

The new Bill generates new:

- Bill identity;
- PaymentSlot identities;
- capability identities;
- InvoiceIDs;
- links.

Source transactions, receipts, proofs, review records, and capabilities are not copied. D1 triggers reject in-place changes to frozen Bill and PaymentSlot facts while preserving exact compatibility normalization and legitimate lifecycle updates.

### 3.9 Guide, help, status, and localization

The completed application provides:

- semantic status families using text, icons, and restrained color;
- a searchable public Guide with stable language-independent anchors;
- contextual help for critical fields, readiness, states, recovery, closure, and revision;
- key-identical critical coverage in English, Japanese, and Korean;
- keyboard, focus, mobile, zoom, and no-horizontal-overflow review.

Guide and help links contain only the public `/guide` path and approved anchors. They never copy private capability fragments, active queries, draft values, payer facts, or transaction evidence.

## 4. Completed PR sequence

| PR | Completed result |
|---|---|
| #132 | Defined the payment-lifecycle contract, roles, invariants, security requirements, localization requirements, and implementation order. |
| #133 | Added payment-mode persistence, recipient metadata, recipient-funded accounting, closure state, and review storage foundations. |
| #134 | Made progress network-aware and canonicalized capability-preserving routes. |
| #135 | Persisted and resumed the durable Xaman request lifecycle. |
| #136 | Added validated-ledger XRP and official RLUSD account and Asset readiness services. |
| #137 | Added capability-bound official RLUSD TrustSet preparation and validated-ledger confirmation. |
| #138 | Defined stable failure codes, recovery dispositions, and reconciliation-gated replacement policy. |
| #139 | Added the shared semantic status, identity badge, and restrained state-color system. |
| #140 | Added the Guide route and contextual-help infrastructure without destroying active work or exposing capabilities. |
| #141 | Implemented two-mode Bill creation with explicit Bill-operator, recipient, and payer wording. |
| #142 | Added mode-aware freeze review, sharing, and participant instructions. |
| #143 | Added payer and recipient readiness UI and the RLUSD setup path before wallet handoff. |
| #144 | Added payer cancellation, expiry, pending, failure, review, and safe retry experiences. |
| #145 | Made Bill progress mode-correct, capability-scoped, and actionable. |
| #146 | Added expected-versus-observed review, explicit retry authorization, and irreversible incomplete closure. |
| #147 | Added copy-to-revise and database enforcement of frozen Bill and PaymentSlot facts. |
| #148 | Completed the searchable English, Japanese, and Korean Guide, FAQ, and contextual-help coverage. |
| #149 | Ran and machine-enforced the integrated lifecycle, multilingual, accessibility, visual, privacy, Testnet, and Mainnet-safe release audit; aligned public availability. |

## 5. Completed stage gates

### Gate A — Documentation and domain foundation

Passed after PR #133:

- roles, modes, states, and invariants were reflected in specifications and persistence;
- compatibility checks passed;
- no unresolved domain or migration conflict blocked dependent work.

### Gate B — Runtime safety foundation

Passed after PR #138:

- progress uses the stored network;
- Xaman lifecycle is durable;
- readiness and TrustSet services are bounded;
- every supported failure has one recovery classification;
- replacement Payments remain reconciliation-gated.

### Gate C — Shared experience foundation

Passed after PR #140:

- semantic status components use accessible text and icons;
- Guide and contextual-help infrastructure preserve active work and capability privacy.

### Gate D — Operator and payer flows

Passed after PR #144:

- both payment modes work through review and sharing;
- payer readiness and recovery are represented;
- critical copy exists in English, Japanese, and Korean.

### Gate E — Administration and immutable revision

Passed after PR #147:

- progress actions, review handling, incomplete closure, and copy-to-revise preserve verified receipts and frozen facts.

### Gate F — Release audit

Passed by PR #149:

- integrated lifecycle, multilingual, accessibility, visual, privacy, Testnet, and Mainnet-safe checks passed;
- no unresolved high-severity finding remained;
- only proven capabilities moved to Available;
- README, Roadmap, Changelog, Mainnet audit, and machine-readable release records were aligned.

## 6. Release validation

The completed release gate runs:

- environment and deployment boundary checks;
- Mainnet release evidence and acceptance checks;
- integrated payment-lifecycle audit checks;
- D1 migrations and constraints;
- lint and TypeScript;
- unit, component, API, and persistence tests;
- Next.js build;
- Storybook smoke;
- Cloudflare Worker build;
- browser smoke tests;
- production Bill UI audit at 320px, 390px, and 1280px.

The machine-readable integrated audit is:

```text
config/payment-lifecycle-release-audit.json
```

Validation command:

```bash
pnpm check:lifecycle-audit
```

## 7. Explicitly out of scope

This revision does not add:

- multiple recipients within one Bill;
- partial settlement of one PaymentSlot;
- escrow or pooled funds;
- automatic refunds;
- an atomic group transaction;
- email, SMS, or push reminders;
- automatic payment deadlines or automatic closure;
- in-place waiver, reassignment, amount editing, or destination editing;
- administrator-created proof of payment;
- Wallet Providers other than Xaman;
- settlement assets other than XRP and official network-specific RLUSD.

## 8. Completion and future maintenance

The PR #132–#149 sequence is complete. Later product work must be tracked as a new Roadmap item and implementation sequence rather than reopening this schedule silently.

A future change that alters custody, Asset identity, wallet authority, frozen payment facts, verification, receipts, capability privacy, Mainnet controls, localization, or public availability must update the affected higher-precedence contracts and rerun the relevant release gates.

`CHANGELOG.md` records completed behavior. `ROADMAP.md` records current availability and later direction. Remaining Make Waves submission work is outside this payment-lifecycle implementation sequence.
