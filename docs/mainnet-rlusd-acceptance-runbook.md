# Controlled Mainnet RLUSD acceptance runbook

## Purpose

This runbook defines the first live official RLUSD acceptance test for XRPL Group Pay. It does not authorize a public Mainnet release. The production Worker remains in `MAINNET_RELEASE_MODE=internal` and `MAINNET_OPERATIONS_MODE=halted` before and after the test.

The test is successful only when one participant-controlled official RLUSD payment is independently verified on a validated Mainnet ledger, recorded as one durable receipt, prevented from creating a second settlement when repeated, rejected when replayed against another PaymentSlot, and followed by a verified return to halted operations.

## Human-controlled boundary

A human operator must supply and control both Mainnet accounts:

- the Bill destination account;
- the expected payer account opened in Xaman.

The application and CI must never receive a seed, family seed, mnemonic, private key, signing key, or signed transaction blob. Xaman must present the final issued-Asset Payment to the payer, and the payer must inspect and approve it on their own device.

No workflow may sign or submit a transaction with application-held credentials.

## Canonical official RLUSD identity

The acceptance test must use exactly:

```text
network: mainnet
asset_id: xrpl:mainnet:rlusd
currency: 524C555344000000000000000000000000000000
issuer: rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De
precision: 6
source_tag: 2171267705
release_mode: internal
```

An arbitrary IOU, ticker-only match, Testnet issuer, alternate issuer, or shortened currency identity is invalid.

The primary amount must be between 1 and 1,000,000 canonical units, equal to `0.000001` through `1.000000` RLUSD. The first attempt should use the minimum amount unless a reviewed operational reason requires more.

## Required preconditions

All of the following must be true before temporarily enabling payment operations:

1. The checked-out commit is the repository default branch.
2. `config/mainnet-release-plan.json` reports `current_stage=live-rlusd-acceptance`.
3. `live-mainnet-xrp-acceptance` is accepted.
4. `live-mainnet-rlusd-acceptance` remains pending.
5. The production origin is `https://xgp.badjoke-lab.com`.
6. The production Worker is reachable and reports halted operations.
7. The Mainnet D1 binding is the isolated production database `PAYMENTS_DB_MAINNET`.
8. Production Xaman credentials are configured outside the repository.
9. The destination and payer are distinct classic XRPL accounts controlled by the operator.
10. A rollback operator can restore halted mode immediately.

## Recipient and payer readiness

Before Bill creation, validated-ledger reads must confirm:

### Destination account

- the account exists;
- a required Destination Tag is supplied when the account requires one;
- Deposit Authorization does not block the payment;
- a trust line exists for the exact official RLUSD issuer and currency;
- the issuer is not globally frozen;
- the trust line is not frozen or deep-frozen;
- authorization is present when required by the issuer;
- remaining trust-line capacity is at least the entire two-slot Bill total.

### Payer account

- the account exists;
- the exact official RLUSD trust line exists;
- the spendable RLUSD balance is at least the primary amount;
- enough XRP remains available for reserve and transaction fee requirements.

A missing trust line, insufficient balance or capacity, freeze, authorization failure, unavailable validated-ledger data, or identity mismatch aborts the attempt while operations remain halted.

## Private operator material

The following values are private operational material and must not be committed, printed in public logs, placed in a public report, or copied into a pull request:

- Bill public, admin, and participant capability tokens;
- Xaman payload UUID, deep link, QR data, and websocket URL;
- Xaman API credentials and user push token;
- temporary Mainnet acceptance authorization token;
- callback bodies and signed transaction blobs.

The final transaction hash is public XRPL data and may appear in public-safe evidence after verification.

## Execution sequence

### 1. Confirm halted baseline

Verify `/api/status/payments` reports:

```text
network=mainnet
mode=halted
create=false
verify=false
```

Confirm the production-only D1 UUID and the reviewed internal release configuration.

### 2. Run the non-executing preflight

Validate the exact destination, payer, Destination Tag, canonical primary amount, official RLUSD identity, accepted XRP evidence, pending RLUSD evidence, isolated D1 binding, and halted production target.

The preflight must not deploy, create a Bill, create a Xaman payload, sign, submit, or write evidence.

### 3. Prepare production-only temporary targets

Generate ignored standalone Wrangler targets for:

```text
enabled
verify-only
halted
```

