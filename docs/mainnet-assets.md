# XRPL Mainnet Settlement Assets

XRPL Group Pay keeps Mainnet Settlement Asset identity separate from release approval.

The canonical Mainnet registry is stored in `config/xrpl-mainnet-assets.json` and is checked during builds, validation, and Mainnet deployment.

## Approved identities

- XRP on XRPL Mainnet
- RLUSD on XRPL Mainnet with the exact official issuer and currency code recorded in the registry

## Fail-closed behavior

- Unknown Mainnet Asset IDs are rejected.
- Testnet Asset IDs cannot be selected through the Mainnet registry.
- Mainnet XRP must remain a native Asset with no issuer.
- Mainnet RLUSD must match the exact canonical issuer and 40-character currency code.
- Runtime access requires an explicit approved Mainnet gate object.
- Passing the Asset identity check does not enable Mainnet release; the remaining Mainnet gate checks must still pass.

## Maintenance

A registry identity change requires all of the following in one reviewed change:

1. Update the machine-readable registry.
2. Update the corresponding runtime constants.
3. Update exact-identity tests.
4. Re-run `pnpm check:mainnet-assets` and the complete validation suite.
5. Keep the overall Mainnet gate blocked unless every independent readiness check is complete.
