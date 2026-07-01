# XRPL Group Pay — Payment Lifecycle Revision Schedule

**Status:** Active  
**Scope:** Approved implementation sequence for the payment-lifecycle, role, recovery, guidance, and status-system revision  
**Last reviewed:** 2026-07-01  
**Document class:** Public  
**Planned PR range:** #132–#149

## 1. Purpose

This document defines the approved implementation order for the next XRPL Group Pay revision.

The revision separates the Bill operator, recipient, and payers; introduces two explicit payment modes; repairs Mainnet progress and Xaman lifecycle persistence; adds XRPL and RLUSD readiness checks; provides safe recovery and administration behavior; and completes the public Guide, contextual help, semantic status system, and three-language review.

This is an implementation schedule. It does not redefine product, safety, verification, custody, privacy, or asset requirements.

## 2. Authority and required document review

Before work begins on each PR, the implementation must consult `docs/README.md` and every higher-precedence document affected by that PR.

If this schedule conflicts with a higher-precedence requirement, implementation stops and the conflicting specification is corrected before runtime work continues.

At minimum, each PR must review the relevant parts of:

- `product-spec.md`;
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
- `ui-ux-spec.md`;
- `screen-inventory.md`;
- `accessibility-spec.md`;
- `responsive-behavior.md`;
- `design-tokens.md`;
- `mainnet-operational-controls.md` when Mainnet behavior changes.

A PR that changes an approved contract must update the affected specification in the same documentation sequence, before or together with the runtime change.

Current availability remains authoritative only in the root `README.md`, `ROADMAP.md`, and `CHANGELOG.md`. Planned work in this schedule must not be presented as shipped behavior.

## 3. Approved product behavior for this revision

### 3.1 Roles

The public interface and domain language must distinguish:

- the person who creates or manages a Bill;
- the recipient account that receives XRP or RLUSD;
- each payer account that signs and sends its own Payment.

One person may hold more than one role, but the roles must not be treated as synonymous.

### 3.2 Payment modes

The Bill creator begins by choosing one of two modes:

1. **Pay a representative** — participants pay the representative recipient. This includes reimbursements, fees, shared purchases, and general multi-person collection.
2. **Pay a store or organizer directly** — participants, including the Bill operator when applicable, pay an external recipient directly.

The first mode may include a recipient-funded portion for which no transfer occurs. The direct mode has no recipient-funded portion; its full total is assigned to payer slots.

### 3.3 Independent payment slots

A Group Pay Bill is not an atomic group transaction. Each payer has an independent frozen PaymentSlot and signs an independent Payment.

Therefore:

- one payer failure does not reverse another payer's validated Payment;
- successfully verified slots remain paid;
- a Bill remains open or partially paid while required slots remain incomplete;
- no automatic refund or rollback is performed;
- only validated transactions matching the frozen slot may mark that slot paid.

### 3.4 Public guidance

The application must provide:

- a complete public `/guide` page covering the product, flow, supported behavior, limitations, status meanings, RLUSD preparation, failure patterns, and recovery;
- contextual help that opens without abandoning the current operation;
- stable Guide anchors shared by English, Japanese, and Korean;
- short in-flow explanations and links to the corresponding Guide section.

## 4. Cross-PR invariants

Every PR in this schedule must preserve the following:

1. Group Pay never receives, pools, or controls payer funds.
2. A Xaman status or callback alone never proves payment.
3. `paid` requires strict validated-ledger verification against the frozen PaymentSlot.
4. An uncertain or mismatched transaction must not trigger an automatic replacement Payment.
5. A mismatched transaction cannot be manually reclassified as ledger-verified payment by an administrator.
6. Bill destination, network, asset identity, payer, amount, tags, and InvoiceID remain immutable after freeze.
7. Existing XRP and RLUSD receipt compatibility and duplicate protection remain intact.
8. Mainnet and Testnet data, assets, endpoints, presentation, and evidence remain separated.
9. English, Japanese, and Korean are implemented together for every new critical surface.
10. Color is never the only status indicator; text and icons remain required.
11. Capability tokens, payer details, and draft values must not leak into Guide URLs, logs, analytics, or public proof.
12. Automated tests must not create uncontrolled real-value Mainnet transactions.

