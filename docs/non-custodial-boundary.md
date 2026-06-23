# XRPL Group Pay — Non-Custodial Boundary

**Status:** Draft for PR 1  
**Document class:** Public

## 1. Purpose

This document defines the capabilities XRPL Group Pay is designed to have and the capabilities it must never acquire without a new security and legal review.

## 2. Funds flow

```text
Participant-controlled XRPL account
               |
               | Participant reviews and signs
               v
      Bill creator XRPL account
```

XRPL Group Pay is not an intermediate recipient.

## 3. Signing boundary

The application may:

- Construct an unsigned XRP Payment template.
- Request that Xaman present the template to a user.
- Receive payload status notifications.
- Fetch the completed payload result.
- Fetch and verify a resulting transaction.

The application must not:

- Ask for a seed or private key.
- Store a seed or private key.
- Sign an XRPL transaction for a user.
- Approve a transaction without the user's wallet interaction.
- Pretend that creation of a Xaman payload is payment completion.

## 4. Submission boundary

The user approves or rejects the transaction in Xaman. Xaman may submit the signed transaction according to its service flow.

The Group Pay backend does not possess the payer's signing authority and cannot create a valid payer-signed Payment independently.

## 5. Custody boundary

The operator must not:

- Receive participant XRP into an operator wallet.
- Maintain pooled user funds.
- Maintain an application balance.
- Hold funds pending later distribution.
- Control an escrow on behalf of users in the initial product.
- Withdraw, sweep, or redirect user funds.
- Operate a recovery wallet for user payments.

## 6. Transaction destination

Every participant Payment must name the bill creator's configured XRPL address as `Destination`.

The application must show the destination in shortened and copyable form before wallet handoff. It must compare the validated transaction destination with the frozen bill destination.

## 7. No exchange or conversion

The initial product:

- Supports XRP only.
- Does not convert fiat to XRP.
- Does not convert XRP to fiat.
- Does not swap XRP for RLUSD or another token.
- Does not quote or guarantee a fiat value.
- Does not act as an exchange or broker.

An optional informational reference value must not be represented as a conversion offer and is outside the initial release.

## 8. No internal debt enforcement

The application records expected shares and verified payments. It does not:

- Legally determine that a participant owes a debt.
- Guarantee collection.
- Apply penalties.
- Debit a participant automatically.
- Recover funds.
- Resolve interpersonal disputes.
- Guarantee the accuracy of an off-chain expense description.

## 9. No operator refund guarantee

XRPL transactions are not reversed by editing application state.

The operator does not guarantee:

- Refunds.
- Cancellation after payment.
- Reimbursement for a wrong address approved by the payer.
- Reimbursement for price movements.
- Reimbursement for wallet or network failures.

A future refund-assistance feature, if any, would only prepare a new user-signed transaction. It would not reverse the original ledger entry.

## 10. Fee boundary

The initial product does not take a fee calculated as a percentage of the payment amount.

The payer remains responsible for the XRPL network fee displayed by the wallet.

Any later monetization model requires separate product, security, legal, and disclosure review.

## 11. Data boundary

The application may store the minimum data necessary to coordinate and verify a bill:

- Bill identifiers.
- Bill title.
- XRPL addresses.
- Participant labels.
- Expected drops.
- InvoiceID.
- Source Tag configuration reference.
- Xaman payload identifier and status.
- Transaction hash and verified transaction facts.
- Bill and payment-slot state.

The application must not put participant names, bill titles, email addresses, or detailed expense descriptions into XRPL Memos.

## 12. Capability URL boundary

The initial product may use unguessable capability URLs instead of user accounts.

Capabilities are separated:

- Participant payment.
- Read-only progress.
- Creator management.
- Public proof.

Possession of a participant URL must not grant management access. Possession of a proof URL must not allow a new payment or bill mutation.

## 13. Third-party boundaries

### Xaman

Xaman is responsible for presenting the request to the user, obtaining the user's wallet approval, signing, and its transaction-submission flow. Group Pay must independently verify the result.

### XRP Ledger infrastructure

XRPL nodes provide ledger data. Group Pay must use the expected network and handle temporary not-found, unvalidated, stale, or inconsistent responses safely.

### Hosting and database providers

Infrastructure providers may process application data. Secrets must be stored only in server-side secret facilities, and data retention must be documented.

## 14. Failure behavior

When any critical dependency is uncertain, the application fails closed:

- No payment request if configuration is incomplete.
- No paid state from a webhook alone.
- No paid state before validation.
- No paid state from an unexpected network.
- No paid state from a mismatched transaction.
- No automatic retry that changes the amount or destination.
- No silent substitution of a participant wallet.

## 15. Prohibited future changes without renewed review

The following changes require a new threat model, legal boundary review, data map, and release gate:

- Operator-controlled wallets.
- Custodial or pooled funds.
- Escrow.
- Automatic debit.
- Token swaps.
- Fiat on-ramp or off-ramp.
- Percentage-based payment fees.
- Private-key recovery.
- Operator-issued credit.
- Guaranteed refunds.
- Investment, fundraising, or yield features.
- Supporting assets other than XRP.
- On-chain storage of personal or detailed expense information.

## 16. Boundary test

A feature is outside the current boundary if the operator could, without a new wallet approval from the user:

1. Move user funds.
2. Change the recipient.
3. Change the amount.
4. Recover or redirect a payment.
5. Convert the asset.
6. Create a debt-enforcement consequence.

Such a feature must not be added as an ordinary incremental change.
