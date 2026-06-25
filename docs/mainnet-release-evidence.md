# Mainnet Release Evidence

**Status:** Active  
**Scope:** Production Mainnet release evidence contract  
**Last reviewed:** 2026-06-26

## Purpose

`config/mainnet-release-evidence.json` records the non-secret facts required to close the production findings in `config/mainnet-acceptance.json`.

The evidence file is not a place for credentials or private wallet material. It records only public identifiers, validation outcomes, and operational attestations that can safely exist in a public repository.

A record has one of two states:

- `pending` — the production check has not been accepted;
- `accepted` — every required fact for that record is present and the matching acceptance control and finding have been updated in the same change.

## Validation commands

Normal validation accepts a correctly documented blocked release:

```bash
pnpm check:mainnet-evidence
```

Mainnet deployment requires all seven evidence records to be accepted:

```bash
node scripts/check-mainnet-release-evidence.mjs --require-complete
```

`pnpm deploy:mainnet` runs the complete evidence check before the acceptance and Mainnet Gate checks.

## Prohibited content

Never store any of the following in the evidence file, documentation, pull request, issue, workflow artifact, or test fixture derived from a real environment:

- XRPL family seed or private key;
- Xaman API key or API secret;
- bearer token, session token, or webhook secret;
- creator or participant capability token;
- full private request or callback payload containing credentials;
- wallet backup, mnemonic, or signing material.

The evidence checker uses strict record schemas and rejects secret-like values. This is a secondary safeguard, not permission to paste secrets and rely on detection.

## Evidence records

### Production D1 provisioning

Record:

```text
production-d1-provisioning
```

Acceptance requires:

- the exact `xrpl-group-pay-mainnet` database name;
- non-placeholder production and preview D1 identifiers;
- a positive migration count;
- confirmation that all migrations were applied;
- confirmation that the receipt schema check passed.

When accepted, the identifiers must exactly match the `PAYMENTS_DB_MAINNET` binding in `wrangler.jsonc`.

### Production release configuration

Record:

```text
production-release-configuration
```

Acceptance requires:

- a non-local HTTPS public URL;
- `APP_NETWORK=mainnet`;
- `NEXT_PUBLIC_APP_NETWORK=mainnet`;
- `PAYMENTS_DATABASE_BINDING=PAYMENTS_DB_MAINNET`;
- explicit runtime, gate, and Source Tag approval;
- a release mode other than `disabled`;
- an explicitly selected operations mode.

When accepted, every value must match the committed Mainnet Wrangler environment.

### Production Xaman provider attestation

Record:

```text
production-provider-attestation
```

Acceptance requires a non-secret reference confirming that:

- production credentials were configured outside the repository;
- wallet requests were forced to XRPL Mainnet;
- callback behavior was checked;
- payload status lookup was checked;
- no secret was committed.

The reference may be a review identifier or a concise public-safe test record. It must never contain credential values.

### Assigned Mainnet Source Tag

Record:

```text
assigned-mainnet-source-tag
```

Acceptance requires:

- the assigned UInt32 Source Tag;
- a non-secret assignment reference;
- confirmation that no Testnet fallback exists.

The accepted value must match `XRPL_MAINNET_SOURCE_TAG` in the Mainnet deployment configuration.

### Live Mainnet XRP acceptance

Record:

```text
live-mainnet-xrp-acceptance
```

Acceptance requires:

- a 64-character Mainnet transaction hash;
- validated ledger index;
- `validated=true`;
- `tesSUCCESS`;
- positive XRP amount in drops;
- receipt identity equal to `mainnet:<transaction hash>`;
- the public proof digest;
- duplicate rejection confirmation;
- replay rejection confirmation.

Do not record payer capability links or private wallet data. The transaction hash and ledger index are public ledger identifiers.

### Live Mainnet RLUSD acceptance

Record:

```text
live-mainnet-rlusd-acceptance
```

Acceptance requires the same transaction, receipt, duplicate, and replay facts as XRP, plus:

- official Mainnet RLUSD currency code;
- official Mainnet RLUSD issuer;
- positive issued-asset value with no more than six decimal places;
- recipient-readiness confirmation.

The issuer and currency must exactly match `config/xrpl-mainnet-assets.json`.

### Operational stop drill

Record:

```text
operational-stop-drill
```

The drill may run against Mainnet or a production-equivalent isolated environment. Acceptance requires confirmation that:

- `verify-only` rejected new handoff creation;
- an already submitted payment could still verify and settle in `verify-only`;
- the public status endpoint reported `verify-only` correctly;
- `halted` rejected new handoff creation;
- `halted` rejected verification;
- the public status endpoint reported `halted` correctly;
- restoring operation used a reviewed configuration change.

## Update discipline

Each production finding must be closed atomically:

1. collect the non-secret evidence;
2. update the matching evidence record from `pending` to `accepted`;
3. update the matching acceptance control to `passed`;
4. update the matching finding to `resolved`;
5. update the committed configuration when the evidence contract requires an exact match;
6. run the full validation suite;
7. review the change before merge.

An accepted evidence record cannot coexist with a pending acceptance control or open finding. A pending evidence record cannot coexist with a passed control or resolved finding.

## Trust boundary

The checker proves structural completeness and repository consistency. It does not independently prove that a human attestation is truthful or that an external service operated correctly. Public transaction hashes can be verified against the XRPL, while private provider and infrastructure checks still require responsible review.