## 5. Phase overview

| Phase | PRs | Outcome |
|---|---:|---|
| Documentation and domain foundation | #132–#133 | Approved semantics, state rules, persistence model, and compatibility plan |
| Runtime safety foundation | #134–#138 | Correct Mainnet progress, durable Xaman lifecycle, readiness checks, TrustSet support, and recovery taxonomy |
| Shared experience foundation | #139–#140 | Semantic status UI, Guide framework, contextual-help framework, and draft preservation |
| Creator and payer flows | #141–#144 | Two-mode Bill creation, clear sharing, RLUSD preparation, and safe payer recovery |
| Administration and immutable revision | #145–#147 | Actionable progress, review handling, incomplete closure, and copy-to-revise behavior |
| Documentation completion and release audit | #148–#149 | Complete Guide and help coverage, integrated tests, multilingual UI audit, and Mainnet-safe release decision |

## 6. Detailed PR schedule

## PR #132 — Define payment-lifecycle contracts and revision governance

### Purpose

Align the specifications before runtime implementation begins and register this implementation schedule as the active sequence.

### Changes

- define Bill operator, recipient, and payer as distinct roles;
- define the representative and direct payment modes;
- define recipient-funded amount semantics and the absence of an on-ledger self-transfer;
- define independent PaymentSlot settlement and partial Bill completion;
- define user-facing group and payer status vocabulary;
- define the difference between retryable failure, uncertain submission, and review-required mismatch;
- define Guide and contextual-help responsibilities;
- record the documentation consultation rule for all following PRs;
- align `ROADMAP.md`, the documentation index, and root documentation links.

### Specifications to review or update

- `product-spec.md`;
- `architecture.md`;
- `payment-contracts.md`;
- `money-and-allocation.md`;
- `state-machine.md`;
- `non-custodial-boundary.md`;
- `threat-model.md`;
- `localization.md`;
- `ui-ux-spec.md`;
- `screen-inventory.md`;
- `open-decisions.md`.

### Exit criteria

- all new terms have one canonical meaning;
- state transitions and non-custodial boundaries are documented;
- no planned behavior is listed as currently available;
- no runtime or database behavior changes in this PR.

## PR #133 — Add payment-mode, closure, and compatibility persistence

### Purpose

Persist the new mode and lifecycle concepts without breaking existing Bills or receipts.

### Changes

- add `representative` and `direct` Bill modes;
- store recipient display metadata separately from the Bill operator;
- preserve the existing creator-share field as a compatibility field while exposing recipient-funded semantics;
- add incomplete-closure state and timestamps;
- add structured review and latest-provider-state fields where required;
- read existing Bills as representative-mode Bills;
- reject direct-mode recipient-funded amounts;
- validate mode-specific total invariants.

### Specifications to review or update

- `persistence-scope.md`;
- `state-machine.md`;
- `money-and-allocation.md`;
- `payment-contracts.md`;
- `privacy-data-map.md`;
- `d1-provisioning.md`.

### Exit criteria

- forward migration and compatibility tests pass;
- existing Bills remain readable;
- direct and representative invariants are enforced server-side;
- closed Bills cannot create new payment activity.

## PR #134 — Remove Testnet assumptions from progress and canonicalize routes

### Purpose

Make Mainnet creator and read-only progress reliable and remove legacy route naming from the public flow.

### Changes

- replace Testnet-literal progress schemas and queries with the Bill's stored network;
- query receipts on the matching network;
- render the actual Mainnet or Testnet badge;
- validate XRP and RLUSD progress totals on both networks;
- introduce canonical `/payment`, `/bill/progress`, and `/proof` routes;
- preserve legacy `/testnet/...` links through fragment-safe redirects.

### Specifications to review or update

- `state-machine.md`;
- `persistence-scope.md`;
- `responsive-behavior.md`;
- `screen-inventory.md`;
- `mainnet-operational-controls.md`.

### Exit criteria

- no Testnet literal determines Mainnet progress behavior;
- old capability links still resolve without leaking or dropping fragments;
- network-mixing tests fail closed.

## PR #135 — Persist Xaman lifecycle and resume active handoffs

### Purpose

