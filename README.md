# XRPL Group Pay

XRPL Group Pay is a non-custodial shared-expense settlement application built first on the XRP Ledger.

A creator prepares a Bill, allocates participant obligations, shares individual capability links, and receives direct payments from participant-controlled wallets. A PaymentSlot is marked paid only after independent verification on a validated ledger.

## Current implementation

The merged application currently provides:

- one-time XRP or official RLUSD Bills on the configured XRPL network;
- one frozen Settlement Asset per Bill and all of its participant slots;
- Custom Amount, Equal, Percentage, and Shares allocation;
- explicit deterministic remainder assignment;
- creator share and participant amounts in fixed-precision Asset units;
- expected payer XRPL addresses;
- separate participant capabilities;
- creator review before Bill freeze;
- participant final confirmation;
- Xaman handoff for native XRP and issued RLUSD Payments;
- one-shot Xaman transaction binding to the expected payer, one XRPL Sequence, and a bounded ledger window;
- validated-ledger reconciliation before replacing a previous Wallet Handoff;
- Source Tag and unique InvoiceID correlation;
- strict validated-ledger XRP and issued-asset verification;
- durable Asset-aware D1 payment records;
- atomic Bill progress updates;
- public XRP transaction proof;
- responsive payer and creator views;
- deployment-aware Bill creation UI;
- English, Japanese, and Korean critical creator, payer, progress, and proof flows;
- public Roadmap and Changelog pages.

| Area | Available in merged code |
|---|---|
| Network | XRPL Testnet and public XRPL Mainnet |
| Settlement Asset | XRP or official network-specific RLUSD; one Asset per Bill |
| Wallet Provider | Xaman |
| Allocation | Creator share plus Custom Amount, Equal, Percentage, or Shares |
| Interface language | English, Japanese, and Korean critical flows |
| Custody | None; payer sends directly to creator |

The production Mainnet Worker is publicly available at `https://xgp.badjoke-lab.com`. The reviewed deployment enables Bill creation and payment verification on Mainnet. The committed `internal + halted` configuration remains the fail-closed rollback baseline and is not a description of the currently deployed public runtime.

## Remaining Make Waves v1 work

The product runtime, Mainnet acceptance, final release audit, and reviewed public operating deployment are complete.

Remaining submission work is limited to:

- final pitch video capture;
- final pitch deck export;
- Source Tag metrics for the approved measurement range;
- final submission-form assembly and evidence links.

## Product direction

Later work includes more tested XRPL Wallet Providers, fiat-denominated Bills, participant asset choice, Settlement Quotes, Persistent Groups, Settlement Circles, Event Collection, curated additional XRPL assets, and research into additional Payment Rails.

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

Funds move directly from payer to the Bill destination after wallet approval.

## Verification

A wallet status or transaction identifier is not payment proof. The server checks network, successful validated result, sender, destination, tags, InvoiceID, asset identity, requested amount, delivered amount, unsupported path fields, duplicate use, and PaymentSlot state.

## Documentation

Start with [docs/README.md](docs/README.md).

- [Product specification](docs/product-spec.md)
- [Architecture](docs/architecture.md)
- [Payment contracts](docs/payment-contracts.md)
- [Money and allocation](docs/money-and-allocation.md)
- [Localization](docs/localization.md)
- [Non-custodial boundary](docs/non-custodial-boundary.md)
- [Threat model](docs/threat-model.md)
- [Make Waves requirements](docs/make-waves-requirements.md)
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
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:worker
```

## Environment and deployment

Testnet and Mainnet use separate configuration, databases, XRPL endpoints, Source Tag values, and Asset Registry entries. Testnet Bills are not copied automatically to Mainnet.

The public Mainnet Worker is deployed at `https://xgp.badjoke-lab.com` with the isolated Mainnet D1 binding. The public runtime is `public + enabled`; the committed production configuration remains `internal + halted` so the reviewed halted target can be restored without editing the repository during an incident.

## License

Apache License 2.0. See [LICENSE](LICENSE).
