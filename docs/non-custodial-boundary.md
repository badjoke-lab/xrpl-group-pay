# XRPL Group Pay — Non-Custodial Boundary

**Status:** Active  
**Scope:** Approved Make Waves v1 and extension safety boundary  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Purpose

This document defines the capabilities XRPL Group Pay may have and the capabilities it must not acquire without a new security, legal, privacy, and operational review.

## 2. Funds flow

```text
Participant-controlled wallet
          |
          | participant reviews and signs
          v
Bill creator-controlled destination
```

XRPL Group Pay is not an intermediate recipient.

For Make Waves v1, funds move directly as XRP or official network-specific RLUSD on XRPL.

## 3. Signing boundary

The application may:

- create a wallet-neutral Payment Intent from frozen server state;
- build an unsigned XRP or approved XRPL issued-asset Payment template;
- ask a Wallet Provider to present the exact intent;
- receive provider lifecycle notifications;
- fetch a provider result and submitted transaction identifier;
- fetch and independently verify the resulting ledger transaction;
- prepare a user-signed TrustSet request where an approved readiness flow requires it.

The application must not:

- request or store a seed, secret, or signing key;
- sign an XRPL transaction for a user;
- approve a transaction without wallet interaction;
- treat Wallet Provider success as verified payment;
- change the destination, asset, amount, tags, InvoiceID, or network behind an existing signing opportunity;
- silently substitute another Wallet Provider account.

## 4. Wallet Provider boundary

Xaman is the Make Waves v1 Wallet Provider. Future providers are adapters behind the same Payment Intent contract.

A provider is responsible for presenting the request, obtaining wallet approval, signing through the user's wallet, and returning lifecycle or submission information according to its integration.

Group Pay remains responsible for comparing the validated transaction with the frozen Payment Intent.

Provider-specific identifiers, links, QR data, and status channels are coordination data, not settlement evidence.

## 5. Custody boundary

The operator must not:

- receive participant settlement funds into an operator wallet;
- maintain pooled user funds;
- maintain an application balance;
- hold funds for later distribution;
- control an escrow for users in the approved product scope;
- withdraw, sweep, or redirect user funds;
- operate a recovery wallet for user payments;
- hold fiat on behalf of creators or participants;
- automatically bridge or swap assets.

## 6. Transaction destination

Every participant Payment must name the Bill's frozen destination account.

The application must show the destination before wallet handoff and compare the validated transaction destination with the frozen Bill destination.

A future multi-rail implementation may use rail-specific destination formats, but the direct payer-to-recipient rule remains unchanged.

## 7. Supported assets

Make Waves v1 supports:

- XRP on the selected XRPL network;
- official network-specific RLUSD on XRPL.

RLUSD is identified by exact network, currency code, and issuer. A ticker alone is never sufficient.

The application may construct and verify direct payments in these assets. This does not authorize Group Pay to exchange, sell, redeem, custody, bridge, or guarantee their value.

## 8. No automatic exchange or conversion

The application does not:

- convert fiat to XRP or RLUSD;
- convert XRP or RLUSD to fiat;
- swap XRP for RLUSD or another token;
- bridge assets between networks;
- guarantee a fiat value;
- act as an exchange, broker, money transmitter, or liquidity provider.

A future Settlement Quote may calculate and disclose a proposed asset amount for an obligation denominated in another currency. The quote is coordination data. It is not an exchange offer and does not move funds.

Any automatic swap, bridge, on-ramp, off-ramp, or operator-executed conversion remains outside the approved boundary.

## 9. Accounting Currency boundary

A future Bill may be denominated in JPY, USD, KRW, EUR, or another approved Accounting Currency while settlement occurs in a supported asset.

Accounting denomination does not mean the application holds, receives, or transfers fiat. It records an off-chain obligation and a disclosed Settlement Quote.

## 10. RLUSD readiness boundary

RLUSD may require an XRPL trust line and XRP for account reserve and network fees.

The application may:

- check whether the frozen recipient can receive the official RLUSD asset;
- explain missing readiness;
- prepare a user-reviewed TrustSet request;
- re-check readiness before freezing or payment.

The application must not:

- create a trust line without user wallet approval;
- treat a similarly named asset from another issuer as RLUSD;
- guarantee that an issuer, wallet, or network will remain available;
- hide issuer, freeze, authorization, or fee conditions that affect payment.

