# XRPL Group Pay — Documentation Index

**Status:** Active  
**Scope:** Public documentation map and precedence rules  
**Last reviewed:** 2026-07-03  
**Document class:** Public

## 1. Purpose

This index identifies the public documents that define XRPL Group Pay, their roles, and the precedence used when documents overlap.

## 2. Precedence

When two documents appear inconsistent, use this order and open a corrective documentation change before implementation continues:

1. external requirements;
2. product and architecture specifications;
3. safety, state, privacy, and verification boundaries;
4. feature contracts;
5. user-experience specifications;
6. implementation schedules;
7. public roadmap and changelog.

A lower-precedence document cannot silently weaken a higher-precedence safety or product requirement.

Within the product and architecture class, `payment-lifecycle-contract.md` is the specific contract for the PR #132–#149 revision and controls where older general creator-centric wording assumes that the Bill creator is always the recipient.

## 3. External requirements

- `make-waves-requirements.md` — official challenge requirements, unresolved organizer questions, metrics assumptions, and submission gates.

External requirements describe obligations imposed on the project. They do not redefine the product without a corresponding product-specification change.

## 4. Product and architecture

- `product-spec.md` — public product scope, Make Waves v1 target, actors, domain model, acceptance criteria, and post-submission direction.
- `payment-lifecycle-contract.md` — specific role, payment-mode, lifecycle, recovery, Guide, help, and semantic-status contract for the completed revision.
- `architecture.md` — dependency direction and extension boundaries for the Group Pay core, payment domain, adapters, and payment rails.
- `payment-contracts.md` — logical contracts for assets, Payment Intents, Wallet Providers, verification, receipts, quotes, and rails.
- `money-and-allocation.md` — fixed-precision money model, Accounting Currency, Settlement Asset, allocation strategies, and future quote behavior.
- `localization.md` — base English, Japanese, and Korean localization contract.
- `payment-lifecycle-localization.md` — terminology, Guide, help, status, copied-instruction, and recovery coverage for the completed revision.
- `open-decisions.md` — active, blocked, superseded, and decided implementation questions.

These documents define approved behavior. They may describe target behavior that is not yet available. Current availability must be stated separately in the root `README.md`, `ROADMAP.md`, and `CHANGELOG.md`.

## 5. Safety, state, privacy, and persistence

- `non-custodial-boundary.md` — capabilities the product may and must not acquire.
- `threat-model.md` — protected assets, trust boundaries, abuse cases, mitigations, and release gates.
- `payment-lifecycle-security.md` — role, retry, TrustSet, Guide, closure, copy, and Mainnet-progress controls for the completed revision.
- `payment-lifecycle-release-audit.md` — current PR #149 integrated lifecycle, multilingual, visual, privacy, Testnet, Mainnet-safe, and public-availability decision.
- `privacy-data-map.md` — data classification, storage, disclosure, retention, and deletion.
- `state-machine.md` — Bill, PaymentSlot, wallet-handoff, transaction-observation, recovery, and verification states.
- `persistence-scope.md` — durable records, compatibility guarantees, and current database scope.
- `payment-mode-persistence.md` — PR #133 payment-mode, recipient-funded, closure, and review storage contract.
- `network-progress-and-routes.md` — PR #134 network-derived progress, canonical routes, and legacy fragment-preserving redirects.
- `xaman-lifecycle-persistence.md` — PR #135 durable Xaman state, callback and polling synchronization, resume, and retry boundaries.
- `asset-readiness.md` — PR #136 recipient and payer XRP/RLUSD preflight, reserve, fee, trust-line, and balance contract.
- `rlusd-trustset-preparation.md` — PR #137 official RLUSD TrustSet planning, shareable capability flow, Xaman lifecycle, and validated-ledger readiness contract.
- `payment-failure-taxonomy.md` — PR #138 stable failure codes, recovery dispositions, replacement rules, and localization contract.
- `operator-progress-dashboard.md` — PR #145 mode-correct totals, capability-scoped details, semantic states, safe payer actions, refresh, and link handling.
- `review-retry-closure.md` — PR #146 expected-versus-observed review facts, explicit retry authorization, immutable incomplete closure, audit records, and privacy controls.
- `copy-to-revise-and-frozen-immutability.md` — PR #147 browser-local copy-to-revise, identity regeneration, source preservation, and D1 frozen-field enforcement.
- `d1-provisioning.md` — local, Testnet, and Mainnet D1 provisioning and migration controls.
- `transaction-proof.md` — public proof fields, digest contracts, privacy boundary, and integrity checks.
- `payment-reconciliation.md` — validated-ledger reconciliation required before replacing a prior Wallet Handoff.
- `mainnet-operational-controls.md` — Mainnet enabled, verify-only, and halted runtime behavior.
- `mainnet-acceptance-audit.md` — approved Mainnet cross-control audit, resolved findings, and operational trust boundary.
- `mainnet-release-evidence.md` — non-secret production evidence contracts, acceptance fields, and update discipline.
- `mainnet-production-target.md` — fixed public origin, guarded Xaman callback boundary, and halted rollback sequence.
- `mainnet-xaman-attestation.md` — provider credential, application configuration, callback alignment, and safe lifecycle attestation.

