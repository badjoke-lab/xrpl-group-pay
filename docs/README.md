# XRPL Group Pay — Documentation Index

**Status:** Active  
**Scope:** Public documentation map and precedence rules  
**Last reviewed:** 2026-06-24  
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
6. public roadmap and changelog.

A lower-precedence document cannot silently weaken a higher-precedence safety or product requirement.

## 3. External requirements

- `make-waves-requirements.md` — official challenge requirements, unresolved organizer questions, metrics assumptions, and submission gates.

External requirements describe obligations imposed on the project. They do not redefine the product without a corresponding product-specification change.

## 4. Product and architecture

- `product-spec.md` — public product scope, Make Waves v1 target, actors, domain model, acceptance criteria, and post-submission direction.
- `architecture.md` — dependency direction and extension boundaries for the Group Pay core, payment domain, adapters, and payment rails.
- `payment-contracts.md` — logical contracts for assets, Payment Intents, Wallet Providers, verification, receipts, quotes, and rails.
- `money-and-allocation.md` — fixed-precision money model, Accounting Currency, Settlement Asset, allocation strategies, and future quote behavior.
- `localization.md` — English, Japanese, and Korean localization contract.
- `open-decisions.md` — active, blocked, superseded, and decided implementation questions.

These documents define approved behavior. They may describe target behavior that is not yet available. Current availability must be stated separately in the root `README.md`, `ROADMAP.md`, and `CHANGELOG.md`.

## 5. Safety, state, privacy, and persistence

- `non-custodial-boundary.md` — capabilities the product may and must not acquire.
- `threat-model.md` — protected assets, trust boundaries, abuse cases, mitigations, and release gates.
- `privacy-data-map.md` — data classification, storage, disclosure, retention, and deletion.
- `state-machine.md` — Bill, PaymentSlot, wallet-handoff, transaction-observation, and verification states.
- `persistence-scope.md` — durable records, compatibility guarantees, and current database scope.
- `d1-provisioning.md` — local, Testnet, and Mainnet D1 provisioning and migration controls.
- `transaction-proof.md` — public proof fields, digest contracts, privacy boundary, and integrity checks.

Any change to custody, asset identity, wallet authority, expected payment facts, ledger verification, receipt compatibility, or public proof requires all affected documents in this section to be updated before implementation.

## 6. Feature contracts

- `bill-review.md` — creator review and Bill-freeze boundary.
- `payment-final-confirmation.md` — participant review before Wallet Handoff creation.

A feature contract documents the exact behavior of a shipped or actively implemented vertical slice. It cannot broaden the product beyond `product-spec.md`.

## 7. User experience

- `ui-ux-spec.md` — experience principles, content order, error presentation, and wallet/asset display.
- `screen-inventory.md` — required screens, actors, priorities, states, and fixtures.
- `accessibility-spec.md` — WCAG target and critical-flow accessibility requirements.
- `responsive-behavior.md` — viewport, reflow, navigation, table, and visual-regression behavior.
- `design-tokens.md` — color, typography, spacing, controls, and semantic visual rules.
- `motion-spec.md` — permitted, reduced, and prohibited motion.

## 8. Public direction and history

- `../ROADMAP.md` — public direction and current status using Available, In Progress, Next, Later, and Research.
- `../CHANGELOG.md` — meaningful completed user-facing, security, compatibility, and operational changes.
- `changelog-policy.md` — changelog inclusion and release rules.

Roadmap items are not implementation promises. Changelog entries must describe completed behavior only.

## 9. Current implementation versus approved target

Documents use a `Scope` header:

- **Current implementation** describes behavior that exists on `main`.
- **Approved Make Waves v1 target** describes behavior that implementation PRs must reach before the target release.
- **Post-submission direction** describes an extension boundary or future capability, not current availability.

The root `README.md` must keep current availability and approved target visibly separate.

## 10. Change discipline

A major PR must state whether it affects:

- product scope;
- architecture;
- non-custodial boundary;
- asset identity;
- Wallet Provider behavior;
- verification or Receipt Contracts;
- privacy or persistence;
- localization;
- Roadmap;
- Changelog.

A change that affects one of these areas must update the relevant documents in the same documentation sequence or explain why no update is required.
