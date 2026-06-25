# XRPL Recipient Readiness

Recipient readiness is a read-only, fail-closed check performed before a Settlement Asset can be considered payable to a destination account. It does not submit a transaction or enable Mainnet release.

## Validated-ledger checks

For XRP and issued Assets, Group Pay checks:

- the destination is an existing classic XRPL account;
- account data comes from a validated ledger;
- a required Destination Tag is present;
- Deposit Authorization is not blocking unknown payers.

For issued Assets such as RLUSD, Group Pay additionally checks:

- the issuer account exists;
- the issuer is not under Global Freeze;
- the destination has a trust line matching the exact issuer and currency code;
- the trust line is not frozen or deep-frozen;
- issuer authorization is present when Require Auth is enabled;
- the remaining trust-line limit can receive the frozen amount.

All amount-capacity comparisons use arbitrary-precision decimal normalization. The check does not use JavaScript floating-point arithmetic.

## Network isolation

The reader uses network-specific endpoint sets. Creating a default Mainnet reader requires explicit Mainnet gate approval. Mainnet Settlement Assets must also pass the exact Mainnet Asset registry check.

The built-in public endpoints are suitable as development and failover defaults. A production deployment should configure trusted XRPL infrastructure appropriate for sustained application traffic.

## Fail-closed behavior

Malformed, unvalidated, incomplete, or unavailable ledger responses never produce a ready result. Pagination is bounded. Unknown Assets, altered Asset descriptors, network mismatches, invalid addresses, and invalid amounts are rejected before ledger reads.

Deposit Authorization destinations remain blocked until payer-specific preauthorization checks are implemented. Passing recipient readiness alone does not open Mainnet payment creation; the independent Provider, verifier, operational, and acceptance gates must still pass.

## References

- XRPL `account_info`: https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/account_info
- XRPL `account_lines`: https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/account_lines
- XRPL trust line tokens: https://xrpl.org/docs/concepts/tokens/fungible-tokens/trust-line-tokens
- XRPL public servers: https://xrpl.org/docs/tutorials/public-servers
