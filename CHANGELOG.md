# Changelog

Meaningful user-facing, security, compatibility, persistence, and operational changes are recorded here. Planned work belongs in `ROADMAP.md`.

## [Unreleased]

### Added

- Introduced fixed-precision `MoneyAmount` primitives and an immutable Asset Registry foundation with separate XRP Testnet and Mainnet descriptors.

### Changed

- Approved the Make Waves v1 target for XRP and official RLUSD on XRPL.
- Defined Payment Intent, Wallet Provider, Asset Registry, verification, and versioned receipt boundaries.
- Defined Equal, Percentage, Shares, and Custom Amount allocation contracts.
- Defined English, Japanese, and Korean localization requirements.
- Added public Roadmap and Changelog governance.

The new domain primitives do not change the currently available XRP Testnet runtime flow. Runtime availability remains the current XRP Testnet implementation until corresponding feature PRs are merged and tested.

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
