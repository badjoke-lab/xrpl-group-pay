# Xaman Mainnet Provider

XRPL Group Pay uses a network-scoped Xaman Provider. It creates a wallet handoff but does not prove that a payment reached a validated ledger.

## Network isolation

Each Provider is configured for one XRPL network.

- Testnet rejects Mainnet Payment Intents.
- Mainnet rejects Testnet Payment Intents.
- Testnet requests use `force_network: TESTNET`.
- Mainnet requests use `force_network: MAINNET`.
- The legacy Testnet helper rejects Mainnet slots.

Mainnet creation requires explicit gate access. Its Source Tag is resolved separately and cannot fall back to Testnet configuration.

## Asset validation

Immediately before payload construction, the Provider reparses the Payment Intent and compares its Asset with the canonical registry entry.

Mainnet permits only canonical XRP and official Mainnet RLUSD. Unknown Assets, arbitrary IOUs, modified descriptors, malformed intents, and network mismatches are rejected before the Provider API is called.

## Transaction construction

XRP uses a drops string in `Payment.Amount`. Official RLUSD uses an issued-currency object containing the exact currency, issuer, and fixed-precision value.

Both preserve the frozen destination, optional Destination Tag, network-specific Source Tag, PaymentSlot InvoiceID, and expected amount.

## Request persistence

Each wallet handoff stores its XRPL network and canonical Asset identity: Asset ID, Asset type, currency, and issuer when applicable. Database triggers reject missing or internally inconsistent identity fields.

## Verification boundary

Provider lifecycle states such as opened, signed, submitted, rejected, or expired describe only the handoff. They cannot mark a PaymentSlot paid.

Only a separate verifier that confirms the exact expected transaction on a validated XRPL ledger may produce a verified payment result. Mainnet remains blocked until its independent verifier and operational gates are completed.
