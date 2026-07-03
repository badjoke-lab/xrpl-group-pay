# XRPL Group Pay

XRPL Group Pay is a non-custodial shared-expense settlement application built first on the XRP Ledger.

A Bill operator prepares a Bill, chooses who receives the payments, allocates payer obligations, shares independent capability links, and observes direct payments from payer-controlled wallets. A PaymentSlot is marked paid only after independent verification on a validated ledger.

## Current implementation

The merged and audited application currently provides:

- two explicit payment modes:
  - **Pay a representative** for reimbursements, fees, shared purchases, and collections received by one person;
  - **Pay a store or organizer directly** when every payer sends to an external recipient;
- separate Bill-operator, recipient, and payer roles;
- one-time XRP or official network-specific RLUSD Bills on the configured XRPL network;
- one frozen Settlement Asset per Bill and all participant PaymentSlots;
- Custom Amount, Equal, Percentage, and Shares allocation;
- explicit deterministic remainder assignment;
- optional recipient-funded accounting in representative mode without a self-transfer;
- expected payer XRPL addresses and separate payer capabilities;
- mode-aware creator review before Bill freeze;
- mode- and Asset-aware participant instructions;
- participant final confirmation before wallet handoff;
- XRP and official RLUSD recipient and payer readiness checks;
- official RLUSD TrustSet preparation with validated-ledger confirmation;
- reserve-aware spendable XRP, fee, trust-line, authorization, freeze, balance, and recipient-capacity checks;
- Xaman handoff for native XRP and issued RLUSD Payments;
- durable Xaman lifecycle, resume, and status synchronization;
- one-shot Xaman transaction binding to the expected payer, one XRPL Sequence, and a bounded ledger window;
- validated-ledger reconciliation before replacing a previous Wallet Handoff;
- Source Tag and unique InvoiceID correlation;
- strict validated-ledger XRP and issued-asset verification;
- durable Asset-aware D1 payment records and atomic Bill progress updates;
- duplicate settlement and cross-slot replay protection;
- safe retry, wait-and-recheck, setup-required, review-required, already-paid, and terminal recovery;
- mode-correct management and read-only progress views;
- expected-versus-observed review facts and explicit repeated-payment warnings;
- incomplete closure that preserves verified receipts and stops new unpaid handoffs;
- copy-to-revise using a separate browser-local draft and new frozen identities;
- D1 enforcement of frozen Bill and PaymentSlot facts;
- public transaction proof;
- shared semantic status badges with text and icons;
- a searchable Guide and contextual help in English, Japanese, and Korean;
- responsive payer, operator, progress, proof, Guide, and help experiences;
- deployment-aware Bill creation UI;
- public Roadmap and Changelog pages.

| Area | Available in merged code |
|---|---|
| Network | XRPL Testnet and reviewed XRPL Mainnet |
| Settlement Asset | XRP or official network-specific RLUSD; one Asset per Bill |
| Payment mode | Representative recipient or external direct recipient |
| Wallet Provider | Xaman |
| Allocation | Recipient-funded accounting plus Custom Amount, Equal, Percentage, or Shares |
| Recovery | Safe retry, recheck, setup, review, incomplete closure, and copy-to-revise |
| Interface language | English, Japanese, and Korean critical flows, Guide, and help |
| Custody | None; each payer sends directly to the frozen recipient |

The PR #132–#149 payment-lifecycle revision passed its integrated lifecycle, multilingual, accessibility, visual, privacy, Testnet, and Mainnet-safe audit. The machine-readable audit is `config/payment-lifecycle-release-audit.json`.

The production Mainnet Worker is publicly available at `https://xgp.badjoke-lab.com`. The reviewed deployment exposes Mainnet Bill creation and uses the accepted Mainnet payment and verification controls. The committed `internal + halted` configuration remains the fail-closed rollback baseline and is not a description of the currently displayed public creation UI.

## Remaining Make Waves v1 work

No payment-lifecycle runtime work remains in progress for the approved revision.

Remaining submission work is limited to:

- final pitch video capture;
- final pitch deck export;
- Source Tag metrics for the approved measurement range;
- final submission-form assembly and evidence links.

