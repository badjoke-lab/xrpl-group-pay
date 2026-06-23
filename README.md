# XRPL Group Pay

XRPL Group Pay is a non-custodial shared-expense settlement application built on the XRP Ledger.

A bill creator allocates an XRP amount to each participant. Participants review and sign their own XRP Payments in Xaman, funds move directly to the recipient, and the application verifies each result on the XRP Ledger before marking it paid.

> The application foundation, Xaman Testnet payment handoff, strict validated-ledger verification, and durable verified-Payment receipts are implemented. Bill and participant-slot persistence are the next product-state gates before a bill-level payment can be marked paid.

## Core principles

- XRP only in the initial release.
- User-approved Xaman signing.
- Direct payer-to-recipient transfers.
- No operator custody.
- No private keys or seeds.
- No application balance.
- No fiat or token conversion.
- No paid state before validated-ledger verification.
- No personal expense details in XRPL Memos.

## Application foundation

- Next.js 16 and TypeScript strict mode.
- Tailwind CSS design tokens.
- Storybook with the recommended Next.js Vite framework.
- Vitest and Testing Library.
- Playwright desktop and mobile smoke tests.
- Cloudflare Workers through the OpenNext adapter.
- Cloudflare D1 migrations for durable payment receipts.
- Environment validation with an explicit Mainnet build gate.
- GitHub Actions checks for migrations, lint, types, tests, Storybook, Next.js, Worker output, and browser smoke tests.

## Testnet payment handoff

The `/testnet/payment` vertical slice currently:

- validates a classic XRPL destination and XRP amount;
- converts XRP to drops with the official `xrpl` library;
- adds the configured UInt32 `SourceTag` and a random 256-bit `InvoiceID`;
- creates a Xaman Payment Sign Request from the server only;
- forces the request to XRPL Testnet;
- provides Xaman deep-link and QR handoff;
- uses Xaman WebSocket resolution events, browser focus, and a manual status check instead of API polling;
- records signed, rejected, expired, submitted, verification-pending, verification-failed, and ledger-verified states.

## Validated-ledger verification

The browser sends only the Xaman payload UUID to the verification endpoint. The server re-fetches the Xaman payload and uses its original transaction template, signer account, and transaction ID as the expected values.

The verifier then queries two XRPL Testnet JSON-RPC endpoints and requires:

- a validated transaction;
- `tesSUCCESS`;
- `TransactionType = Payment`;
- the expected signer and destination;
- native XRP only;
- the expected transaction amount and actual `delivered_amount`;
- the configured Source Tag;
- exact Destination Tag presence and value;
- the expected InvoiceID;
- no Partial Payment flag;
- no cross-currency fields;
- a transaction hash matching Xaman's result.

## Durable payment receipts

A successful verification response is returned only after the normalized proof is stored in D1.

The receipt layer:

- uses `network + transaction_id` as the durable transaction uniqueness boundary;
- uses `network + invoice_id` to prevent a payment slot identifier from being reused by another transaction;
- treats repeated observations of the same immutable ledger facts as idempotent success;
- rejects different verified facts for an already-recorded transaction;
- preserves the first receipt timestamp;
- returns a retryable error when storage is unavailable.

A stored receipt proves that the current transaction was verified and durably deduplicated. It does not yet atomically mark a bill or participant slot as paid.

## Local development

Requirements:

- Node.js 20.19 or later. The repository pins Node.js 22.16.0 for development and CI.
- pnpm 10.15.1.

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm db:migrate:local
pnpm dev
```

Open `http://localhost:3000`.

The application builds without Xaman credentials. Creating or verifying a Testnet Sign Request fails closed until these server-side values are configured:

```text
XAMAN_API_KEY=<developer-console-api-key>
XAMAN_API_SECRET=<developer-console-api-secret>
XRPL_SOURCE_TAG=<uint32-testnet-source-tag>
```

Never expose `XAMAN_API_SECRET` through a `NEXT_PUBLIC_` variable or client-side code.

## Quality commands

```bash
pnpm check:env
pnpm db:migrate:local
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm build-storybook
pnpm build:worker
```

## Cloudflare runtime preview

Next.js development runs in Node.js. Before deployment, verify the application in the Workers runtime:

```bash
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm preview
```

The checked-in D1 configuration uses an all-zero placeholder database ID for local development. Create the remote database and replace that placeholder before deployment. See [`docs/d1-provisioning.md`](docs/d1-provisioning.md).

No deployment command or remote migration runs automatically in CI.

## Environment safety

The default network is Testnet. `APP_NETWORK` and `NEXT_PUBLIC_APP_NETWORK` must match.

A Mainnet build fails unless all three values are explicit:

```text
APP_NETWORK=mainnet
NEXT_PUBLIC_APP_NETWORK=mainnet
ALLOW_MAINNET_BUILD=true
```

This guard does not replace the Mainnet release checklist defined in the product documentation.

## Product documentation

The `docs/` directory defines:

- Product specification.
- Non-custodial boundary.
- Threat model.
- Make Waves requirements.
- Privacy data map.
- UI/UX and design tokens.
- Responsive, motion, and accessibility behavior.
- Screen inventory and state machines.
- Persistence scope and D1 provisioning.
- Open technical decisions.

## Planned product phases

1. Group Pay Core.
2. Reliable Group Payments.
3. Persistent Groups.
4. Settlement Circles.
5. Event Collection.

Later phases are product directions and are not included in the initial release.

## Security

Do not submit private keys or seeds to this application.

A transaction hash is not accepted as payment proof by itself. Receipt-level duplicate prevention is enforced in D1, while bill-level atomic payment state remains a later persistence boundary.

## License

Apache License 2.0. See [LICENSE](LICENSE).
