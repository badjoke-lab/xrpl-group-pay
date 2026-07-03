# Mainnet Acceptance Audit

**Audit status:** Completed  
**Release decision:** Approved  
**Audited:** 2026-06-30  
**Last reconciled:** 2026-07-03  
**Scope:** Repository controls, release configuration, production evidence, and operational readiness

## Decision

XRPL Group Pay passed the controlled Mainnet acceptance audit.

`config/mainnet-acceptance.json` records every required control as `passed`, every blocking finding as `resolved`, and the release decision as `approved`. `config/mainnet-gate.json` is `ready`, and every required Mainnet release evidence record is accepted.

Approval permits reviewed Mainnet operation. It does not remove the operational kill switch, explicit release configuration, canonical Asset checks, recipient readiness, capability boundaries, reconciliation, or validated-ledger verification.

## Passed controls

### Network and build isolation

- server and public XRPL network identities must match;
- Mainnet build and runtime require explicit approval;
- Mainnet selects only the isolated `PAYMENTS_DB_MAINNET` binding;
- Mainnet cannot inherit the Testnet Source Tag;
- release mode and operations mode remain separate explicit controls.

### Asset and recipient safety

- Mainnet XRP and official RLUSD use exact canonical Asset descriptors;
- recipient account existence and Destination Tag requirements are checked on a validated ledger;
- Deposit Authorization is checked;
- RLUSD issuer, currency, authorization, freeze state, balance, and capacity are checked;
- the payer retains signing authority and sends directly to the recipient.

### Wallet handoff and verification

- Xaman requests force the selected XRPL network;
- Mainnet handoffs require explicit gate access;
- request identity is persisted with network, Asset, payer, Sequence, and bounded ledger information;
- Xaman status is not accepted as payment proof;
- XRP and official RLUSD are verified from validated-ledger transactions;
- payer, destination, amount, delivered amount, Asset identity, Source Tag, Destination Tag, InvoiceID, result, and transaction identity are checked;
- verified receipts and Bill progress use the durable atomic settlement boundary;
- replacement handoffs require validated-ledger reconciliation.

### Operational control

- `enabled` permits request creation and verification;
- `verify-only` stops new requests while allowing already-submitted payments to settle;
- `halted` stops request creation and verification;
- missing Mainnet operations configuration fails closed;
- the public status endpoint reports the selected mode without exposing secrets;
- the committed halted target remains available as the reviewed fail-closed rollback baseline.

### Regression and release coverage

CI covers:

- environment boundaries;
- Mainnet release evidence and acceptance consistency;
- integrated payment-lifecycle release audit;
- D1 migrations and constraints;
- lint and type checking;
- unit, component, API, and persistence tests;
- Next.js build;
- Storybook smoke;
- Cloudflare Worker build;
- browser smoke tests;
- production Bill UI audit.

## Resolved findings

### Production D1 provisioning

The isolated production and preview D1 databases were provisioned, all recorded migrations were applied, and schema checks passed. The accepted non-placeholder identifiers match the `PAYMENTS_DB_MAINNET` binding.

### Production release configuration

The reviewed Mainnet Worker target, custom domain, explicit network, isolated D1 binding, Source Tag, release control, and operations control were verified. Public operating changes remain separate reviewed deployments; the repository retains the halted rollback configuration.

### Production Xaman attestation

A non-secret attestation confirmed production credentials outside the repository, forced Mainnet requests, callback behavior, status lookup, and safe cancellation. No credential or private payload identifier was committed.

### Assigned Mainnet Source Tag

The assigned UInt32 Source Tag is recorded in `config/mainnet-source-tag.json`, is reproducibly checked, and cannot fall back to the Testnet value.

### Controlled Mainnet XRP acceptance

The accepted evidence records one validated `tesSUCCESS` Mainnet XRP transaction, exact frozen payment facts, a durable receipt, idempotent repeat handling, duplicate protection, and cross-slot replay rejection.

### Controlled Mainnet RLUSD acceptance

The accepted evidence records one validated official Mainnet RLUSD transaction with exact issuer, currency, amount, recipient readiness, durable receipt, idempotent repeat handling, duplicate protection, and cross-slot replay rejection.

### Operational stop drill

A production-equivalent drill confirmed verify-only draining, full halt, status reporting, and reviewed restoration behavior.

### Final release audit

The original Mainnet release audit passed after all evidence records were accepted and all incident remediations were merged. The PR #132–#149 payment-lifecycle revision adds a separate integrated lifecycle audit without weakening the accepted Mainnet boundary.

## Machine-enforced decision

The machine-readable acceptance record is:

```text
config/mainnet-acceptance.json
```

Normal validation:

```bash
pnpm check:mainnet-acceptance
```

Deployment-ready validation:

```bash
node scripts/check-mainnet-acceptance.mjs --require-ready
```

The ready check requires:

- every acceptance control to be `passed`;
- every blocking finding to be `resolved`;
- `release_decision` to be `approved`;
- the Mainnet Gate to be `ready`;
- every Mainnet Gate check to be `passed`.

`pnpm deploy:mainnet` also requires complete release evidence, the ready Mainnet Gate, and the integrated lifecycle audit before building or deploying the Mainnet Worker.

## Public operation and rollback

The production origin is `https://xgp.badjoke-lab.com`.

The production UI audit checks the live Mainnet Bill page at 320px, 390px, and 1280px, including English XRP and Japanese official RLUSD selection, server/client language consistency, selected Asset identity, and horizontal overflow.

Public operation is controlled by deployment configuration outside normal application requests. The repository's reviewed halted configuration remains the rollback baseline so an incident response can stop new handoffs and verification without removing evidence, receipts, or payment history.

## Trust boundary

Repository validation proves that the required records are structurally complete and mutually consistent. Public XRPL transaction hashes can be independently checked against the ledger. Provider and infrastructure attestations still depend on responsible human review and must never include secrets, seeds, private keys, or capability tokens.
