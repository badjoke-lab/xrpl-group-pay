# XRPL Group Pay — Integrated Payment Lifecycle Release Audit

**Audit status:** Completed  
**Release result:** Passed  
**Audited:** 2026-07-03  
**Scope:** PR #132–#149 payment-lifecycle revision  
**Document class:** Public

## 1. Decision

The payment-lifecycle revision passes its integrated release audit.

The reviewed implementation covers both payment modes, XRP and official network-specific RLUSD, independent payer settlement, readiness, TrustSet preparation, Xaman lifecycle persistence, validated-ledger verification, recovery, operator progress, review, incomplete closure, copy-to-revise, semantic status, and complete English, Japanese, and Korean guidance.

No unresolved high-severity safety, privacy, verification, accessibility, localization, visual, or Mainnet finding remains in the release record.

This decision does not remove the Mainnet operational kill switch, capability separation, validated-ledger verification, frozen payment facts, duplicate protection, or the non-custodial boundary.

## 2. Revision boundary

The audited implementation sequence is PR #132 through PR #149.

PR #132 defined the revision contract. PRs #133–#148 implemented and documented the approved persistence, runtime, UI, recovery, administration, and guidance changes. PR #149 records and machine-enforces the integrated result.

The machine-readable audit is `config/payment-lifecycle-release-audit.json` and is validated by:

```bash
pnpm check:lifecycle-audit
```

## 3. Product matrix

### Payment modes

- **Pay a representative** — participant Payments go directly to the representative recipient; a recipient-funded portion may be recorded without a self-transfer.
- **Pay a store or organizer directly** — the complete Bill total is assigned to payer PaymentSlots and sent directly to the external recipient.

### Settlement Assets

- XRPL Testnet XRP;
- XRPL Testnet official RLUSD;
- XRPL Mainnet XRP;
- XRPL Mainnet official RLUSD.

Every Bill freezes one Asset identity across all PaymentSlots. Group Pay does not exchange, bridge, or mix Assets within a Bill.

### Independent settlement

Each payer has an independent frozen PaymentSlot and signs an independent Payment. One payer failure does not reverse another payer's validated transfer. A Bill may remain open or partially paid while another payer retries, prepares RLUSD, waits for validation, or requires review.

## 4. Lifecycle and recovery matrix

The audit covers:

- unpaid;
- wallet request created;
- awaiting signature;
- payer rejection;
- request expiry;
- submitted;
- validating;
- paid;
- verification failed;
- review required;
- closed incomplete.

Every supported failure maps to one recovery disposition:

- safe retry;
- wait and recheck;
- setup required;
- review required;
- already paid;
- terminal.

Replacement handoffs remain reconciliation-gated. A management capability cannot manually mark a PaymentSlot paid.

## 5. XRP and RLUSD readiness

The integrated checks cover validated-ledger account existence, recipient requirements, Destination Tag, Deposit Authorization, reserve, fee, spendable XRP, official RLUSD identity, trust-line presence, authorization, freeze state, balance, and recipient capacity.

TrustSet preparation is a separate payer-controlled XRPL transaction. It configures the official RLUSD trust line and does not pay the Bill or provide an RLUSD balance.

## 6. Verification, persistence, and duplicate safety

A PaymentSlot becomes paid only after the server re-resolves the frozen obligation, re-fetches the Xaman payload, and matches the validated transaction.

Verification covers:

- network;
- successful validated result;
- payer and recipient;
- XRP or exact issued-Asset identity;
- requested and delivered amount;
- Source Tag and optional Destination Tag;
- InvoiceID;
- partial-payment and unsupported path rejection;
- transaction and slot state;
- duplicate and cross-slot replay boundaries.

The durable settlement path stores or reuses the verified receipt, marks only the matching PaymentSlot paid, and recomputes Bill progress atomically.

## 7. Administration and immutable revision

Management-only controls expose expected-versus-observed review facts, explicit repeated-payment warnings, incomplete closure, and copy-to-revise.

Incomplete closure:

