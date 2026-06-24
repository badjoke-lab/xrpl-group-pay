# XRPL Group Pay

XRPL Group Pay is a non-custodial shared-expense settlement application built on the XRP Ledger.

A bill creator allocates an XRP amount to each participant. Participants open their own capability link, review and sign an exact XRP Payment in Xaman, and send funds directly to the creator. The application marks a participant slot paid only after the submitted transaction is verified on a validated XRP Ledger.

> The current application is Testnet-only. It implements frozen bills, participant payment slots, capability-bound Xaman handoff, validated-ledger verification, durable receipts, atomic bill-state updates, and capability-protected bill progress.

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
- Cloudflare D1 migrations for bills, payment slots, and verified receipts.
- Environment validation with an explicit Mainnet build gate.
- GitHub Actions checks for migrations, D1 constraints, lint, types, tests, Storybook, Next.js, Worker output, and browser smoke tests.

## Shared bill flow

The `/testnet/bill` creator flow:

- validates a classic XRPL destination and optional UInt32 Destination Tag;
- converts XRP values to drops with the official `xrpl` library;
- requires the creator share and all participant allocations to equal the total;
- creates one frozen Bill and all PaymentSlots in a single D1 batch;
- creates independent 256-bit capability tokens and stores only their SHA-256 hashes;
- assigns a unique opaque InvoiceID to every participant slot;
- returns each raw capability once so the creator can share a separate participant link;
- exposes separate creator-progress and read-only-progress capabilities.

Capabilities are placed in URL fragments. The initial page request therefore does not include them in its path or query string. Each link must still be treated as a private invitation.

## Participant payment handoff

The `/testnet/payment#token=...` participant flow:

- resolves only the PaymentSlot matching the capability hash;
- loads the frozen bill title, destination, expected payer, amount, Destination Tag, and InvoiceID from D1;
- does not allow those transaction conditions to be edited in the browser;
- creates the Xaman Payment Sign Request on the server;
- adds the configured UInt32 Source Tag;
- forces the request to XRPL Testnet;
- provides Xaman deep-link and QR handoff;
- uses Xaman WebSocket resolution events, browser focus, and a manual status check instead of API polling;
- records signed, rejected, expired, submitted, verification-pending, verification-failed, and ledger-verified states.

## Validated-ledger verification

The browser sends the payment capability and Xaman payload UUID to the verification endpoint. The server re-resolves the stored PaymentSlot, re-fetches the Xaman payload, and rejects a template that differs from the frozen slot before querying the ledger.

The verifier then queries XRPL Testnet JSON-RPC endpoints and requires:

- a validated transaction;
- `tesSUCCESS`;
- `TransactionType = Payment`;
- the expected signer and destination;
- native XRP only;
- the exact stored amount and actual `delivered_amount`;
- the configured Source Tag;
- exact Destination Tag presence and value;
- the stored InvoiceID;
- no Partial Payment flag;
- no cross-currency fields;
- a transaction hash matching Xaman's result.

## Atomic settlement and durable receipts

A successful verification response is returned only after D1 atomically:

1. inserts or reuses the verified Payment receipt;
2. marks the matching PaymentSlot paid;
3. recomputes the Bill as `open`, `partially_paid`, or `settled`;
4. reads the durable result back and confirms its transaction, InvoiceID, and proof digest.

The settlement boundary:

- uses `network + transaction_id` as the durable transaction uniqueness boundary;
- uses `network + invoice_id` to prevent a slot identifier from being reused by another transaction;
- treats an exact retry as idempotent success;
- rejects a different transaction after a slot has been paid;
- prevents a receipt from being inserted when the slot is no longer eligible;
- does not overwrite a slot placed in `needs_review`;
- returns retryable errors when storage is unavailable.

## Bill progress and role separation

The `/testnet/bill/progress#token=...` flow loads the Bill and every PaymentSlot in one D1 batch through a hashed capability.

- The creator capability shows participant labels, expected payer addresses, InvoiceIDs, amounts, slot states, and verified transaction references.
- The read-only capability shows amounts, slot states, and verified public transaction references while hiding participant labels, expected payer addresses, and InvoiceIDs.
- Malformed and unknown capabilities use the same not-found response.
- Progress responses use `Cache-Control: no-store`.
- The browser never sends a capability in the page path or query string.
- A settled banner appears only when the durable Bill state is `settled`.

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

Open `http://localhost:3000` and start at `/testnet/bill`.

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
pnpm db:check:local
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

The `docs/` directory defines the product specification, non-custodial boundary, threat model, privacy data map, UI/UX behavior, screen inventory, persistence scope, D1 provisioning, and open technical decisions.

## Security

Do not submit private keys or seeds to this application.

A transaction hash is not accepted as payment proof by itself. A slot becomes paid only when the complete Xaman template and validated-ledger facts match its server-side frozen conditions and the atomic D1 settlement succeeds.

## License

Apache License 2.0. See [LICENSE](LICENSE).
