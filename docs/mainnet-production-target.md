# Mainnet production target

XRPL Group Pay uses the following fixed Mainnet production origin:

```text
https://xgp.badjoke-lab.com
```

The Xaman application callback target is:

```text
https://xgp.badjoke-lab.com/api/xaman/callback
```

These values keep application code, Xaman configuration, provider attestation, Cloudflare deployment, and release evidence aligned to one reviewed target.

## Current state

The production Worker is deployed as an internal target and payment operations remain halted.

- Cloudflare custom-domain routing is connected.
- The Worker uses the isolated `PAYMENTS_DB_MAINNET` binding.
- Mainnet runtime and Source Tag configuration were reviewed for the internal target.
- Mainnet payment creation and verification remain halted.
- The exact callback URL is configured in the Xaman application.
- Production Xaman provider attestation is accepted.
- Halted deployment evidence is accepted.
- The current release stage is `live-xrp-acceptance`.
- The final release decision remains blocked.

The committed Mainnet configuration is:

```text
ALLOW_MAINNET_RUNTIME=true
MAINNET_GATE_APPROVED=true
MAINNET_SOURCE_TAG_APPROVED=true
MAINNET_RELEASE_MODE=internal
MAINNET_OPERATIONS_MODE=halted
```

These values make the reviewed internal target reachable. They do not authorize a public release or enable payment operations.

## Bill network boundary

Bill creation resolves the deployment network and D1 binding together. A Mainnet Worker accepts only explicitly identified Mainnet XRP or official Mainnet RLUSD Assets and stores the frozen Bill with `network=mainnet`.

Legacy XRP input remains Testnet-only. A Testnet Asset cannot be stored in the Mainnet database, and a Mainnet Asset cannot be stored in the Testnet database.

## Callback boundary

`POST /api/xaman/callback` accepts only JSON callbacks carrying Xaman's documented timestamp and HMAC signature headers.

The route:

- limits request size;
- verifies the HMAC-SHA1 callback signature with the server-side Xaman application secret;
- validates application and payload identifiers;
- returns a minimal `200` acknowledgement;
- does not echo callback data;
- does not persist user tokens, signed blobs, transaction hashes, or callback bodies;
- does not mark a PaymentSlot paid;
- does not submit an XRPL transaction.

A callback is a notification trigger, not payment proof. Payment completion remains dependent on the independent validated-ledger verifier.

## Next controlled stage

The next stage is a separately guarded live XRP acceptance test. It must:

1. create a frozen Mainnet XRP Bill and PaymentSlot in `PAYMENTS_DB_MAINNET`;
2. temporarily enable only the controlled payment path;
3. create a Mainnet Xaman handoff;
4. require a participant-controlled signature;
5. verify the resulting validated-ledger transaction independently;
6. record the durable receipt and atomic Bill progress update;
7. verify duplicate and replay rejection;
8. restore the Worker to `MAINNET_OPERATIONS_MODE=halted`;
9. publish only a public-safe evidence report.

Live RLUSD acceptance and the final release audit remain separate later stages.