Keep payer and progress views synchronized and safely resume an existing Xaman handoff.

### Changes

- process verified Xaman callbacks into durable lifecycle state;
- persist created, opened, signed, submitted, rejected, expired, and failed states plus transaction identity where available;
- safely synchronize provider status during polling when callbacks are delayed;
- reopen an active QR or deep link instead of creating a duplicate handoff;
- resume ledger verification after submission;
- make rejected and expired handoffs immediately eligible for the approved reconciliation-and-retry path;
- keep `submitted` distinct from `paid`.

### Specifications to review or update

- `payment-contracts.md`;
- `state-machine.md`;
- `persistence-scope.md`;
- `payment-reconciliation.md`;
- `threat-model.md`;
- `mainnet-xaman-attestation.md`.

### Exit criteria

- payer and creator status remain consistent across reloads;
- duplicate and out-of-order callbacks are idempotent;
- submission never bypasses validated-ledger verification.

## PR #136 — Add XRPL account and asset readiness services

### Purpose

Provide one structured preflight service for recipient and payer readiness.

### Changes

- check account existence, network, tag format, spendable XRP, fee and reserve constraints;
- check official RLUSD trust lines, balances, freeze conditions, and receive readiness;
- return structured readiness results rather than UI copy;
- distinguish unavailable XRPL data from a confirmed readiness failure;
- use current ledger reserve and fee information where practical instead of relying only on fixed constants.

### Specifications to review or update

- `payment-contracts.md`;
- `mainnet-assets.md`;
- `recipient-readiness.md`;
- `threat-model.md`;
- `privacy-data-map.md`.

### Exit criteria

- XRP and RLUSD fixtures cover ready, missing, insufficient, frozen, and unavailable cases;
- no preflight result can mark a Payment paid;
- transient provider failure does not falsely report a definitive account failure.

## PR #137 — Add official RLUSD TrustSet preparation flow

### Purpose

Help recipients and payers safely establish the official network-specific RLUSD trust line.

### Changes

- build a TrustSet intent using only the canonical RLUSD currency and issuer for the selected network;
- bind the expected signer where the provider permits it;
- provide Xaman QR and deep-link preparation flows;
- verify the resulting trust line on XRPL before continuing;
- provide a shareable recipient-readiness link when a different person controls the recipient account;
- keep TrustSet lifecycle and Payment lifecycle distinct;
- explain that TrustSet does not transfer the Bill amount or fund the account.

### Specifications to review or update

- `payment-contracts.md`;
- `state-machine.md`;
- `recipient-readiness.md`;
- `mainnet-assets.md`;
- `non-custodial-boundary.md`;
- `threat-model.md`.

### Exit criteria

- arbitrary issuers and currencies cannot be injected;
- Mainnet and Testnet RLUSD identities cannot be mixed;
- successful setup is accepted only after ledger verification;
- rejection and expiry are safe to retry.

## PR #138 — Define failure taxonomy and safe recovery policy

### Purpose

Give the server, payer UI, progress UI, Guide, and contextual help one consistent interpretation of failures.

### Changes

Classify conditions including:

- payer cancellation;
- handoff expiry;
- Xaman or XRPL temporary unavailability;
- missing trust line;
- insufficient RLUSD;
- insufficient spendable XRP;
- submitted but not yet validated;
- failed validated transaction;
- wrong signer, destination, amount, asset, issuer, tags, or InvoiceID;
- unsupported partial or cross-currency Payment;
- duplicate and multiple-candidate observations.

Map each condition to one of:

- safe retry;
- wait and recheck;
- setup required;
- review required;
- already paid;
- terminal or closed.

### Specifications to review or update

- `state-machine.md`;
- `payment-reconciliation.md`;
- `payment-contracts.md`;
- `threat-model.md`;
- `localization.md`.

### Exit criteria

- no uncertain transfer is treated as a simple retry;
- raw provider or XRPL errors have stable internal codes and localized public explanations;
- recovery policy is covered by unit and integration tests.

## PR #139 — Add the shared semantic status and badge system

### Purpose

Make Bill, payer, readiness, network, asset, role, and capability states visually distinct without visual noise.

### Changes

