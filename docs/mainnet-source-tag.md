# XRPL Source Tag Isolation

XRPL Group Pay resolves Source Tags by network and does not reuse a Testnet fallback for Mainnet.

## Testnet

Testnet payment creation accepts `XRPL_TESTNET_SOURCE_TAG`. The legacy `XRPL_SOURCE_TAG` variable remains a compatibility fallback only for Testnet.

## Mainnet assignment

The dedicated Mainnet Source Tag is assigned in `config/mainnet-source-tag.json`.

```text
Decimal:   2171267705
Hex:       0x816AEA79
Namespace: xrpl-group-pay|badjoke-lab/xrpl-group-pay|mainnet|source-tag|v1
```

The value is derived deterministically:

1. calculate SHA-256 over the exact UTF-8 namespace;
2. read the first four digest bytes as an unsigned big-endian integer;
3. set the high bit so the value remains in the application-reserved range `2147483648..4294967295`.

The full digest is:

```text
816aea79da2edec33a1872295d5e9f631f1e33e9aca3cb46c7152736470f9ab0
```

This gives an auditable assignment without relying on a mutable external registry or a human-selected round number.

## Assignment is not approval

The assigned value is committed to the Mainnet Wrangler target, but the following safety state remains unchanged:

- `MAINNET_SOURCE_TAG_APPROVED=false`
- `MAINNET_GATE_APPROVED=false`
- `ALLOW_MAINNET_RUNTIME=false`
- `MAINNET_RELEASE_MODE=disabled`
- `MAINNET_OPERATIONS_MODE=halted`

Recording the value therefore does not permit a Mainnet build or payment operation. Approval remains a separate reviewed release step.

## Mainnet runtime requirements

Mainnet requires all of the following:

- `XRPL_MAINNET_SOURCE_TAG` set to the assigned UInt32 value;
- `MAINNET_SOURCE_TAG_APPROVED=true`;
- `MAINNET_GATE_APPROVED=true`;
- the other Mainnet build and runtime controls.

The Mainnet resolver never falls back to `XRPL_SOURCE_TAG` or `XRPL_TESTNET_SOURCE_TAG`.

## Validation

`pnpm check:mainnet-source-tag` verifies:

- the namespace, digest, decimal value, and hexadecimal value match;
- the value remains inside the documented high-bit range;
- the Mainnet Wrangler value matches the assignment record;
- Mainnet runtime, gate, Source Tag approval, release mode, and operations remain closed;
- the Mainnet-only variables do not appear in the top-level or Testnet targets;
- pending or accepted release evidence remains consistent with the assignment.

## Deployment behavior

- Mainnet builds fail when the dedicated Source Tag is missing, malformed, mismatched, or unapproved.
- Mainnet runtime target resolution fails under the same conditions.
- Cloudflare bindings override stale process values consistently.
- The committed Mainnet Worker target keeps Source Tag approval disabled by default.
