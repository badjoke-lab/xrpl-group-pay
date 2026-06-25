# Mainnet Acceptance Audit

**Audit status:** Completed  
**Release decision:** Blocked  
**Audited:** 2026-06-26  
**Scope:** Repository controls, release configuration, production evidence, and operational readiness

## Decision

The repository-level Mainnet safety implementation is substantially complete, but XRPL Group Pay is not approved for a production Mainnet release yet.

The Mainnet Gate remains `blocked`. This is an acceptance decision, not an unfinished audit. The unresolved findings below must be closed with production or production-equivalent evidence before the release decision can become `approved` and the gate can become `ready`.

## Passed controls

### Network and build isolation

- server and public XRPL network identities must match;
- Mainnet build and runtime require explicit approval;
- Mainnet cannot use the Testnet D1 binding;
- Mainnet cannot inherit the Testnet Source Tag;
- the release mode and operations mode are independent explicit controls.

### Asset and recipient safety

- Mainnet XRP and official RLUSD use exact canonical Asset descriptors;
- recipient account existence and Destination Tag requirements are checked on a validated ledger;
- Deposit Authorization is checked;
- RLUSD trust-line issuer, currency, authorization, freeze state, and capacity are checked.

### Wallet handoff and verification

- Xaman requests force the selected network;
- Mainnet handoffs require explicit gate access;
- request identity is persisted with network and Asset identity;
- Xaman status is not accepted as payment proof;
- XRP and RLUSD are verified from validated-ledger transactions;
- payer, destination, amount, delivered amount, Source Tag, Destination Tag, InvoiceID, result, and transaction identity are checked;
- verified receipts and Bill progress are written through the durable settlement boundary.

### Operational control

- `enabled` permits request creation and verification;
- `verify-only` stops new requests while allowing existing submitted payments to settle;
- `halted` stops request creation and verification;
- missing Mainnet operations configuration fails closed;
- the committed Mainnet target remains halted;
- a non-secret no-store endpoint reports the operational state.

### Regression coverage

CI covers:

- environment boundaries;
- D1 migrations and receipt constraints;
- lint and type checking;
- unit and component tests;
- Next.js build;
- Storybook smoke;
- Cloudflare Worker build;
- browser smoke tests.

## Blocking findings

### 1. Production D1 is not provisioned in the release configuration

The committed Mainnet D1 and preview identifiers are placeholders. The isolated production database must be created, all migrations must be applied, and schema checks must pass against the intended deployment before approval.

### 2. Production release configuration is not approved

The committed Mainnet target remains intentionally disabled:

- Mainnet runtime is not allowed;
- the Mainnet Gate is not approved;
- the Mainnet Source Tag is not approved;
- release mode is disabled;
- payment operations are halted.

These values must not be enabled merely to satisfy the audit. They should change only after the remaining evidence has been reviewed.

### 3. Production Xaman configuration is not attested

The repository contains the provider boundary and tests, but it does not contain a non-secret acceptance record confirming that the production Xaman application credentials, forced Mainnet payload behavior, and status/callback behavior were validated in the target deployment.

Secrets must not be committed. The required evidence is an attestation and test result, not credential values.

### 4. Assigned Mainnet Source Tag is not recorded as approved

The release requires the assigned Mainnet Source Tag to be configured and explicitly approved without a Testnet fallback.

### 5. Live Mainnet XRP acceptance evidence is not recorded

A controlled XRP payment must demonstrate the complete path:

1. frozen Mainnet PaymentSlot;
2. Xaman Mainnet handoff;
3. participant-controlled signature;
4. validated `tesSUCCESS` Payment;
5. exact payer, destination, drops, delivered amount, tags, and InvoiceID;
6. durable receipt;
7. atomic PaymentSlot and Bill progress update;
8. duplicate and replay rejection.

The evidence record must not expose private keys, seeds, API secrets, or private capability tokens.

### 6. Live Mainnet RLUSD acceptance evidence is not recorded

A controlled official RLUSD Mainnet payment must demonstrate the same complete path plus exact official issuer, currency, trust-line readiness, requested amount, and delivered amount.

### 7. Operational stop drill is not recorded

A production or production-equivalent drill must show:

- `verify-only` rejects new wallet handoffs while allowing an already submitted payment to verify and settle;
- `halted` rejects both creation and verification;
- the status endpoint reflects the selected mode;
- restoring operation requires an explicit reviewed configuration change.

## Machine-enforced decision

`config/mainnet-acceptance.json` is the machine-readable acceptance record.

```bash
pnpm check:mainnet-acceptance
```

Normal Testnet CI validates that the audit document, Mainnet Gate, and committed safe defaults remain consistent. A blocked release is a valid CI state.

```bash
node scripts/check-mainnet-acceptance.mjs --require-ready
```

The ready check fails until:

- every required acceptance control is `passed`;
- every blocking finding is `resolved`;
- the release decision is `approved`;
- the Mainnet Gate is `ready`;
- every Mainnet Gate check is `passed`.

`pnpm deploy:mainnet` runs this ready check before the Mainnet Gate check and before building or deploying the Mainnet Worker.

## Approval procedure

After all findings are resolved:

1. update each control and finding with concise non-secret evidence;
2. set `release_decision` to `approved`;
3. mark `mainnet-acceptance-audit` as `passed`;
4. set the Mainnet Gate state to `ready` only when every gate check is passed;
5. run the full validation and Mainnet-ready checks;
6. review the resulting deployment configuration separately from the application code.

Passing this audit permits a controlled release process. It does not remove the operational kill switch, validated-ledger verification, recipient-readiness checks, or any other fail-closed boundary.
