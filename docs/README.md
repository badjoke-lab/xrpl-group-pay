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

Within the product and architecture class, `payment-lifecycle-contract.md` is the specific contract for the PR #132–#149 revision.

For the completed PR #150–#152 phase, `wallet-input-and-local-address-book.md` is the specific cross-cutting contract for address roles, Wallet Provider compatibility, direct input, X-address handling, clipboard assistance, browser-local saved wallets, privacy, localization, accessibility, and deferred work. It cannot weaken the completed payment-lifecycle or Mainnet controls.

## 3. External requirements

- `make-waves-requirements.md` — official challenge requirements, unresolved organizer questions, metrics assumptions, and submission gates.

## 4. Product and architecture

- `product-spec.md` — product scope, actors, domain model, acceptance criteria, and post-submission direction.
- `payment-lifecycle-contract.md` — completed role, payment-mode, lifecycle, recovery, Guide, help, and semantic-status contract.
- `wallet-input-and-local-address-book.md` — completed address-entry, Wallet Provider boundary, X-address, clipboard, browser-local saved-wallet, privacy, and acceptance contract.
- `architecture.md` — dependency direction and extension boundaries.
- `payment-contracts.md` — asset, Payment Intent, Wallet Provider, verification, receipt, quote, and rail contracts.
- `money-and-allocation.md` — fixed-precision money and allocation model.
- `localization.md` — base English, Japanese, and Korean localization contract.
- `payment-lifecycle-localization.md` — lifecycle terminology and coverage.
- `open-decisions.md` — active, blocked, superseded, and decided implementation questions.

## 5. Safety, state, privacy, persistence, and release decisions

- `non-custodial-boundary.md` — capabilities the product may and must not acquire.
- `threat-model.md` — protected assets, trust boundaries, abuse cases, mitigations, and release gates.
- `payment-lifecycle-security.md` — payment-lifecycle security controls.
- `payment-lifecycle-release-audit.md` — PR #149 integrated payment-lifecycle release decision.
- `wallet-input-release-audit.md` — PR #152 integrated wallet-input, privacy, accessibility, localization, responsive, Mainnet-safe, and regression decision.
- `privacy-data-map.md` — data classification, browser-local saved wallets, storage, disclosure, retention, and deletion.
- `state-machine.md` — Bill, PaymentSlot, wallet-handoff, observation, recovery, and verification states.
- `persistence-scope.md` — durable records and compatibility guarantees.
- `payment-mode-persistence.md` — payment-mode, recipient-funded, closure, and review storage contract.
- `network-progress-and-routes.md` — network-derived progress and canonical routes.
- `xaman-lifecycle-persistence.md` — durable Xaman lifecycle and retry boundaries.
- `asset-readiness.md` — recipient and payer XRP/RLUSD readiness.
- `rlusd-trustset-preparation.md` — official RLUSD TrustSet preparation.
- `payment-failure-taxonomy.md` — failure and recovery classifications.
- `operator-progress-dashboard.md` — management and read-only progress contract.
- `review-retry-closure.md` — review, retry authorization, and incomplete closure.
- `copy-to-revise-and-frozen-immutability.md` — copy-to-revise and frozen-field enforcement.
- `d1-provisioning.md` — local, Testnet, and Mainnet D1 provisioning.
- `transaction-proof.md` — public proof and privacy boundary.
- `payment-reconciliation.md` — reconciliation before replacement handoff.
- `mainnet-operational-controls.md` — Mainnet enabled, verify-only, and halted behavior.
- `mainnet-acceptance-audit.md` — approved Mainnet cross-control audit.
- `mainnet-release-evidence.md` — production evidence contracts.
- `mainnet-production-target.md` — public origin and halted rollback sequence.
- `mainnet-xaman-attestation.md` — provider configuration and callback attestation.

## 6. Feature contracts

- `bill-review.md` — Bill review and freeze boundary.
- `payment-final-confirmation.md` — payer review before Wallet Handoff creation.

## 7. User experience

- `ui-ux-spec.md` — experience principles and status presentation.
- `guide-and-contextual-help.md` — searchable multilingual Guide, address and saved-wallet guidance, stable anchors, private-flow safety, and keyboard/mobile behavior.
- `screen-inventory.md` — required screens and states.
- `accessibility-spec.md` — accessibility requirements.
- `responsive-behavior.md` — viewport, reflow, zoom, and visual-regression behavior.
- `design-tokens.md` — visual tokens and semantic rules.
- `motion-spec.md` — permitted and prohibited motion.

## 8. Implementation schedules

- `payment-lifecycle-revision-schedule.md` — completed PR #132–#149 sequence.
- `wallet-input-pre-submission-schedule.md` — completed PR #150–#152 sequence and feature freeze.
- `mainnet-release-plan.md` — specialized Mainnet release sequence.

Schedules record ordered work but do not override higher-precedence contracts.

## 9. Public direction and history

- `../ROADMAP.md` — current status and post-submission direction.
- `../CHANGELOG.md` — completed user-facing, security, compatibility, persistence, and operational changes.
- `changelog-policy.md` — changelog inclusion and release rules.

## 10. Current implementation versus future direction

Documents use a `Scope` header:

- **Current implementation** describes behavior that exists on `main`.
- **Completed release decision** records merged and audited behavior.
- **Post-submission direction** describes a future extension boundary, not current availability.

The root `README.md`, `ROADMAP.md`, and `CHANGELOG.md` keep current availability and future work visibly separate.

## 11. Change discipline

A major PR states whether it affects product scope, architecture, custody, asset identity, Wallet Provider behavior, verification, receipts, privacy, persistence, localization, Mainnet controls, schedules, Roadmap, or Changelog.

A change that affects one of these areas updates the relevant higher-precedence documents in the same sequence or explains why no update is required.