- add shared status badge, icon, network badge, asset badge, role badge, link-type badge, readiness badge, and card-accent components;
- use five semantic families only: neutral, in-progress, complete, action-required, and destructive;
- represent every state with text and icon in addition to color;
- use thin accents and small badges instead of fully colored cards;
- keep XRP and RLUSD styling neutral so asset identity does not conflict with success or warning colors;
- keep Mainnet visually prominent without presenting it as an error.

### Specifications to review or update

- `design-tokens.md`;
- `ui-ux-spec.md`;
- `accessibility-spec.md`;
- `responsive-behavior.md`;
- `motion-spec.md`.

### Exit criteria

- status meaning remains understandable without color;
- contrast and reduced-motion requirements pass;
- English, Japanese, and Korean labels fit supported mobile and desktop widths.

## PR #140 — Add Guide and contextual-help infrastructure

### Purpose

Provide complete documentation and in-context help without abandoning an active operation.

### Changes

- add canonical `/guide` route and redirect `/about` to it;
- add stable language-independent section anchors;
- add a typed help registry containing short copy, detailed in-flow copy, and Guide targets;
- add desktop side-panel and mobile bottom-sheet help;
- open the full Guide in a separate protected tab when requested;
- ensure help does not expose capability fragments or private form data;
- preserve browser-local draft values, current step, and relevant navigation state;
- keep payment-status polling active while contextual help is open.

### Specifications to review or update

- `ui-ux-spec.md`;
- `screen-inventory.md`;
- `responsive-behavior.md`;
- `accessibility-spec.md`;
- `localization.md`;
- `privacy-data-map.md`.

### Exit criteria

- help can be opened and closed without losing work;
- Guide links never include capability tokens or draft data;
- base Guide sections and all three locales exist.

## PR #141 — Implement two-mode Bill creation

### Purpose

Replace creator-centric wording with explicit recipient and payer roles.

### Changes

- begin with “Who will participants pay?” and the two approved mode cards;
- remove the redundant arrow diagram and use concise examples and recipient statements;
- build mode-specific recipient, Bill, allocation, and payer steps;
- show recipient-funded amount only when enabled in representative mode;
- allow the operator to add themselves as a normal payer in direct mode;
- enforce address uniqueness, recipient/payer separation, positive amounts, and exact totals;
- store draft values and current step in session storage until creation or explicit discard;
- attach contextual help to role, payer-address, tag, asset, recipient-funded amount, and freeze fields.

### Specifications to review or update

- `product-spec.md`;
- `bill-review.md`;
- `money-and-allocation.md`;
- `ui-ux-spec.md`;
- `screen-inventory.md`;
- `localization.md`.

### Exit criteria

- both modes create server-valid review requests;
- role meaning is clear in all three languages;
- reload and help navigation preserve the unfinished draft.

## PR #142 — Revise Bill review, created-Bill sharing, and participant instructions

### Purpose

Show exactly who receives funds, what is transferred, and which link may be shared with whom.

### Changes

- create mode-specific review summaries;
- distinguish Bill total, recipient-funded amount, participant collection total, verified total, and remaining total;
- label recipient-funded amount as “no transfer”;
- identify management, read-only, and participant payment links with neutral link-type badges and disclosure copy;
- add copy actions for the bare payment link, full payment instructions, and RLUSD preparation instructions;
- include payer address, network, asset, amount, recipient, XRP fee requirement, and RLUSD readiness requirements in participant instructions;
- preserve capability privacy.

### Specifications to review or update

- `bill-review.md`;
- `privacy-data-map.md`;
- `ui-ux-spec.md`;
- `screen-inventory.md`;
- `localization.md`.

### Exit criteria

- review totals are mode-correct;
- every shared link has a clear audience and warning;
- copied instructions are complete in English, Japanese, and Korean.

## PR #143 — Add payer readiness and RLUSD setup UI

### Purpose

Block an avoidable failed payment before Xaman Payment creation and show the exact preparation required.

### Changes

- run payer and recipient readiness checks before Payment handoff creation;
- show trust-line, RLUSD balance, spendable XRP, fee, and reserve results separately;
- launch the approved TrustSet flow when required;
- recheck the ledger after setup or balance changes;
- explain that trust-line setup does not provide RLUSD;
- show current, required, and missing amounts when safely available;
- connect each condition to contextual help and the matching Guide section.

