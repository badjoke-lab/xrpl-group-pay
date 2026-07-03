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
- PR #150 wallet-input safety:
  - Classic Address checksum validation;
  - explicit X-address review;
  - network and Destination Tag conflict blocking;
  - recipient versus Xaman payer compatibility guidance;
  - clipboard assistance with direct-entry fallback.

## In Progress

No payment-lifecycle revision work remains in progress. The PR #132–#149 revision is merged, tested, audited, and recorded in [`docs/payment-lifecycle-release-audit.md`](docs/payment-lifecycle-release-audit.md).

PR #151 is implementing the browser-local saved-wallet layer:

- IndexedDB storage on the current origin only;
- labels, canonical addresses, optional recipient tags, roles, network, favorites, and use timestamps;
- role- and network-aware selection from recipient and payer fields;
- search, recent use, favorites, edit, delete, and delete-all;
- explicit per-field and post-creation save actions;
- reviewable JSON export and validated import;
- no API, D1, analytics, Capability, Bill, PaymentSlot, transaction, receipt, or proof persistence;
- safe direct-entry fallback when local storage is unavailable.

PR #152 remains the final integrated privacy, accessibility, localization, responsive, Mainnet-safe, and payment-regression audit. The implementation order and deferred features are fixed in [`docs/wallet-input-pre-submission-schedule.md`](docs/wallet-input-pre-submission-schedule.md).

## Release blockers

No open payment-lifecycle or Mainnet settlement blocker remains. The reviewed halted configuration remains available as the fail-closed production rollback baseline.

The wallet-input phase is a submission-readiness improvement rather than a custody, verification, or settlement unblocker. It must complete before the final submission package is frozen.

## Make Waves v1 completion

After PR #150–#152:

- confirm registration, project approval, and assigned Source Tag status;
- produce the Source Tag metrics summary for distinct successful signers, transaction count, XRP volume, and RLUSD volume;
- collect controlled real-user usage and evidence;
- capture XRP and RLUSD demonstrations;
- prepare the submission video and pitch deck;
- assemble final submission text and evidence links.

## Next

- Camera-based QR scanning for Bill-creation address entry.
- Xaman Sign-In or account discovery for filling the user's own address.
- Participant self-registration before Bill freeze.
- Additional tested XRPL Wallet Providers.
- JPY, USD, KRW, and EUR Accounting Currencies.
- Versioned Settlement Quotes.
- Participant choice between approved XRP and RLUSD settlement where allowed.
- Disclosed manual quote adjustment and re-confirmation.

## Later

- Cloud-synchronized contacts with a separately approved account and privacy model.
- Persistent Groups and recurring expenses.
- Settlement Circles with periods, net balances, and reduced settlement routes.
- Event Collection.
- Curated additional XRPL assets.

## Research

- Additional Payment Rails such as EVM.
- Item-level allocation, partial obligation settlement, and refund-assistance request preparation.

Additional wallets, assets, or rails are not compatibility claims until their implementation and tests are complete. Group Pay does not become a custody, swap, bridge, or exchange service.