Any change to custody, asset identity, wallet authority, expected payment facts, ledger verification, receipt compatibility, public proof, Mainnet operations, release evidence, or release acceptance requires all affected documents in this section to be updated before implementation.

## 6. Feature contracts

- `bill-review.md` — Bill-operator review and Bill-freeze boundary.
- `payment-final-confirmation.md` — payer review before Wallet Handoff creation.

A feature contract documents the exact behavior of a shipped or actively implemented vertical slice. It cannot broaden the product beyond the product and architecture specifications.

## 7. User experience

- `ui-ux-spec.md` — experience principles, content order, contextual help, status presentation, and wallet/asset display.
- `guide-and-contextual-help.md` — PR #148 searchable multilingual Guide, stable anchors, typed help coverage, private-flow safety, and keyboard/mobile behavior.
- `screen-inventory.md` — required screens, actors, priorities, states, and fixtures.
- `accessibility-spec.md` — WCAG target and critical-flow accessibility requirements.
- `responsive-behavior.md` — viewport, reflow, navigation, table, and visual-regression behavior.
- `design-tokens.md` — color, typography, spacing, controls, and semantic visual rules.
- `motion-spec.md` — permitted, reduced, and prohibited motion.

## 8. Implementation schedules

- `payment-lifecycle-revision-schedule.md` — completed PR #132–#149 sequence for the payment-lifecycle revision.
- `mainnet-release-plan.md` — specialized Mainnet release sequence, not the general product-development schedule.

Schedules order approved work but do not override the documents above. Before each scheduled PR, review all affected higher-precedence documents and correct any conflict before implementation continues.

## 9. Public direction and history

- `../ROADMAP.md` — public direction and current status using Available, In Progress, Next, Later, and Research.
- `../CHANGELOG.md` — meaningful completed user-facing, security, compatibility, and operational changes.
- `changelog-policy.md` — changelog inclusion and release rules.

Roadmap items are not implementation promises. Changelog entries must describe completed behavior only.

## 10. Current implementation versus approved target

Documents use a `Scope` header:

- **Current implementation** describes behavior that exists on `main`.
- **Approved Make Waves v1 target** describes behavior that implementation PRs must reach before the target release.
- **Approved implementation sequence** describes ordered work that is not available until merged, tested, and verified.
- **Post-submission direction** describes an extension boundary or future capability, not current availability.

The root `README.md` must keep current availability and approved target visibly separate.

## 11. Change discipline

A major PR must state whether it affects:

- product scope;
- architecture;
- non-custodial boundary;
- asset identity;
- Wallet Provider behavior;
- verification or Receipt Contracts;
- privacy or persistence;
- localization;
- Mainnet operations, evidence, or acceptance;
- implementation schedule;
- Roadmap;
- Changelog.

A change that affects one of these areas must update the relevant documents in the same documentation sequence or explain why no update is required.

Every scheduled PR must list the higher-precedence documents it reviewed and keep planned behavior separate from shipped availability.
