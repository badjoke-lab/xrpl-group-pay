# XRPL Group Pay

XRPL Group Pay is a non-custodial shared-expense settlement application built first on the XRP Ledger.

A creator prepares a Bill, allocates participant obligations, shares individual capability links, and receives direct payments from participant-controlled wallets. A PaymentSlot is marked paid only after independent verification on a validated ledger.

## Current implementation

The merged application currently provides:

- one-time XRP Bills on XRPL Testnet;
- creator share and custom participant amounts;
- expected payer XRPL addresses;
- separate participant capabilities;
- creator review before Bill freeze;
- participant final confirmation;
- Xaman Payment handoff;
- Source Tag and unique InvoiceID;
- strict validated-ledger XRP verification;
- durable D1 receipts;
- atomic Bill progress updates;
- public transaction proof;
- responsive payer and creator views.

| Area | Available now |
|---|---|
| Network | XRPL Testnet |
| Settlement Asset | XRP |
| Wallet Provider | Xaman |
| Allocation | Creator share and custom participant amounts |
| Interface language | English |
| Custody | None; payer sends directly to creator |

## Approved Make Waves v1 target

The approved target adds:

- XRP and official network-specific RLUSD on XRPL;
- one frozen Settlement Asset per Bill;
- Equal, Percentage, Shares, and Custom Amount allocation;
- explicit remainder handling;
- wallet-neutral Payment Intents;
- Xaman behind a Wallet Provider boundary;
- XRP and issued-asset verification and receipt contracts;
- RLUSD recipient readiness;
- English, Japanese, and Korean critical flows;
- controlled XRPL Mainnet release;
- public Roadmap and Changelog pages.

Target features are not claimed as available until their implementation is merged and tested.

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
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:worker
```

## Environment and deployment

Testnet and Mainnet use separate configuration, databases, XRPL endpoints, Source Tag values, and Asset Registry entries. Testnet Bills are not copied automatically to Mainnet.

## License

Apache License 2.0. See [LICENSE](LICENSE).