### Specifications to review or update

- `payment-final-confirmation.md`;
- `recipient-readiness.md`;
- `ui-ux-spec.md`;
- `localization.md`;
- `accessibility-spec.md`.

### Exit criteria

- Xaman Payment handoff is not created while a confirmed readiness blocker exists;
- transient readiness service failure is presented as unavailable, not as insufficient funds;
- setup and retry work in all three locales.

## PR #144 — Add payer failure, pending, and retry experience

### Purpose

Provide safe next actions for every payer lifecycle state.

### Changes

- add complete cancellation, expiry, setup-required, pending, failed, already-paid, and review-required views;
- show a retry button only when the recovery policy allows it;
- reconcile before replacement handoff creation;
- prohibit a second Payment while submission or validation remains uncertain;
- translate known XRPL outcomes into clear public explanations while preserving technical detail for diagnostics;
- attach state-specific contextual help and Guide links.

### Specifications to review or update

- `payment-final-confirmation.md`;
- `state-machine.md`;
- `payment-reconciliation.md`;
- `ui-ux-spec.md`;
- `localization.md`.

### Exit criteria

- each failure fixture renders the approved action;
- uncertain and mismatched transfers cannot be retried accidentally;
- already-paid links never request another Payment.

## PR #145 — Make creator progress actionable

### Purpose

Show accurate collection progress and the safe action available for each payer.

### Changes

- add mode-correct expected, verified, remaining, and payer-count summaries;
- render group and payer semantic badges;
- show payer label, frozen amount, expected address, transaction identity, confirmation time, and review reason according to capability scope;
- add copy/share instructions and status refresh actions;
- show transaction and proof links for verified slots;
- keep read-only progress redacted;
- do not let the Bill operator initiate Xaman on behalf of a payer.

### Specifications to review or update

- `state-machine.md`;
- `privacy-data-map.md`;
- `screen-inventory.md`;
- `ui-ux-spec.md`;
- `localization.md`.

### Exit criteria

- representative and direct totals are correct;
- management and read-only capabilities expose only approved fields;
- every payer state has an understandable safe action or explicit no-action explanation.

## PR #146 — Add review handling, retry authorization, and incomplete closure

### Purpose

Resolve mismatched or permanently unpaid slots without weakening verification.

### Changes

- show expected versus observed transaction facts for review-required slots;
- link to an approved explorer without exposing private capability data;
- require an explicit double-payment warning before allowing a new attempt after an observed mismatch;
- never offer manual ledger-verified settlement;
- allow a Bill to close incomplete while preserving verified receipts;
- stop new handoffs after closure;
- show paid count, verified amount, unpaid amount, and no-refund disclosure after closure.

### Specifications to review or update

- `state-machine.md`;
- `payment-reconciliation.md`;
- `non-custodial-boundary.md`;
- `threat-model.md`;
- `privacy-data-map.md`;
- `ui-ux-spec.md`.

### Exit criteria

- review-required slots cannot silently become unpaid or paid;
- closure preserves all verified records and prevents new payment activity;
- destructive actions use explicit confirmation and appropriate semantic styling.

## PR #147 — Add copy-to-revise and enforce post-freeze immutability

### Purpose

Support changed recipients, payers, or amounts without mutating an existing frozen Bill.

### Changes

- add “Copy this Bill and create a new one”;
- copy mode, title, asset, recipient, labels, and allocations into a new browser-local draft;
- generate new Bill, slot, capability, InvoiceID, and link identities on creation;
- keep the original Bill unchanged;
- prohibit in-place waiver, reassignment, amount editing, and destination editing.

### Specifications to review or update

- `bill-review.md`;
- `money-and-allocation.md`;
- `state-machine.md`;
- `privacy-data-map.md`;
- `ui-ux-spec.md`.

### Exit criteria

- copied drafts are editable but cannot reuse frozen identities;
- the original Bill and receipts are byte-for-byte unchanged by copy-to-revise;
- immutable-field API tests fail closed.

## PR #148 — Complete the Guide, FAQ, and contextual-help coverage

### Purpose