## Product direction

The completed payment-lifecycle revision is defined by the [payment lifecycle contract](docs/payment-lifecycle-contract.md), recorded in the [integrated release audit](docs/payment-lifecycle-release-audit.md), and preserved in the [PR #132–#149 implementation schedule](docs/payment-lifecycle-revision-schedule.md).

Later work includes more tested XRPL Wallet Providers, fiat-denominated Bills, participant Asset choice, Settlement Quotes, Persistent Groups, Settlement Circles, Event Collection, curated additional XRPL assets, and research into additional Payment Rails.

See [ROADMAP.md](ROADMAP.md) for public status and direction.

## Architecture

```text
Application and UI
  -> Group Pay Core
  -> Payment Domain
  -> wallet, transaction, verification, receipt, and rail adapters
  -> XRPL and infrastructure services
```

The architecture separates Accounting Currency, obligation amount, Settlement Asset, Settlement Amount, Payment Intent, Wallet Provider, Verification Strategy, Receipt Contract, Allocation Strategy, and localization.

## Non-custodial boundary

XRPL Group Pay does not receive or pool settlement funds, maintain an application balance, approve transactions for users, swap or bridge assets, operate fiat entry or exit services, or guarantee collection and refunds.

Funds move directly from each payer to the frozen Bill destination after wallet approval.

## Verification

A wallet status or transaction identifier is not payment proof. The server checks network, successful validated result, sender, destination, tags, InvoiceID, Asset identity, requested amount, delivered amount, unsupported path fields, duplicate use, and PaymentSlot state.

Replacement handoffs remain blocked until validated-ledger reconciliation shows that another attempt is safe or management explicitly accepts the documented repeated-payment risk where policy permits.

## Documentation

Start with [docs/README.md](docs/README.md).

- [Product specification](docs/product-spec.md)
- [Payment lifecycle contract](docs/payment-lifecycle-contract.md)
- [Integrated payment lifecycle release audit](docs/payment-lifecycle-release-audit.md)
- [Architecture](docs/architecture.md)
- [Payment contracts](docs/payment-contracts.md)
- [Money and allocation](docs/money-and-allocation.md)
- [Localization](docs/localization.md)
- [Payment lifecycle localization](docs/payment-lifecycle-localization.md)
- [Guide and contextual help](docs/guide-and-contextual-help.md)
- [Non-custodial boundary](docs/non-custodial-boundary.md)
- [Threat model](docs/threat-model.md)
- [Payment lifecycle security](docs/payment-lifecycle-security.md)
- [Make Waves requirements](docs/make-waves-requirements.md)
- [Payment lifecycle revision schedule](docs/payment-lifecycle-revision-schedule.md)
- [Mainnet operational controls](docs/mainnet-operational-controls.md)
- [Mainnet acceptance audit](docs/mainnet-acceptance-audit.md)
- [Mainnet release evidence](docs/mainnet-release-evidence.md)
- [Public Roadmap](ROADMAP.md)
- [Changelog](CHANGELOG.md)

## Local development

Requirements:

- Node.js 20.19 or later;
- pnpm 10.15.1;
- local Cloudflare D1 support through Wrangler.

```bash
pnpm install
pnpm validate
pnpm test:e2e
```

Useful commands:

```bash
pnpm dev
pnpm db:migrate:local
pnpm db:check:local
pnpm check:mainnet-evidence
pnpm check:mainnet-acceptance
pnpm check:lifecycle-audit
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:worker
node scripts/capture-production-bill-ui.mjs
```

## Environment and deployment

Testnet and Mainnet use separate configuration, databases, XRPL endpoints, Source Tag values, and Asset Registry entries. Testnet Bills are not copied automatically to Mainnet.

The public Mainnet Worker is deployed at `https://xgp.badjoke-lab.com` with the isolated Mainnet D1 binding. Mainnet operation remains subject to the release gate and enabled, verify-only, and halted modes. The committed production configuration remains `internal + halted` so the reviewed fail-closed target can be restored during an incident.

## License

Apache License 2.0. See [LICENSE](LICENSE).
