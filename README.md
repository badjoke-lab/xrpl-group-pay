# XRPL Group Pay

XRPL Group Pay is a non-custodial shared-expense settlement application built on the XRP Ledger.

A bill creator allocates an XRP amount to each participant. Participants review and sign their own XRP Payments in Xaman, funds move directly to the recipient, and the application verifies each result on the XRP Ledger before marking it paid.

> The executable foundation is now in place. XRPL and Xaman transaction functionality is introduced in the next vertical-slice implementation.

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
- Environment validation with an explicit Mainnet build gate.
- GitHub Actions checks for lint, types, tests, Storybook, Next.js, and Worker output.

## Local development

Requirements:

- Node.js 20.9 or later. The repository pins Node.js 22.16.0 for development and CI.
- pnpm 10.15.1.

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

## Quality commands

```bash
pnpm check:env
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
pnpm preview
```

No deployment command is run automatically by CI.

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

A transaction hash is not accepted as payment proof by itself. The application verifies the transaction type, network, result, sender, destination, tags, InvoiceID, XRP amount, delivered amount, and duplicate-processing status.

## License

Apache License 2.0. See [LICENSE](LICENSE).
