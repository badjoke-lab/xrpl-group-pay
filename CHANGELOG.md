# Changelog

Meaningful user-facing, security, compatibility, persistence, and operational changes are recorded here. Planned work belongs in `ROADMAP.md`.

## [Unreleased]

### Added

- Added two explicit Bill modes and separate Bill-operator, recipient, and payer roles.
- Added XRP and official RLUSD Bills with fixed-precision allocation, readiness checks, Xaman handoff, validated-ledger verification, durable receipts, recovery, progress, review, closure, and copy-to-revise.
- Added the searchable English, Japanese, and Korean Guide and contextual help.
- Added controlled Mainnet XRP and official RLUSD acceptance evidence and the machine-readable payment-lifecycle release audit.
- Added Classic Address checksum validation and explicit X-address review with network and Destination Tag safeguards.
- Added user-triggered clipboard assistance with direct-entry fallback.
- Added recipient-versus-payer wallet guidance and exchange/manual-transfer warnings.
- Added a versioned browser-local IndexedDB saved-wallet repository.
- Added explicit per-field and post-Bill save actions.
- Added role- and network-aware saved-wallet selection with search, favorites, and recent use.
- Added saved-wallet edit, delete, delete-all, JSON export, and schema-validated import.
- Added English, Japanese, and Korean saved-wallet and local-storage guidance.
- Added the machine-readable wallet-input release audit and CI, build, and Mainnet-deploy enforcement.

### Changed

- Bill review requires canonical Classic Addresses; X-addresses must be reviewed and converted before the Bill can continue.
- Compatible recipients do not need Xaman merely to receive, while payer Payment and TrustSet handoff remains Xaman-only for this release.
- Selecting a saved wallet fills only role-appropriate fields and reuses the normal validation, readiness, review, freeze, wallet-handoff, and verification path.
- Reusing the same network and address can combine recipient and payer use in one local record.
- Wallet-input feature work is frozen for the Make Waves submission after the integrated PR #152 audit.

### Security

- Wallet status, saved-wallet entries, labels, and transaction identifiers are never accepted as payment proof.
- Wrong-network X-addresses, payer tags, and conflicting recipient Destination Tags are blocked before Bill review.
- Clipboard access starts only after user action and failure does not disable ordinary address entry.
- Exchange withdrawals and ordinary manual transfers are not presented as supported PaymentSlot settlement paths.
- Saved-wallet records stay in the current browser origin and are not sent to the Group Pay API, D1, analytics, or cross-device synchronization.
- Saved-wallet schemas and exports exclude Bills, PaymentSlots, capabilities, InvoiceIDs, provider requests, transactions, receipts, proofs, balances, readiness results, and claimed identity.
- IndexedDB, quota, import, or local-record failures do not block direct address entry or alter an already created Bill.
- Mainnet and Testnet saved wallets remain separately filtered and recipient Destination Tags never populate payer fields.
- Existing Mainnet, D1, Payment Intent, Xaman, validated-ledger, duplicate, replay, receipt, proof, capability, and frozen-fact controls remain unchanged.

### Release audit

- Completed the PR #132–#149 payment-lifecycle revision.
- Completed the PR #150–#152 wallet-input pre-submission phase.
- Verified recipient and payer semantics across representative/direct, XRP/official RLUSD, and Testnet/Mainnet dimensions.
- Verified Classic Address, X-address, Destination Tag, clipboard, saved-wallet, privacy, multilingual, accessibility, responsive, and direct-entry fallback controls.
- Verified payment-lifecycle, Mainnet, D1, Next.js, Storybook, Worker, browser, and production UI regression gates.
- Recorded no unresolved high- or critical-severity wallet-input, privacy, verification, accessibility, localization, responsive, Mainnet, or payment-regression finding.

Runtime feature work for the submission release is frozen. Remaining Make Waves work is limited to registration and Source Tag confirmation, metrics, controlled real-user evidence, XRP/RLUSD demonstration capture, video, deck, submission text, and evidence links.

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

- `0.x` covers Testnet and controlled pre-1.0 Mainnet milestones.
- `1.0.0` is reserved for the completed Make Waves public release package.
