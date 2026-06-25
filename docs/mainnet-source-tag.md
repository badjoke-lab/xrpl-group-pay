# XRPL Source Tag Isolation

XRPL Group Pay resolves Source Tags by network and does not reuse a Testnet fallback for Mainnet.

## Testnet

Testnet payment creation accepts `XRPL_TESTNET_SOURCE_TAG`. The legacy `XRPL_SOURCE_TAG` variable remains a compatibility fallback only for Testnet.

## Mainnet

Mainnet requires all of the following:

- `XRPL_MAINNET_SOURCE_TAG` set to a UInt32 value
- `MAINNET_SOURCE_TAG_APPROVED=true`
- `MAINNET_GATE_APPROVED=true`
- the other Mainnet build and runtime controls

The Mainnet resolver never falls back to `XRPL_SOURCE_TAG` or `XRPL_TESTNET_SOURCE_TAG`.

## Deployment behavior

- Mainnet builds fail when the dedicated Source Tag is missing, malformed, or unapproved.
- Mainnet runtime target resolution fails under the same conditions.
- Cloudflare bindings override stale process values consistently.
- The committed Mainnet Worker target keeps Source Tag approval disabled by default.
- The Source Tag value is deployment configuration and is not committed to the repository.
