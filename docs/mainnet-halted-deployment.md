# Halted Mainnet deployment review

XRPL Group Pay uses a separate halted deployment stage before any live Mainnet payment acceptance work.

The fixed target is:

```text
Worker: xrpl-group-pay-mainnet
Origin: https://xgp.badjoke-lab.com
Callback: https://xgp.badjoke-lab.com/api/xaman/callback
Database binding: PAYMENTS_DB_MAINNET
Source Tag: 2171267705
Release mode: internal
Operations mode: halted
```

## Purpose

This stage proves that the production Worker, custom domain, callback route, database binding, and Mainnet runtime configuration can coexist while both payment creation and payment verification remain disabled.

It is not a public release and it does not include a live XRP or RLUSD transaction.

## Repository contract

`config/mainnet-halted-deployment.json` fixes the exact worker, domain, database, Source Tag, release mode, and operations mode.

`scripts/mainnet-halted-deployment-config.mjs` creates an ephemeral Wrangler configuration from the committed closed configuration. It refuses to proceed unless:

- the current release stage is `halted-deployment-review`;
- production provider evidence is accepted;
- production release configuration evidence is still pending;
- the committed Mainnet configuration remains disabled and unapproved;
- production and preview D1 databases are isolated;
- the fixed domain, database binding, and Source Tag match the reviewed target.

The generated configuration stages this exact state:

```text
ALLOW_MAINNET_RUNTIME=true
MAINNET_GATE_APPROVED=true
MAINNET_SOURCE_TAG_APPROVED=true
MAINNET_RELEASE_MODE=internal
MAINNET_OPERATIONS_MODE=halted
```

The committed `wrangler.jsonc` remains closed until verified deployment evidence is imported in a later reviewed pull request.

## Public verification

`scripts/verify-mainnet-halted-deployment.mjs` verifies all of the following after deployment:

- the HTTPS origin is reachable;
- `/api/status/payments` reports Mainnet and `halted`;
- payment creation is disabled;
- payment verification is disabled;
- the callback route rejects unsigned JSON with `INVALID_XAMAN_SIGNATURE` rather than reporting missing callback configuration;
- a public-safe report is tied to the exact source commit and GitHub Actions run;
- no credential value is written to the report.

The report contains a candidate `production-release-configuration` evidence patch. It does not update the repository automatically.

## Safety boundary

A successful halted deployment review means only that production infrastructure is reachable and safely stopped. It does not approve payment operations.

The next stage remains a separately controlled live XRP acceptance test. Live RLUSD acceptance and the final release audit remain later stages.
