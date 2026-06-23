# XRPL Group Pay — D1 Provisioning

## Purpose

The `PAYMENTS_DB` binding stores only server-verified XRP Payment receipts. It does not store seeds, private keys, raw signed blobs, participant capabilities, or bill titles.

## Local database

The repository uses an all-zero D1 identifier so local migrations and Worker builds can run without a production database.

```bash
pnpm db:migrate:local
pnpm preview
```

The all-zero identifier is intentionally not deployable.

## Create the Testnet database

```bash
pnpm exec wrangler d1 create xrpl-group-pay-testnet
```

Copy the returned database ID into `wrangler.jsonc` for both `database_id` and `preview_database_id`, replacing the all-zero placeholder.

Apply migrations by immutable database name:

```bash
pnpm exec wrangler d1 migrations apply xrpl-group-pay-testnet --remote
```

No remote migration or deployment runs in CI.

## Release checks

Before a public preview:

1. Confirm the binding name is `PAYMENTS_DB`.
2. Confirm the real database ID replaced the placeholder.
3. Apply all migrations remotely.
4. Execute one credentialed Testnet Payment.
5. Confirm the first verification returns a created receipt.
6. Confirm an exact retry returns the existing receipt.
7. Confirm another transaction cannot reuse the same InvoiceID.
8. Confirm application logs contain no Xaman credentials or capability tokens.

## Scope boundary

This database currently contains verified Payment receipts only. Bills, participant slots, capability hashes, Xaman payload lifecycle records, retention jobs, and bill-level paid transitions are separate later migrations.
