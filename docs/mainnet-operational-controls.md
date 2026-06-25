# Mainnet Operational Controls

XRPL Group Pay uses `MAINNET_OPERATIONS_MODE` as an independent runtime kill switch for Mainnet payment operations. It does not replace the Mainnet Gate, deployment approvals, network isolation, or validated-ledger verification.

## Modes

### `enabled`

- new wallet handoffs may be created;
- existing wallet handoffs may be verified and settled.

### `verify-only`

- new wallet handoffs are rejected;
- existing handoffs may still be verified and settled.

This mode is intended for controlled draining. It prevents new payment attempts while allowing payments that may already have been signed or submitted to reach a durable verified result.

### `halted`

- new wallet handoffs are rejected;
- verification and settlement requests are rejected.

This is the full incident-response stop.

## Fail-closed defaults

A Mainnet runtime with no `MAINNET_OPERATIONS_MODE` resolves to `halted`. Mainnet builds require the variable to be present explicitly. Invalid values and public/server network mismatches fail closed.

The committed Mainnet Wrangler environment is `halted`. Changing the Mainnet Gate or release mode does not implicitly enable payment operations.

Testnet behavior remains operational and does not depend on the Mainnet switch.

## Enforcement points

The switch is checked before external payment services are used.

- `/api/payments/payload` checks `create` before D1 access or Xaman handoff creation.
- `/api/payments/verify` checks `verify` before D1 access, Xaman status reads, XRPL node reads, or settlement writes.

A blocked operation returns HTTP `503`, `PAYMENT_OPERATIONS_HALTED`, `Cache-Control: no-store`, and a retry hint. A malformed operational configuration returns a generic unavailable response rather than exposing configuration details.

## Operational status

`GET /api/status/payments` returns a non-secret, no-store snapshot containing:

- deployment network;
- operational status;
- current mode;
- whether handoff creation is enabled;
- whether verification is enabled.

Invalid configuration returns HTTP `503` with both operations shown as disabled.

## Incident procedure

1. Set `MAINNET_OPERATIONS_MODE=verify-only` when new attempts must stop but submitted payments should continue to settle.
2. Set `MAINNET_OPERATIONS_MODE=halted` when all application-side Mainnet payment processing must stop.
3. Confirm `/api/status/payments` reports the intended state.
4. Investigate without changing frozen PaymentSlots, receipts, transaction identity, or ledger evidence.
5. Restore `enabled` only after the incident condition is resolved and the deployment configuration is reviewed.

The switch cannot reverse an XRPL transaction. It controls application handoff creation, ledger verification, and durable settlement processing.

## Release state

Passing the operational kill-switch check does not open Mainnet. The overall Mainnet Gate remains blocked until the final Mainnet acceptance audit is completed.
