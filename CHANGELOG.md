# Changelog

Meaningful user-facing, security, compatibility, persistence, and operational changes are recorded here. Planned work belongs in `ROADMAP.md`.

## [Unreleased]

### Added

- Added official network-specific RLUSD Asset descriptors and issued-Payment construction.
- Added wallet-neutral Payment Intent contracts and a Xaman adapter for native XRP and official RLUSD.
- Added strict validated-ledger verification for XRP and issued RLUSD Payments.
- Added generic Asset-aware verified-payment records and issued-asset PaymentSlot settlement.
- Added XRP or official RLUSD selection with one frozen Settlement Asset across every participant slot.
- Added fixed-precision Custom Amount, Equal, Percentage, and Shares allocation.
- Added explicit deterministic remainder assignment and immutable allocation records.
- Added durable provider-request lifecycle records with one active request allowed per PaymentSlot.
- Added controlled Mainnet XRP acceptance evidence.
- Added a deployment-aware Bill creation route and public Roadmap and Changelog application pages.

### Changed

- Bill totals, creator shares, and participant obligations use canonical fixed-precision Asset units while retaining bounded legacy XRP compatibility fields.
- Existing slot-bound Xaman requests are derived from frozen Payment Intents and canonical Asset identity.
- Payment request creation records provider ID, provider request ID, Payment Intent identity and revision, status, expiry, and submitted transaction identity when available.
- Bill progress and verification responses normalize legacy XRP shapes into the shared Asset-aware contracts.
- Bill creation UI now selects Testnet or Mainnet XRP and RLUSD descriptors from the deployment network instead of hard-coding Testnet Assets.
- Public product copy and release status now distinguish merged Mainnet capability from the still-halted production release.

### Security

- Official RLUSD currency and network-specific issuer identity are frozen and verified without floating-point arithmetic.
- A Bill cannot mix Settlement Assets across participant PaymentSlots.
- Issued-asset delivered values, destination, sender, tags, InvoiceID, network, result, and unsupported path fields are verified before settlement.
- Xaman Payment requests now pin the expected payer `Account`, one validated XRPL `Sequence`, and a bounded `LastLedgerSequence` so a reused handoff cannot produce two validated Payments.
- The controlled Mainnet RLUSD duplicate-transfer incident is documented as a release blocker without exposing private operator material.

Runtime availability includes XRP and official RLUSD Bills, all four allocation strategies, participant capabilities, Xaman handoffs, and validated-ledger settlement in merged code. The production Mainnet Worker remains halted pending replacement-handoff reconciliation, a fresh RLUSD ceremony, and final release approval. Japanese and Korean critical flows remain planned until separately merged and tested.

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
