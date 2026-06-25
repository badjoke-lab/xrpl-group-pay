# Changelog

Meaningful user-facing, security, compatibility, persistence, and operational changes are recorded here. Planned work belongs in `ROADMAP.md`.

## [Unreleased]

### Added

- Introduced fixed-precision `MoneyAmount` primitives and an immutable Asset Registry foundation with separate XRP Testnet and Mainnet descriptors.
- Added official network-specific RLUSD Asset descriptors and issued-Payment transaction construction.
- Added wallet-neutral Payment Intent contracts and a Xaman adapter that supports native XRP and official RLUSD on Testnet.
- Added strict validated-ledger verification for XRP and issued RLUSD Payments.
- Added generic Asset-aware verified-payment records and issued-asset PaymentSlot settlement.
- Added XRP or official RLUSD selection to Bill creation with one frozen Settlement Asset across every participant slot.
- Added Asset-aware review, participant payment details, sharing, and Bill progress views.
- Added durable provider-request lifecycle records with one active request allowed per PaymentSlot.

### Changed

- Bill totals, creator shares, and participant obligations now use canonical fixed-precision Asset units while retaining bounded legacy XRP compatibility fields.
- Existing slot-bound Xaman requests are derived from frozen Payment Intents and Asset identity.
- Payment request creation records provider ID, provider request ID, Payment Intent identity and revision, status, expiry, and submitted transaction identity when available.
- Bill progress and verification responses normalize legacy XRP shapes into the shared Asset-aware contracts.
- Defined Equal, Percentage, Shares, and Custom Amount allocation contracts.
- Defined English, Japanese, and Korean localization requirements.
- Added public Roadmap and Changelog governance.

### Security

- Official RLUSD currency and network-specific issuer identity are frozen and verified without floating-point arithmetic.
- A Bill cannot mix Settlement Assets across participant PaymentSlots.
- Issued-asset delivered values, destination, sender, tags, InvoiceID, network, result, and unsupported path fields are verified before settlement.

Runtime availability now includes XRP and official RLUSD Bills on XRPL Testnet through Xaman. Mainnet, additional wallets, allocation strategies beyond Custom Amount, and additional interface languages remain planned until separately merged and tested.

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
