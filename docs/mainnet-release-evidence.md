# Mainnet Release Evidence

**Status:** Active  
**Scope:** Accepted production Mainnet release evidence contract  
**Last reviewed:** 2026-07-03

## Purpose

`config/mainnet-release-evidence.json` records the non-secret facts required by the Mainnet acceptance audit.

All seven required evidence records are accepted. The evidence file is not a place for credentials or private wallet material. It records only public identifiers, validation outcomes, and operational attestations that can safely exist in a public repository.

The accepted evidence supports the controlled Mainnet release decision. It does not remove runtime approval, readiness, verification, reconciliation, duplicate protection, or the operational kill switch.

## Validation commands

Normal validation:

```bash
pnpm check:mainnet-evidence
```

Deployment requires every record to remain accepted:

```bash
node scripts/check-mainnet-release-evidence.mjs --require-complete
```

`pnpm deploy:mainnet` runs the complete evidence check before the acceptance, Mainnet Gate, and integrated lifecycle checks.

## Prohibited content

Never store any of the following in the evidence file, documentation, pull request, issue, workflow artifact, or real-environment fixture:

- XRPL family seed or private key;
- Xaman API key or API secret;
- bearer token, session token, or webhook secret;
- management, progress, payer, setup, or proof capability token;
- full private request or callback payload containing credentials;
- wallet backup, mnemonic, QR code, deeplink, or signing material.

The evidence checker rejects secret-like values as a secondary safeguard. It is not permission to paste secrets and rely on detection.

## Accepted evidence records

### Production D1 provisioning

Record:

```text
production-d1-provisioning
```

The accepted record confirms:

- the exact `xrpl-group-pay-mainnet` database name;
- non-placeholder production and preview D1 identifiers;
- a positive migration count;
- all recorded migrations applied;
- receipt schema checks passed;
- exact agreement with the `PAYMENTS_DB_MAINNET` binding.

### Production release configuration

Record:

```text
production-release-configuration
```

The accepted record confirms the reviewed Mainnet origin, network identity, isolated database binding, explicit runtime and gate approval, assigned Source Tag approval, release mode, and operations mode used by the acceptance deployment.

This record captures the reviewed deployment state at the time of acceptance. Later public operation remains subject to reviewed deployment configuration and continuous production UI checks. The committed `internal + halted` target remains the fail-closed rollback baseline.

### Production Xaman provider attestation

Record:

```text
production-provider-attestation
```

The accepted non-secret attestation confirms:

- production credentials were configured outside the repository;
- wallet requests were forced to XRPL Mainnet;
- callback behavior was checked;
- payload status lookup was checked;
- cancellation behavior was checked;
- no secret was committed.

The evidence reference must never contain credential values, private payload identifiers, QR data, or deeplinks.

### Assigned Mainnet Source Tag

Record:

```text
assigned-mainnet-source-tag
```

The accepted record confirms:

- the assigned UInt32 Source Tag;
- a reproducible non-secret assignment reference;
- no Testnet fallback;
- consistency with the reviewed Mainnet deployment configuration.

### Controlled Mainnet XRP acceptance

Record:

```text
live-mainnet-xrp-acceptance
```

The accepted record contains only public-safe ledger and verification facts:

- a 64-character Mainnet transaction hash;
- validated ledger index;
- `validated=true`;
- `tesSUCCESS`;
- positive XRP amount in drops;
- receipt identity equal to `mainnet:<transaction hash>`;
- public proof digest;
- duplicate rejection;
- cross-slot replay rejection.

The transaction hash and ledger index are public XRPL identifiers. Payer capabilities and private wallet data are prohibited.

### Controlled Mainnet official RLUSD acceptance

Record:

```text
live-mainnet-rlusd-acceptance
```

The accepted record confirms the same transaction, receipt, duplicate, and replay facts as XRP, plus:

- official Mainnet RLUSD currency code;
- official Mainnet RLUSD issuer;
- positive issued amount within supported precision;
- recipient-readiness confirmation;
- exact agreement with `config/xrpl-mainnet-assets.json`.

### Operational stop drill

Record:

```text
operational-stop-drill
```

The accepted production-equivalent drill confirms:

- `verify-only` rejected new handoff creation;
- an already-submitted Payment could still verify and settle;
- the status endpoint reported `verify-only`;
- `halted` rejected new handoff creation;
- `halted` rejected verification;
- the status endpoint reported `halted`;
- restoration required a reviewed configuration change.

## Public production UI evidence

The CI production UI audit checks `https://xgp.badjoke-lab.com/bill` without creating a Bill or moving funds.

It captures and validates:

- 320px mobile;
- 390px mobile;
- 1280px desktop;
- English XRP creation;
- Japanese official RLUSD creation;
- Mainnet Asset selection;
- server/client language consistency;
- stale-copy rejection;
- horizontal-overflow rejection.

This visual evidence supplements, but does not replace, the accepted transaction, provider, D1, and operational evidence records.

## Update discipline

A future evidence change must be reviewed atomically:

1. collect only non-secret evidence;
2. update the matching evidence record;
3. update the matching acceptance control or finding when its decision changes;
4. update exact committed configuration when the evidence contract requires agreement;
5. run Mainnet evidence, acceptance, Gate, lifecycle-audit, D1, test, build, browser, and production UI checks;
6. review the public-surface wording before merge.

An accepted evidence record cannot coexist with a pending acceptance control or open matching finding.

## Trust boundary

The checker proves structural completeness and repository consistency. It does not independently prove that a human attestation is truthful or that an external provider or infrastructure service operated correctly.

Public XRPL transaction hashes can be independently checked against the ledger. Private provider and infrastructure checks still require responsible human review. No evidence record grants custody, signing authority, refund authority, or permission to bypass validated-ledger verification.