Publish one complete, searchable, multilingual explanation of the current product and its failure behavior.

### Changes

Complete Guide sections for:

- product purpose and non-custodial behavior;
- payment modes and roles;
- creation, sharing, signing, verification, and progress;
- XRP and official RLUSD;
- trust lines, balances, fees, and reserves;
- capability-link roles and privacy;
- every group and payer status;
- every supported failure and recovery pattern;
- one-payer failure and partial completion;
- review-required transactions and duplicate prevention;
- incomplete closure and copy-to-revise;
- security checks, limitations, and FAQ.

Connect every relevant field, readiness result, payment state, progress state, and destructive confirmation to its contextual-help entry and stable Guide anchor.

### Specifications to review or update

- all public product, safety, state, UX, privacy, and localization documents affected by final wording;
- `README.md` and `ROADMAP.md` for availability only when features are actually merged.

### Exit criteria

- English, Japanese, and Korean have key-identical critical guidance;
- no Guide section describes an unimplemented feature as available;
- page search, anchors, keyboard navigation, mobile help, and back/close behavior pass.

## PR #149 — Run integrated lifecycle, multilingual, visual, and Mainnet-safe audit

### Purpose

Verify the entire revision across modes, assets, states, capabilities, languages, and supported viewports before declaring it available.

### Changes

- run unit, integration, API, migration, browser, accessibility, and production-build checks;
- cover representative and direct modes with XRP and RLUSD;
- cover TrustSet, insufficient balances, cancellation, expiry, pending validation, failure, mismatch, duplicate, partial completion, review, closure, and copy-to-revise;
- audit management, read-only, payer, proof, Guide, and contextual-help privacy;
- audit English, Japanese, and Korean server/client consistency and long strings;
- audit semantic color use, badges, icons, mobile reflow, and no-color comprehension;
- run controlled Testnet end-to-end flows;
- audit Mainnet configuration, read paths, readiness, and progress without adding uncontrolled real-value transactions;
- update `README.md`, `ROADMAP.md`, and `CHANGELOG.md` only for capabilities proven available.

### Specifications to review or update

- all documents listed by `docs/README.md` that were affected by the revision;
- Mainnet operational, acceptance, and evidence documents if the release decision or production controls change.

### Exit criteria

- all required automated checks pass;
- Testnet evidence covers the approved lifecycle;
- no unresolved high-severity safety, privacy, verification, accessibility, localization, or Mainnet finding remains;
- public availability statements match the merged and deployed behavior.

## 7. Stage gates

### Gate A — Documentation and domain foundation

After PR #133:

- approved roles, modes, states, and invariants are reflected in specifications and persistence;
- compatibility tests pass;
- no UI work proceeds while a domain or migration conflict remains open.

### Gate B — Runtime safety foundation

After PR #138:

- Mainnet progress uses the correct network;
- Xaman lifecycle is durable;
- readiness and TrustSet services are bounded;
- every failure has one recovery classification;
- replacement Payments remain reconciliation-gated.

### Gate C — Shared experience foundation

After PR #140:

- semantic status components are accessible;
- Guide and contextual-help infrastructure preserve active work and capability privacy.

### Gate D — Creator and payer flows

After PR #144:

- both modes work through review and sharing;
- payer readiness and recovery are complete;
- all critical copy exists in English, Japanese, and Korean.

### Gate E — Administration and immutable revision

After PR #147:

- progress actions, review handling, incomplete closure, and copy-to-revise preserve verified receipts and frozen facts.

### Gate F — Release audit

After PR #149:

- integrated lifecycle, multilingual, accessibility, visual, privacy, Testnet, and Mainnet-safe checks pass;
- only proven capabilities move to Available.

## 8. Explicitly out of scope

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

## 9. Schedule maintenance

- The status of this document must be updated when the active stage changes.
- A PR is complete only after merge, required tests, and intended-environment verification.
- Every PR in the sequence must link this schedule and list the specifications it consulted.
- If implementation reveals a missing requirement, the relevant specification and this schedule must be corrected before dependent work continues.
- If PR boundaries or order change, this document must be updated before the revised work begins.
- `CHANGELOG.md` records completed behavior only; planned entries remain in this schedule and `ROADMAP.md`.
