# Changelog

Meaningful user-facing, security, compatibility, persistence, and operational changes are recorded here. Planned work belongs in `ROADMAP.md`.

## [Unreleased]

### Added

- Introduced fixed-precision `MoneyAmount` primitives and an immutable Asset Registry foundation with separate XRP Testnet and Mainnet descriptors.
- Added a wallet-neutral Payment Intent contract and a provider-independent XRP transaction builder.
- Added the Wallet Provider contract and an initial Xaman adapter with explicit Testnet and native-XRP capabilities.
- Added durable provider-request lifecycle records with one active request allowed per PaymentSlot.

### Changed

- Existing slot-bound Xaman requests are now derived from frozen Payment Intents while preserving their current Testnet transaction and handoff shape.
- Payment request creation now records provider ID, provider request ID, Payment Intent identity and revision, status, expiry, and submitted transaction identity when available.
- Approved the Make Waves v1 target for XRP and official RLUSD on XRPL.
- Defined Payment Intent, Wallet Provider, Asset Registry, verification, and versioned receipt boundaries.
- Defined Equal, Percentage, Shares, and Custom Amount allocation contracts.
- Defined English, Japanese, and Korean localization requirements.
- Added public Roadmap and Changelog governance.

The new request-state persistence preserves the currently available XRP Testnet response shape and payer interface. Runtime availability remains XRP Testnet with Xaman until corresponding asset, network, and localization releases are completed.

## [0.1.0] — 2026-06-24

### Added

- XRP Testnet Bill creation and participant capabilities.
- Xaman Payment handoff.
- Validated-ledger verification and durable D1 receipts.
- Atomic PaymentSlot and Bill progress updates.
- Public transaction proof.
- Creator review before Bill freeze.
- Participant final confirmation before Xaman request creation.
- Responsive payer and creator views.

### Security

- Exact sender, destination, XRP amount, tags, InvoiceID, network, result, and delivered-amount checks.
- Partial Payment and unsupported path rejection.
- Unique transaction and InvoiceID constraints.
- Idempotent processing and capability redaction.
- Server-authoritative expected Payment values.

## Version policy

- `0.x` covers Testnet and pre-Mainnet milestones.
- `1.0.0` is reserved for the controlled Make Waves Mainnet release.
