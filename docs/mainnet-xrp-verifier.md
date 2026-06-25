# Mainnet XRP Verifier

XRPL Group Pay accepts an XRP payment as verified only after the exact expected transaction is confirmed on a validated XRPL ledger. Wallet-provider lifecycle status is not payment proof.

## Network isolation

Transaction reads are scoped to one XRPL network.

- Testnet uses Testnet endpoints only.
- Mainnet uses Mainnet endpoints only.
- Mainnet transaction reads require explicit Mainnet Gate approval.
- A PaymentSlot whose network differs from the deployment network is rejected before ledger verification.
- Missing, malformed, unavailable, or conflicting node responses fail closed.

The transaction hash namespace is also network-scoped. Receipt and idempotency identities use `<network>:<transactionId>`.

## Exact XRP checks

The verifier requires all of the following:

- the transaction response is from the selected network reader;
- `validated` is true;
- the returned hash matches the submitted transaction ID;
- `meta.TransactionResult` is `tesSUCCESS`;
- the transaction type is `Payment`;
- the sender matches the frozen expected payer;
- the destination matches the frozen Bill destination;
- the payment is native XRP rather than an issued Asset;
- the requested drops match exactly;
- the delivered drops match exactly;
- Partial Payment is not enabled;
- cross-currency fields are absent;
- Source Tag matches exactly;
- Destination Tag presence and value match exactly;
- InvoiceID matches the PaymentSlot-specific InvoiceID.

Any mismatch produces a failed verification outcome and cannot mark the PaymentSlot paid.

## Durable settlement

A verified Mainnet XRP proof is written using the existing atomic settlement boundary. The receipt, PaymentSlot state, and Bill progress are updated together. Database uniqueness constraints prevent the same network transaction or InvoiceID from being accepted twice.

An exact retry may return the existing immutable receipt. A different transaction cannot replace a transaction already accepted by the PaymentSlot.

## Independent RLUSD gate

This verifier opens native Mainnet XRP verification only. Mainnet issued-Asset verification, including official RLUSD, remains explicitly blocked until the independent Mainnet RLUSD verifier gate is completed.

## Mainnet release state

Completing the Mainnet XRP verifier does not open Mainnet. The overall Mainnet Gate remains blocked while RLUSD verification, data isolation, operational safeguards, launch controls, and the final acceptance audit are pending.
