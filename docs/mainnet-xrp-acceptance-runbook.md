# Controlled Mainnet XRP acceptance runbook

## Purpose

This runbook defines the first live XRP acceptance test for XRPL Group Pay. It does not authorize a public Mainnet release. The production Worker remains in `MAINNET_RELEASE_MODE=internal` and `MAINNET_OPERATIONS_MODE=halted` before and after the test.

The test is successful only when one participant-controlled XRP payment is independently verified on a validated Mainnet ledger, recorded as a durable receipt, rejected on duplicate use, rejected when replayed against another PaymentSlot, and followed by a verified return to halted operations.

## Human-controlled boundary

A human operator must supply and control both Mainnet accounts:

- the Bill destination account;
- the expected payer account opened in Xaman.

The application and CI must never receive a seed, family seed, mnemonic, private key, signing key, or signed transaction blob as an input. Xaman must present the final transaction to the payer, and the payer must inspect and approve it on their own device.

No workflow may sign or submit a transaction with application-held credentials.

## Fixed limits

The first acceptance payment must use native XRP and an amount between 1 and 1,000 drops. The Bill must use:

```text
network: mainnet
asset_id: xrpl:mainnet:xrp
source_tag: 2171267705
release_mode: internal
```

The test must use an isolated Mainnet D1 binding named `PAYMENTS_DB_MAINNET`. Testnet records, bindings, Source Tags, and Asset IDs are invalid for this test.

## Required preconditions

All of the following must be true before temporarily enabling payment operations:

1. The checked-out commit is the repository default branch.
2. `config/mainnet-release-plan.json` reports `current_stage=live-xrp-acceptance`.
3. `production-release-configuration` is accepted.
4. `live-mainnet-xrp-acceptance` is pending.
5. `live-mainnet-rlusd-acceptance` remains pending.
6. The production origin is `https://xgp.badjoke-lab.com`.
7. The production Worker is reachable and reports halted operations.
8. Bill creation is deployment-network-aware and rejects cross-network Assets.
9. Production Xaman credentials are configured outside the repository.
10. A rollback operator can restore halted mode immediately.

## Private operator material

The following values are private operational material and must not be committed, printed in public logs, placed in a public report, or copied into a pull request:

- Bill public, admin, and participant capability tokens;
- Xaman payload UUID, deep link, QR data, and websocket URL;
- Xaman API credentials and user push token;
- temporary Mainnet acceptance authorization token;
- callback bodies and signed transaction blobs.

Public evidence may contain the final transaction hash because it is already public on XRPL Mainnet.

## Execution sequence

### 1. Confirm halted baseline

Verify `/api/status/payments` reports:

```text
network=mainnet
mode=halted
create=false
verify=false
```

An unsigned Xaman callback must still be rejected. The Mainnet D1 binding must be the isolated production database.

### 2. Prepare production-only temporary targets

Run the repository-owned preparation command from the repository root. It generates three ignored standalone Wrangler targets:

```text
wrangler.acceptance.enabled.json
wrangler.acceptance.verify-only.json
wrangler.acceptance.halted.json
```

The generated targets must satisfy all of the following:

- the Worker name is the reviewed Mainnet Worker;
- the target is standalone and does not contain an `env` block;
- the only D1 binding is `PAYMENTS_DB_MAINNET`;
- its D1 UUID is copied from the reviewed Mainnet `database_id`;
- `preview_database_id` is absent at every nesting level;
- the internal release mode, approved Source Tag, custom domain, assets, and compatibility settings remain unchanged;
- only the operations mode and temporary acceptance authorization controls differ between the three targets.

The temporary enabled target changes:

```text
MAINNET_OPERATIONS_MODE=enabled
```

The verify-only target changes:

```text
MAINNET_OPERATIONS_MODE=verify-only
```

The rollback target restores:

```text
MAINNET_OPERATIONS_MODE=halted
```

