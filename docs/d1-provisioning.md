# XRPL Group Pay — D1 Provisioning

**Status:** Active  
**Scope:** Local, Testnet, and Mainnet D1 provisioning and migration controls  
**Last reviewed:** 2026-06-26  
**Document class:** Public

## 1. Purpose

The `PAYMENTS_DB` and `PAYMENTS_DB_MAINNET` bindings store Bills, PaymentSlots, capability hashes, verified receipts, accepted transaction references, progress state, allocation records, and public proof lookup data.

They do not store wallet signing material or raw signed transaction data by default.

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

## 4. Mainnet database boundary

Mainnet uses separate immutable database names, identifiers, environment configuration, and migration procedures.

Protected names:

```text
Production: xrpl-group-pay-mainnet
Preview:    xrpl-group-pay-mainnet-preview
Binding:    PAYMENTS_DB_MAINNET
```

The preview database is deliberately separate from the production database. Remote preview and development checks must not silently use the production database.

Testnet data is not copied automatically to Mainnet.

## 5. Guarded GitHub workflow

`.github/workflows/provision-mainnet-d1.yml` is a manually dispatched workflow. It has read-only repository permissions and uses the protected `mainnet-provisioning` environment.

Configure the following secrets in that environment or repository before dispatch:

```text
MAINNET_D1_API_TOKEN
MAINNET_D1_ACCOUNT_ID
```

The token must be limited to the Cloudflare account and permissions needed to inspect, create, migrate, and query D1. Never place either value in repository files, workflow inputs, logs, issues, or pull requests.

The workflow can run only from the default branch and serializes all Mainnet D1 operations.

### Inspect mode

Inspect mode performs no database creation and applies no migrations.

Exact confirmation:

```text
INSPECT xrpl-group-pay-mainnet
```

It reports whether the protected production and preview names already exist, their non-secret IDs, applied migration counts, and required schema presence.

### Provision mode

Provision mode creates only missing protected-name databases, rejects duplicate protected names, refuses to use the same ID for production and preview, applies every repository migration to both databases, and validates the resulting schema.

Exact confirmation:

```text
PROVISION xrpl-group-pay-mainnet AND xrpl-group-pay-mainnet-preview
```

A location input is used only as the creation hint for a missing database. The allowed values are fixed by `config/mainnet-d1-provisioning.json`.

## 6. Fail-closed checks

Before any remote operation, the workflow requires:

- dispatch from the default branch;
- the exact mode-specific confirmation text;
- a permitted D1 location hint;
- the current Mainnet acceptance record to remain valid;
- the current Mainnet release evidence record to remain valid;
- committed Mainnet runtime, gate, Source Tag approval, release mode, and operations mode to remain disabled or halted;
- exactly one protected Mainnet D1 binding in Wrangler.

Before applying migrations, it also requires:

- exact protected database names;
- distinct non-placeholder production and preview UUIDs;
- no unexpected tables in an existing protected-name database.

After applying migrations, it requires both databases to contain:

- every repository migration recorded in `d1_migrations`;
- all required application tables;
- all required `verified_payment_records` columns.

## 7. Workflow output

A successful run uploads one public-safe JSON artifact containing:

- workflow mode and checked commit;
- production and preview database names and IDs;
- repository migration filenames and counts;
- production and preview applied migration counts;
- schema-check results;
- a candidate `production-d1-provisioning` evidence patch when all checks pass.

The artifact must not contain API credentials, wallet secrets, capability tokens, or private callback data.

The workflow intentionally does not:

- commit D1 IDs to the repository;
- modify `wrangler.jsonc` on `main`;
- change `config/mainnet-release-evidence.json`;
- resolve the acceptance finding;
- deploy the Worker;
- enable Mainnet runtime or payment operations.

Those changes require a separate reviewed pull request using the successful artifact.

## 8. Acceptance update procedure

After a verified provision run:

1. review the workflow logs and artifact;
2. confirm the run used the expected default-branch commit;
3. place the production and preview IDs in the Mainnet Wrangler binding;
4. copy the candidate D1 evidence fields into `config/mainnet-release-evidence.json`;
5. set `production-d1-provisioning` to `passed` in `config/mainnet-acceptance.json`;
6. set `production-d1-not-provisioned` to `resolved`;
7. leave every unrelated Mainnet finding unchanged;
8. run the full CI suite;
9. merge only after review.

Completing D1 provisioning alone does not approve Mainnet release.

## 9. Forward migration policy

- migrations are versioned and append-only after release;
- schema changes move forward rather than editing applied migration files;
- migrations preserve readable XRP records;
- existing XRP proof digests remain unchanged;
- issued-asset receipt fields are added through new migrations;
- network, Asset, issuer, and Receipt Contract constraints are checked;
- a migration is tested from both an empty database and the current production-shaped schema.

## 10. Mainnet release checks

1. Confirm the binding targets only the Mainnet database.
2. Confirm Mainnet XRPL endpoints and Asset Registry values.
3. Apply migrations under the guarded production workflow.
4. Record and review the D1 provisioning evidence.
5. Run controlled small-value XRP settlement and proof.
6. Run controlled small-value RLUSD settlement and proof.
7. Verify asset-specific limits and Source Tag.
8. Verify emergency disable behavior does not alter stored receipts.

## 11. Recovery

Application deployment may be disabled or rolled back independently of immutable migration history. A corrective migration is preferred over rewriting an applied migration.

A failed provisioning run does not authorize deletion of a database. Inspect the existing protected names and the workflow log before retrying. The provisioner is designed to reuse an exact protected-name database and create only the missing member of the production/preview pair.

Durable receipts and accepted ledger facts are not deleted merely to make a failed deployment appear successful.
