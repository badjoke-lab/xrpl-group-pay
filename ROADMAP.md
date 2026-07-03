# XRPL Group Pay Roadmap

**Status:** Active  
**Last reviewed:** 2026-07-03

This roadmap shows product direction, not promised dates. A capability moves to **Available** only after it is merged, tested, and usable in the intended environment.

## Available

- Two explicit payment modes:
  - participants pay a representative recipient;
  - participants pay a store, organizer, or other external recipient directly.
- Separate Bill-operator, recipient, and payer roles.
- XRP and official network-specific RLUSD Bills with one frozen Settlement Asset.
- Custom Amount, Equal, Percentage, and Shares allocation.
- Explicit deterministic remainder assignment.
- Optional recipient-funded accounting without a self-transfer in representative mode.
- Immutable allocation records and independent participant PaymentSlots.
- Capability-separated management, read-only progress, payer, RLUSD setup, and public-proof surfaces.
- Xaman signing handoff for native XRP and issued RLUSD Payments.
- Durable Xaman lifecycle, resume, and provider synchronization.
- One-shot Xaman transaction binding to the expected payer, one XRPL Sequence, and a bounded ledger window.
- Validated-ledger XRP and issued-asset verification.
- Validated-ledger reconciliation before replacement Wallet Handoff creation.
- Durable Asset-aware payment records and atomic Bill progress.
- Duplicate settlement and cross-slot replay protection.
- XRP and RLUSD payer and recipient readiness checks.
- Official RLUSD TrustSet preparation assistance.
- Safe retry, wait-and-recheck, setup-required, review-required, already-paid, and terminal recovery.
- Mode-correct operator and read-only progress dashboards.
- Expected-versus-observed review and explicit repeated-payment authorization.
- Incomplete closure that preserves verified receipts and stops new unpaid handoffs.
- Copy-to-revise with new Bill, PaymentSlot, capability, InvoiceID, and link identities.
- D1 enforcement of frozen Bill and PaymentSlot facts.
- Shared semantic statuses using text, icons, and restrained state color.
- Searchable English, Japanese, and Korean Guide and contextual help.
- Public XRP transaction proof.
- Controlled Mainnet XRP and official RLUSD acceptance evidence.
- Assigned Mainnet Source Tag, isolated Mainnet D1, operational kill switch, and approved release gate.
- Deployment-aware public Mainnet Bill creation UI.
- Automated 320px, 390px, and 1280px production UI audits.
- Public Roadmap and Changelog pages in the application interface.
- Completed PR #132–#149 integrated payment-lifecycle release audit.

## In Progress

No payment-lifecycle revision work remains in progress. The PR #132–#149 revision is merged, tested, audited, and recorded in [`docs/payment-lifecycle-release-audit.md`](docs/payment-lifecycle-release-audit.md).

## Release blockers

No open v1 runtime release blockers remain. The reviewed halted configuration remains available as the fail-closed production rollback baseline.

## Make Waves v1 completion

- Source Tag metrics summary for distinct successful signers, transaction count, XRP volume, and RLUSD volume.
- Submission video and pitch deck.
- Final submission-form assembly and evidence links.

## Next

- Additional tested XRPL Wallet Providers.
- JPY, USD, KRW, and EUR Accounting Currencies.
- Versioned Settlement Quotes.
- Participant choice between approved XRP and RLUSD settlement where allowed.
- Disclosed manual quote adjustment and re-confirmation.

## Later

- Persistent Groups and recurring expenses.
- Settlement Circles with periods, net balances, and reduced settlement routes.
- Event Collection.
- Curated additional XRPL assets.

## Research

- Additional Payment Rails such as EVM.
- Item-level allocation, partial obligation settlement, and refund-assistance request preparation.

Additional wallets, assets, or rails are not compatibility claims until their implementation and tests are complete. Group Pay does not become a custody, swap, bridge, or exchange service.
