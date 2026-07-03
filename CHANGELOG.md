# Changelog

Meaningful user-facing, security, compatibility, persistence, and operational changes are recorded here. Planned work belongs in `ROADMAP.md`.

## [Unreleased]

### Added

- Added two explicit Bill modes: participants pay a representative recipient, or participants pay an external store or organizer directly.
- Added separate Bill-operator, recipient, and payer role language and persistence.
- Added official network-specific RLUSD Asset descriptors and issued-Payment construction.
- Added wallet-neutral Payment Intent contracts and a Xaman adapter for native XRP and official RLUSD.
- Added XRP and official RLUSD recipient and payer readiness checks covering account existence, reserve, fee, spendable XRP, trust line, authorization, freeze state, balance, and recipient capacity.
- Added capability-bound official RLUSD TrustSet preparation and validated-ledger confirmation.
- Added durable Xaman request lifecycle, resume, callback, polling, and provider-synchronization records.
- Added safe retry, wait-and-recheck, setup-required, review-required, already-paid, and terminal recovery classifications.
- Added shared semantic status badges and card accents using text, icons, and restrained state color.
- Added mode-aware Bill creation, review, participant instructions, and sharing.
- Added mode-correct management and read-only progress dashboards.
- Added expected-versus-observed review details and explicit repeated-payment authorization.
- Added incomplete Bill closure that preserves verified receipts and stops new unpaid handoffs.
- Added copy-to-revise using a separate browser-local draft and regenerated Bill, PaymentSlot, capability, InvoiceID, and link identities.
- Added D1 triggers that reject in-place changes to frozen Bill and PaymentSlot facts.
- Added a complete searchable Guide, FAQ, and contextual help in English, Japanese, and Korean.
- Added the machine-readable integrated lifecycle release audit and CI enforcement.
- Added controlled Mainnet XRP and official RLUSD acceptance evidence.
- Added a deployment-aware Bill creation route and public Roadmap and Changelog application pages.

### Changed

- Bill totals, recipient-funded amounts, and participant obligations use canonical fixed-precision Asset units while retaining bounded legacy XRP compatibility fields.
- Representative mode may record a recipient-funded accounting amount without creating a self-transfer; direct mode assigns the full Bill total to payer slots.
- Existing slot-bound Xaman requests are derived from frozen Payment Intents and canonical Asset identity.
- Payment requests bind the expected payer, one XRPL Sequence, and a bounded `LastLedgerSequence` to prevent repeated validated transfers from one handoff.
- Replacement wallet handoffs require validated-ledger reconciliation before creation.
- Payment request creation records provider ID, request ID, Payment Intent identity and revision, status, expiry, and submitted transaction identity when available.
- Bill progress and verification responses normalize legacy XRP shapes into shared Asset-aware contracts.
- Bill creation selects Testnet or Mainnet XRP and official RLUSD descriptors from the deployment network.
- Public and read-only progress now hide management-only payer facts, InvoiceIDs, review details, and recovery controls.
- Guide and contextual-help URLs use fixed public anchors and never copy active capability fragments or private draft data.
- Public product copy and release status now match the merged and audited payment lifecycle.

### Security

- Official RLUSD currency and network-specific issuer identity are frozen and verified without floating-point arithmetic.
- A Bill cannot mix Settlement Assets across participant PaymentSlots.
- Issued-asset delivered values, destination, sender, tags, InvoiceID, network, result, and unsupported path fields are verified before settlement.
- Xaman status, signature, payload resolution, or transaction identifier alone is never accepted as proof of payment.
- Verified receipts, PaymentSlot status, and Bill progress are written through the atomic settlement boundary.
- Duplicate transaction, InvoiceID reuse, and cross-slot replay are rejected.
- Pending, mismatched, duplicate, and multiple-candidate observations cannot be silently replaced or manually marked paid.
- Incomplete closure cannot reopen a Bill, revert paid slots, reverse transfers, or create automatic refunds.
- Copy-to-revise excludes source Bill, PaymentSlot, capability, InvoiceID, transaction, receipt, proof, and review identities.
- Mainnet remains protected by isolated configuration and D1, an assigned Source Tag, accepted XRP and RLUSD evidence, a ready release gate, and enabled, verify-only, and halted operational modes.
- Production UI auditing rejects mixed-language copy, stale Japanese wording, incorrect Mainnet Asset selection, and horizontal overflow at 320px, 390px, and 1280px.

### Release audit

- Completed the PR #132–#149 payment-lifecycle revision.
- Verified representative and direct modes across XRP and official RLUSD contracts.
- Verified readiness, TrustSet, cancellation, expiry, pending validation, failure, mismatch, duplicate protection, partial completion, review, closure, and copy-to-revise coverage.
- Verified management, read-only, payer, setup, proof, Guide, and contextual-help capability boundaries.
- Verified English, Japanese, and Korean critical coverage and server/client language consistency.
- Verified semantic status, keyboard, responsive, visual, D1, Testnet, Mainnet-safe, Next.js, Storybook, Worker, browser, and production UI gates.
- Recorded no unresolved high-severity safety, privacy, verification, accessibility, localization, visual, or Mainnet finding.

Runtime availability includes the merged and audited payment lifecycle described in `README.md` and `ROADMAP.md`. Remaining Make Waves work is limited to metrics, video, deck, submission assembly, and evidence links.

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