## 11. No internal debt enforcement

The application coordinates expected obligations and verified settlement. It does not:

- make a legal determination that a participant owes a debt;
- guarantee collection;
- apply penalties;
- debit a participant automatically;
- recover funds;
- resolve interpersonal disputes;
- guarantee an off-chain expense description;
- guarantee a quote or market value after its stated expiry.

## 12. No operator refund guarantee

Ledger transactions are not reversed by editing application state.

The operator does not guarantee:

- refunds;
- cancellation after payment;
- reimbursement for a destination approved by the payer;
- reimbursement for asset-value changes;
- reimbursement for wallet, issuer, node, or network failure.

A future refund-assistance feature may prepare a new user-signed transaction. It cannot reverse the original ledger entry.

## 13. Fee boundary

The Make Waves v1 product does not take a percentage of settlement amounts.

The payer remains responsible for network fees shown by the wallet. RLUSD payment amount and XRP network fee are presented separately.

Any monetization change requires a separate product, disclosure, security, and legal review.

## 14. Data boundary

The application may store the minimum data required to coordinate and verify settlement, including:

- Bill and PaymentSlot identifiers;
- Bill title and optional participant labels;
- network and payment rail;
- Accounting Currency and obligation units;
- Settlement Asset identity, including issuer when applicable;
- frozen Settlement Amount;
- XRPL addresses and tags;
- InvoiceID;
- Wallet Provider request identifier and lifecycle state;
- transaction hash and normalized verified facts;
- Receipt Contract version;
- Bill and PaymentSlot state;
- locale preference;
- future quote facts required for audit.

The application must not put participant names, Bill titles, contact details, or detailed expense descriptions into XRPL Memos.

## 15. Capability boundary

The product may use high-entropy capability URLs instead of user accounts.

Capabilities remain separated:

- participant payment;
- read-only progress;
- creator management;
- public proof.

Changing locale must not expose or broaden a capability. A proof identifier cannot create a payment or mutate a Bill.

## 16. Third-party boundaries

### Wallet Providers

Wallet Providers present and sign requests through user-controlled wallets. Group Pay independently verifies ledger results.

### XRP Ledger infrastructure

XRPL nodes provide ledger and account data. Group Pay must query the expected network and handle not-found, unvalidated, stale, incomplete, or inconsistent responses safely.

### Asset issuers

An issued asset depends on its issuer. Group Pay verifies configured identity and observed ledger facts but does not control issuer policies, redemption, freeze, authorization, or continued operation.

### Hosting and database providers

Infrastructure providers may process application data. Secrets remain in server-side facilities and retention is documented.

### Future quote sources

Quote sources provide informational inputs. A source response is validated, timestamped, and disclosed. It cannot move user funds.

## 17. Failure behavior

When a critical dependency or fact is uncertain, the application fails closed:

- no Payment Intent if configuration is incomplete;
- no wallet handoff for an unsupported asset or provider;
- no RLUSD Bill freeze when recipient readiness is blocking;
- no paid state from a webhook or provider response alone;
- no paid state before ledger validation;
- no paid state from another network, currency, issuer, amount, sender, or destination;
- no automatic retry that changes frozen conditions;
- no silent quote replacement;
- no silent participant-wallet substitution.

## 18. Changes requiring renewed review

The following require a new threat model, legal-boundary review, privacy map, and release gate:

- operator-controlled wallets;
- custodial or pooled funds;
- escrow;
- automatic debit;
- automatic token swaps or bridges;
- fiat on-ramp or off-ramp;
- percentage-based payment fees;
- signing-key recovery;
- operator-issued credit;
- guaranteed refunds;
- investment, fundraising, lending, or yield features;
- unreviewed arbitrary assets;
- on-chain storage of personal or detailed expense information;
- automatic asset conversion on behalf of users.

Adding an approved non-custodial asset, Wallet Provider, or Payment Rail still requires its specific threat, privacy, verification, and compatibility review, but does not by itself change the direct-payment custody boundary.

## 19. Boundary test

A feature is outside the approved boundary if the operator could, without a new explicit wallet approval from the affected user:

1. move user funds;
2. change the recipient;
3. change the asset or amount;
4. recover or redirect a payment;
5. execute a conversion or bridge;
6. create a debt-enforcement consequence;
7. sign or approve a transaction;
8. replace a participant's wallet account.

Such a feature must not be added as an ordinary incremental change.
