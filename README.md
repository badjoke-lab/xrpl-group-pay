# XRPL Group Pay

XRPL Group Pay is a non-custodial shared-expense settlement application built on the XRP Ledger.

A bill creator allocates an XRP amount to each participant. Participants review and sign their own XRP Payments in Xaman, funds move directly to the recipient, and the application verifies each result on the XRP Ledger before marking it paid.

> This repository is in the product-foundation stage. The first implementation target is an end-to-end XRPL Testnet payment flow.

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

## Planned product phases

1. Group Pay Core.
2. Reliable Group Payments.
3. Persistent Groups.
4. Settlement Circles.
5. Event Collection.

Later phases are product directions and are not included in the initial release.

## Documentation

The first documentation PR defines:

- Product specification.
- Non-custodial boundary.
- Threat model.
- Make Waves requirements.
- Privacy data map.
- UI/UX and design system.
- Responsive and motion behavior.
- Accessibility.
- Screen inventory.
- State machines.
- Open technical decisions.

## Initial technology direction

- Next.js and TypeScript.
- Xaman Sign Requests.
- `xrpl.js`.
- Zod.
- Vitest and Playwright.
- GitHub Actions.
- Cloudflare Workers and D1 as the first deployment candidate.

The runtime and database choices remain subject to a compatibility spike.

## Security

Do not submit private keys or seeds to this application.

A transaction hash is not accepted as payment proof by itself. The application verifies the transaction type, network, result, sender, destination, tags, InvoiceID, XRP amount, delivered amount, and duplicate-processing status.

## License

Apache License 2.0. See [LICENSE](LICENSE).
