# XRPL Group Pay — D1 Provisioning

**Status:** Active  
**Scope:** Local, Testnet, and Mainnet D1 provisioning and migration controls  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Purpose

The `PAYMENTS_DB` binding stores Bills, PaymentSlots, capability hashes, verified receipts, accepted transaction references, progress state, and public proof lookup data.

It does not store wallet signing material or raw signed transaction data by default.

## 2. Local database

The repository uses a non-deployable placeholder D1 identifier so local migrations and Worker builds can run without a production database.

```bash
pnpm db:migrate:local
pnpm db:check:local
pnpm preview
```

## 3. Testnet database

```bash
pnpm exec wrangler d1 create xrpl-group-pay-testnet
pnpm exec wrangler d1 migrations apply xrpl-group-pay-testnet --remote
```

Replace the local placeholder only in the approved Testnet configuration. CI does not apply remote migrations.

## 4. Mainnet database

Mainnet uses a separate immutable database name, identifier, environment configuration, and migration procedure.

```bash
pnpm exec wrangler d1 create xrpl-group-pay-mainnet
pnpm exec wrangler d1 migrations apply xrpl-group-pay-mainnet --remote
```

Testnet data is not copied automatically to Mainnet.

## 5. Forward migration policy

- migrations are versioned and append-only after release;
- schema changes move forward rather than editing applied migration files;
- migrations preserve readable XRP records;
- existing XRP proof digests remain unchanged;
- issued-asset receipt fields are added through a new migration;
- network, asset, issuer, and Receipt Contract constraints are checked;
- a migration is tested from both an empty database and the current production-shaped schema.

## 6. Asset-aware migration gate

Before applying the XRP/RLUSD migration remotely:

1. validate XRP legacy fixtures;
2. validate official Testnet and Mainnet RLUSD Asset Registry values;
3. verify issuer presence for issued assets and absence for native XRP;
4. verify canonical obligation and settlement units;
5. verify Receipt Contract assignment;
6. verify transaction and InvoiceID uniqueness;
7. verify a failed migration does not deploy application code expecting the new schema.

## 7. Testnet release checks

1. Confirm the binding targets the Testnet database.
2. Apply all migrations remotely.
3. Create and settle one XRP Testnet Bill.
4. Confirm exact re-verification returns the existing XRP receipt.
5. After RLUSD implementation, create and settle one official RLUSD Testnet Bill.
6. Confirm wrong issuer and wrong network are rejected.
7. Confirm logs and public pages do not expose complete private shared links.

## 8. Mainnet release checks

1. Confirm the binding targets only the Mainnet database.
2. Confirm Mainnet XRPL endpoints and Asset Registry values.
3. Apply migrations under the production checklist.
4. Run controlled small-value XRP settlement and proof.
5. Run controlled small-value RLUSD settlement and proof.
6. Verify asset-specific limits and Source Tag.
7. Verify emergency disable behavior does not alter stored receipts.

## 9. Recovery

Application deployment may be disabled or rolled back independently of immutable migration history. A corrective migration is preferred over rewriting an applied migration.

Durable receipts and accepted ledger facts are not deleted merely to make a failed deployment appear successful.