- stops new unpaid handoffs;
- preserves verified receipts and paid totals;
- does not reverse or automatically refund validated transfers;
- cannot be reopened.

Copy-to-revise:

- creates a separate browser-local draft;
- copies editable facts and final allocations;
- generates new Bill, PaymentSlot, capability, InvoiceID, and link identities;
- never changes the source Bill or its receipts.

D1 triggers reject in-place changes to frozen Bill and PaymentSlot facts while preserving exact compatibility normalization and legitimate lifecycle updates.

## 8. Capability and privacy audit

The audit covers:

- private management capability;
- read-only progress capability;
- payer capability;
- RLUSD setup capability;
- public proof;
- public Guide;
- contextual help.

Public and read-only surfaces do not expose management-only payer labels, expected payer addresses, InvoiceIDs, review details, retry authorization, or closure controls.

Guide and help links contain only the public `/guide` route and approved stable anchors. They do not copy active capabilities, queries, draft values, payer facts, transaction identifiers, or proof data.

## 9. Multilingual, accessibility, and visual audit

English, Japanese, and Korean use key-identical critical Guide and help identifiers. Server-rendered and client-rendered language state is checked to prevent mixed-language production pages.

The reviewed UI uses text and icons in addition to semantic color. Keyboard focus, help-dialog focus trapping and restoration, Guide search, stable anchors, mobile reflow, 200% zoom behavior, and no-horizontal-overflow expectations are covered by component, browser, and production UI checks.

Production UI capture covers:

- 320px mobile;
- 390px mobile;
- 1280px desktop;
- English XRP creation;
- Japanese official RLUSD creation;
- selected Mainnet Asset identity;
- stale or mixed-language copy rejection;
- horizontal overflow rejection.

## 10. Testnet evidence

Testnet coverage uses deterministic automated fixtures and browser flows for the approved lifecycle without requiring CI to hold a user wallet seed or approve a real transaction.

It covers:

- representative and direct Bill creation;
- XRP and RLUSD selection;
- allocation and freeze review;
- participant instructions and capability separation;
- readiness and TrustSet planning;
- payer cancellation, expiry, pending validation, retry, failure, mismatch, and review;
- duplicate and replay prevention;
- partial completion, closure, and copy-to-revise;
- progress, proof, Guide, and contextual help.

Credentialed human-operated Testnet signing remains an intended-environment verification activity and must never place seeds or private capability tokens in CI fixtures or public evidence.

## 11. Mainnet-safe evidence

Mainnet acceptance remains approved in `config/mainnet-acceptance.json`; all acceptance controls pass and all blocking findings are resolved. `config/mainnet-gate.json` is ready, and all seven records in `config/mainnet-release-evidence.json` are accepted.

The evidence includes controlled validated Mainnet XRP and official RLUSD transactions, durable receipts, idempotent repeat verification, duplicate and cross-slot replay rejection, isolated D1, provider attestation, assigned Source Tag, and an operational stop drill.

The public production Bill UI is audited continuously without creating uncontrolled real-value transactions. Mainnet creation and verification remain subject to explicit release and operations controls, and the committed halted configuration remains the fail-closed rollback baseline.

## 12. Automated release gates

The required CI gates are:

- environment and deployment boundaries;
- Mainnet release evidence and acceptance;
- integrated lifecycle audit;
- D1 migrations and constraints;
- lint and TypeScript;
- unit, component, API, and persistence tests;
- Next.js build;
- Storybook smoke;
- Cloudflare Worker build;
- browser smoke tests;
- production Bill UI audit.

A later change that breaks the machine-readable audit matrix, removes required evidence, reopens a severe finding, or misaligns public availability causes validation to fail.

## 13. Remaining work outside the revision

No payment-lifecycle implementation work remains in progress for PR #132–#149.

Remaining Make Waves submission work is operational and editorial: Source Tag metrics, final video and deck, submission-form assembly, and evidence links. Later product directions remain separate in `ROADMAP.md` and are not release claims.