The generated targets must contain only `PAYMENTS_DB_MAINNET`, must exclude `preview_database_id` at every nesting level, and must preserve the reviewed Worker name, custom domain, Source Tag, internal release mode, Asset registry, and compatibility settings.

A random short-lived acceptance authorization value protects Bill creation, payload creation, and verification. Only its digest may be deployed. The raw value remains private and is destroyed after rollback.

Run Wrangler dry-run before any enabled deployment. A database mismatch, preview UUID, environment warning, unexpected binding, or configuration difference aborts the attempt.

### 4. Create the frozen Bill

Create one canonical Mainnet RLUSD Bill with two PaymentSlots:

- primary slot: the payment the operator will sign;
- replay-control slot: remains unpaid and is used only to prove cross-slot replay rejection.

Both slots use distinct capability tokens and InvoiceIDs. Each slot uses the same reviewed canonical amount. The Bill total is exactly twice the primary amount.

### 5. Create the private Xaman handoff

Create the Xaman request for the primary slot. The Payment must contain:

- exact destination and reviewed Destination Tag;
- an issued `Amount` with the exact official RLUSD currency, issuer, and decimal value;
- Source Tag `2171267705`;
- the primary slot InvoiceID;
- forced Mainnet network;
- submission enabled;
- a short expiration;
- no `SendMax`, `Paths`, or Partial Payment behavior.

Deliver the request privately. Do not publish the QR code, deep link, payload UUID, or websocket URL.

### 6. Participant review and signature

The payer verifies in Xaman:

- network is Mainnet;
- destination and Destination Tag are correct;
- Asset is RLUSD issued by the exact official issuer;
- amount matches the approved decimal value;
- the request is a direct issued-Asset Payment without pathfinding or partial payment.

The payer signs on their own device. Rejection or timeout fails the attempt and triggers rollback.

### 7. Independent verification and recording

The server independently retrieves the Xaman outcome and XRPL transaction and requires:

- validated ledger;
- `tesSUCCESS`;
- exact sender, destination, and Destination Tag;
- exact official RLUSD currency and issuer;
- exact requested and delivered values after canonical normalization;
- exact Source Tag and InvoiceID;
- no Partial Payment flag;
- no `SendMax` or `Paths`;
- unused network-scoped transaction identity.

The server records the receipt and updates the PaymentSlot and Bill atomically.

### 8. Negative controls

After the primary slot is recorded:

1. Repeat verification for the primary slot. The duplicate-settlement control passes when either:
   - the API rejects the repeat with HTTP `409` and `SLOT_ALREADY_PAID`; or
   - the API returns HTTP `200` with the same transaction identity, receipt identity, proof digest, and `receipt.status=existing`.
2. Submit the same transaction outcome against the replay-control slot. It must be rejected because the InvoiceID and slot identity differ.

Exactly one Mainnet RLUSD receipt may exist for the transaction. The replay-control slot must remain unpaid.

### 9. Mandatory rollback

Rollback runs regardless of success, failure, cancellation, or timeout. Deploy the standalone halted target and verify the public status endpoint reports creation and verification disabled.

Destroy generated Wrangler targets, temporary configuration, authorization values, capability tokens, and Xaman handoff material.

A test without verified rollback is failed even when the RLUSD transaction succeeded.

## Public-safe evidence report

A successful report contains only:

- schema version and Mainnet network;
- source commit and workflow or human-operated ceremony reference;
- generated timestamp;
- transaction hash and validated ledger index;
- `tesSUCCESS` result;
- exact official currency and issuer;
- expected canonical amount units and decimal value;
- receipt ID and proof digest;
- destination readiness confirmation;
- duplicate-settlement prevention and one-receipt confirmation;
- cross-slot replay rejection;
- halted restoration confirmation;
- sensitive-value exclusion confirmation.

The report must not mark `live-mainnet-rlusd-acceptance` accepted until every required field is present and rollback is verified.

## Failure handling

On any failure:

1. stop creating new Xaman requests;
2. restore halted operations;
3. verify the halted status endpoint;
4. preserve only public-safe diagnostics;
5. do not import partial evidence;
6. leave `live-mainnet-rlusd-acceptance` pending.

## Evidence import

Import a successful public-safe report in a separate reviewed pull request. That import may advance the release plan to `final-release-audit`, but it must not by itself authorize a public release or change the production Worker from internal and halted operation.
