# Mainnet production target

XRPL Group Pay uses the following fixed Mainnet production origin:

```text
https://xgp.badjoke-lab.com
```

The Xaman application callback target is:

```text
https://xgp.badjoke-lab.com/api/xaman/callback
```

These values were committed before DNS or Worker routing was connected so application code, Xaman configuration, provider attestation, and Cloudflare deployment converge on one reviewed target.

## Current state

The production target and Xaman application are prepared, but the Worker is not deployed.

- Cloudflare custom-domain routing is not connected.
- Mainnet runtime access remains disabled in the committed configuration.
- Mainnet payment operations remain halted.
- The exact callback URL is configured in the Xaman application.
- Production Xaman provider attestation is accepted.
- The current release stage is `halted-deployment-review`.

The committed Mainnet configuration keeps:

```text
ALLOW_MAINNET_RUNTIME=false
MAINNET_GATE_APPROVED=false
MAINNET_SOURCE_TAG_APPROVED=false
MAINNET_RELEASE_MODE=disabled
MAINNET_OPERATIONS_MODE=halted
```

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

## Halted deployment sequence

The reviewed sequence from the current stage is:

1. generate the ephemeral Mainnet configuration from `config/mainnet-halted-deployment.json`;
2. build the Mainnet Worker with release mode `internal` and operations mode `halted`;
3. configure the Worker runtime values outside the repository;
4. deploy the Worker and connect `xgp.badjoke-lab.com` as its custom domain;
5. confirm the public origin and operations status endpoint are reachable over HTTPS;
6. confirm both payment creation and verification remain disabled;
7. confirm the callback route rejects unsigned input through its configured verification path;
8. upload a public-safe deployment report;
9. import the report in a separate reviewed pull request.

Deploying the halted Worker does not approve Mainnet payments. Live XRP acceptance, live RLUSD acceptance, and the final release audit remain separate controls.
