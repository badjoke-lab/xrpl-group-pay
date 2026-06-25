# Mainnet RLUSD Verifier

XRPL Group Pay verifies RLUSD only as a canonical, network-scoped XRPL Asset. A generic issued-currency object is not sufficient.

## Canonical Mainnet identity

The supported Mainnet Asset is fixed to:

- Asset ID: `xrpl:mainnet:rlusd`
- Currency: `524C555344000000000000000000000000000000`
- Issuer: `rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De`
- Verification strategy: `xrpl-issued-asset-v1`
- Receipt contract: `xrpl-issued-payment-v1`
- Application allocation scale: 6

The issuer is checked against Ripple's published RLUSD token address documentation. Testnet and Mainnet issuer identities are not interchangeable.

## Verification boundary

Before inspecting ledger values, the verifier compares the complete Payment Intent Asset descriptor with the canonical registry entry for the selected network. Modified Asset IDs, issuers, currency codes, precision, symbols, strategies, and receipt contracts fail closed.

The validated ledger transaction must then satisfy every issued-payment check:

- the returned transaction hash matches the provider transaction ID;
- `validated` is true;
- `meta.TransactionResult` is `tesSUCCESS`;
- the transaction type is `Payment`;
- the sender matches the frozen expected payer;
- the destination matches the frozen Bill destination;
- Partial Payment is not enabled;
- `SendMax` and `Paths` are absent;
- exactly one requested issued Amount is present;
- requested currency and issuer match official RLUSD exactly;
- requested decimal value converts to the frozen application units exactly;
- delivered currency and issuer match official RLUSD exactly;
- delivered decimal value converts to the frozen application units exactly;
- Source Tag matches exactly;
- Destination Tag presence and value match exactly;
- InvoiceID matches the PaymentSlot-specific InvoiceID.

The verifier accepts equivalent XRPL decimal representations, such as `1.25`, `1.250000`, and `125e-2`, only when they normalize to the exact frozen integer units.

## Arbitrary IOU rejection

The issued-payment strategy is routed through the canonical RLUSD verifier. An arbitrary XRPL IOU cannot opt into the RLUSD verification strategy merely by copying its strategy identifier or symbol.

Requested or delivered values that use the Testnet issuer on Mainnet, another issuer, another currency, or a native XRP amount shape are rejected.

## Durable settlement

A verified Mainnet RLUSD payment uses the generic issued-Asset settlement path. Receipt identity is `mainnet:<transactionId>`. The verified payment record stores the exact Asset ID, issuer, currency, scale, requested units, delivered units, InvoiceID, and verification digest.

Receipt insertion, PaymentSlot settlement, and Bill progress are updated in one database batch. A conflicting transaction cannot replace the transaction already accepted for a PaymentSlot.

## Mainnet release state

Completing the Mainnet RLUSD verifier does not open Mainnet. The overall Mainnet Gate remains blocked while operational safeguards and the final Mainnet acceptance audit are pending.
