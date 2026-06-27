# Mainnet production target

XRPL Group Pay uses the following fixed Mainnet production origin:

```text
https://xgp.badjoke-lab.com
```

The Xaman application callback target is:

```text
https://xgp.badjoke-lab.com/api/xaman/callback
```

These values are committed before DNS or Worker routing is connected so application code, Xaman configuration, GitHub attestation, and Cloudflare deployment can converge on one reviewed target.

## Current state

The production target is prepared but not deployed.

- Cloudflare custom-domain routing is not connected.
- Mainnet runtime access remains disabled.
- Mainnet payment operations remain halted.
- The Xaman callback URL is not yet configured in the Xaman Developer Console.
- The GitHub Environment does not yet contain `MAINNET_XAMAN_CALLBACK_URL`.

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

## Deployment sequence

After this preparation is merged, the reviewed sequence is:

1. configure the Mainnet Worker runtime secrets `XAMAN_API_KEY` and `XAMAN_API_SECRET` outside the repository;
2. build and deploy the Mainnet Worker while release mode remains `disabled` and operations remain `halted`;
3. connect `xgp.badjoke-lab.com` to the deployed Worker in Cloudflare;
4. confirm the public origin and callback route are reachable over HTTPS;
5. configure the exact callback URL in the Xaman Developer Console;
6. add the same URL to the protected GitHub Environment as `MAINNET_XAMAN_CALLBACK_URL`;
7. run the guarded Mainnet Xaman provider attestation;
8. import the public-safe attestation result in a separate reviewed pull request.

Connecting the domain or deploying the halted Worker does not by itself approve Mainnet payments. Release configuration, live XRP acceptance, live RLUSD acceptance, and the final release audit remain separate controls.