A random acceptance authorization value must protect Bill creation, payload creation, and verification. Only its SHA-256 digest may be placed in runtime variables. The raw value remains in the protected operator process and is destroyed after rollback.

Before any enabled deployment, run Wrangler in dry-run mode against the generated enabled target. The displayed D1 UUID must exactly equal the reviewed production `database_id`. A preview UUID, missing binding, unexpected second D1 binding, environment warning, or any other mismatch aborts the attempt and leaves the production Worker halted.

Deploy generated standalone targets without `--env`. Supplying `--env` to these generated targets is invalid because they intentionally contain no named environments.

### 3. Create the frozen Bill

Create a canonical Mainnet XRP Bill with two PaymentSlots:

- primary slot: the payment that the operator will sign;
- replay-control slot: remains unpaid and is used only to prove cross-slot replay rejection.

Both slots may use the same expected payer account, but they must have different capability tokens and InvoiceIDs. The primary expected amount must exactly equal the approved drop amount.

### 4. Create the Xaman handoff

Create a Mainnet Xaman payment request for the primary PaymentSlot. The request must include:

- exact destination;
- exact XRP amount in drops;
- Source Tag `2171267705`;
- the slot's unique InvoiceID;
- forced Mainnet network;
- submission enabled;
- a short expiration.

Deliver the request privately to the enrolled Xaman user. Do not publish the QR code or deep link in a public Actions log or artifact.

### 5. Participant review and signature

The payer verifies in Xaman:

- network is Mainnet;
- destination is the intended destination account;
- amount matches the approved drop amount;
- the request is a direct XRP Payment.

The payer then signs on their own device. Rejecting or timing out the request must fail the acceptance attempt and trigger rollback.

### 6. Independent verification and recording

The server must independently retrieve the Xaman outcome and XRPL transaction. It must require:

- validated ledger;
- `tesSUCCESS`;
- exact sender and destination;
- native XRP Payment;
- exact requested and delivered drops;
- exact Source Tag, Destination Tag, and InvoiceID;
- no partial payment or cross-currency fields;
- unused Mainnet transaction identity.

The server then records the receipt and updates the PaymentSlot and Bill atomically.

### 7. Negative controls

After the primary slot is recorded:

1. Submit the same verification again for the primary slot. It must be rejected as already settled or duplicate.
2. Submit the same transaction outcome against the replay-control slot. It must be rejected because the InvoiceID and slot identity do not match.

Neither rejection may create another receipt or mutate the replay-control slot to paid.

### 8. Mandatory rollback

Rollback runs regardless of success, failure, cancellation, or timeout. Deploy the generated standalone halted target without `--env`, then verify `/api/status/payments` reports both creation and verification disabled.

Destroy all generated Wrangler targets, temporary configuration files, capability tokens, Xaman handoff data, and authorization values.

A test without verified rollback is failed even when the XRP transaction itself succeeded.

## Public-safe evidence report

A successful report contains only:

- schema version and Mainnet network;
- source commit and workflow URL;
- generated timestamp;
- transaction hash and validated ledger index;
- `tesSUCCESS` result;
- expected XRP amount in drops;
- receipt ID and proof digest;
- duplicate rejection result;
- cross-slot replay rejection result;
- confirmation that halted mode was restored;
- confirmation that sensitive values were excluded.

The report must not mark `live-mainnet-xrp-acceptance` accepted until every required field is present and rollback is verified.

## Failure handling

On any failure:

1. stop creating new Xaman requests;
2. restore halted operations with the standalone halted target;
3. verify the halted status endpoint;
4. preserve only public-safe stage diagnostics;
5. do not import partial evidence;
6. leave `live-mainnet-xrp-acceptance` pending.

## Evidence import

A successful run produces a public-safe report artifact. Import that report in a separate reviewed pull request. The import must advance the release plan to `live-rlusd-acceptance` while keeping the final release decision blocked.
