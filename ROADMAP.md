# XRPL Group Pay Roadmap

**Status:** Active  
**Last reviewed:** 2026-07-01

This roadmap shows product direction, not promised dates. A capability moves to **Available** only after it is merged, tested, and usable in the intended environment.

## Available

- XRP and official RLUSD Bills with one frozen Settlement Asset.
- Custom Amount, Equal, Percentage, and Shares allocation.
- Explicit deterministic remainder assignment.
- Immutable allocation records and participant PaymentSlots.
- Xaman signing handoff for native XRP and issued RLUSD Payments.
- Validated-ledger XRP and issued-asset verification.
- Durable Asset-aware payment records and atomic Bill progress.
- Public XRP transaction proof.
- Direct payer-to-recipient settlement with capability separation.
- Controlled Mainnet XRP and official RLUSD acceptance evidence.
- One-shot Xaman transaction binding to the expected payer, one XRPL Sequence, and a bounded ledger window.
- Validated-ledger reconciliation before replacement Wallet Handoff creation.
- Duplicate settlement and cross-slot replay protection.
- Deployment-aware Bill creation UI.
- English, Japanese, and Korean critical creator and payer flows.
- Public Roadmap and Changelog pages in the application interface.
- Approved Mainnet release gate and verified public operating deployment.

## In Progress

The approved payment-lifecycle revision is scheduled in [`docs/payment-lifecycle-revision-schedule.md`](docs/payment-lifecycle-revision-schedule.md). Planned work includes:

- distinct Bill-operator, recipient, and payer roles;
- representative-payment and direct-recipient Bill modes;
- Mainnet-safe progress and durable Xaman lifecycle synchronization;
- XRP and RLUSD recipient and payer readiness checks;
- official RLUSD TrustSet preparation assistance;
- failure classification, safe retry, review, incomplete closure, and copy-to-revise behavior;
- semantic status badges and restrained state colors;
- a complete English, Japanese, and Korean Guide with contextual in-flow help;
- integrated lifecycle, accessibility, privacy, visual, Testnet, and Mainnet-safe audit.

These capabilities remain planned until their individual PRs are merged, tested, and usable in the intended environment.

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
