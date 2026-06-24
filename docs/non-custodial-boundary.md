# XRPL Group Pay — Non-Custodial Boundary

**Status:** Active  
**Scope:** Approved Make Waves v1 boundary  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Direct settlement

Participants review and approve settlement through their own wallet. XRP or official network-specific RLUSD moves directly from the participant account to the Bill destination. XRPL Group Pay is not an intermediate recipient.

## 2. Payment Intent

The application may create a frozen Payment Intent, construct an unsigned XRPL Payment, ask a Wallet Provider to present it, receive lifecycle information, fetch the resulting transaction, and independently verify validated-ledger facts.

The provider and application must not alter the frozen network, asset, amount, destination, tags, InvoiceID, expected payer, or Bill revision behind an active handoff.

## 3. Wallet Provider

Xaman is the Make Waves v1 Wallet Provider. Future providers use the same Payment Intent boundary.

Provider identifiers, links, QR data, and status channels coordinate signing. They are not payment proof. A PaymentSlot becomes paid only after independent ledger verification.

## 4. Asset boundary

Make Waves v1 supports:

- XRP on the selected XRPL network;
- official network-specific RLUSD on XRPL.

RLUSD is identified by network, exact currency code, and exact issuer. A display ticker alone is insufficient.

The application may prepare a wallet-reviewed TrustSet request and check recipient readiness for official RLUSD. It cannot establish readiness without wallet approval or treat another issuer as RLUSD.

## 5. Prohibited operator roles

The operator does not:

- receive or pool settlement funds;
- maintain user balances;
- hold value for later distribution;
- control escrow;
- redirect payments;
- approve transactions for users;
- swap or bridge assets;
- operate fiat entry or exit services;
- guarantee refunds, collection, redemption, or asset value.

## 6. Accounting Currency

A future Bill may use JPY, USD, KRW, EUR, or another approved Accounting Currency while settlement uses a supported asset. Accounting denomination records an off-chain obligation; it does not mean Group Pay receives or transfers fiat.

A future Settlement Quote may disclose a proposed Settlement Amount. A quote is coordination data and cannot move funds.

## 7. Destination and fees

Every payment names the Bill's frozen destination. The destination is shown before wallet handoff and verified on-ledger.

The payer is responsible for network fees shown by the wallet. For RLUSD, the settlement amount and the XRP network fee are presented separately.

## 8. Data boundary

The application stores only the data required to coordinate, verify, audit, and present settlement. This may include Bill and PaymentSlot identifiers, asset identity, obligation and settlement amounts, addresses, tags, InvoiceID, provider request state, validated transaction facts, Receipt Contract version, locale, and later quote audit facts.

User-entered Bill or participant details are not placed in XRPL Memos.

## 9. Capabilities

Participant payment, read-only progress, creator management, and public proof capabilities remain separate. Locale switching cannot broaden or expose a capability. Proof access cannot initiate a payment or mutate a Bill.

## 10. External services

Wallet Providers coordinate wallet approval. XRPL nodes provide ledger data. Issued assets depend on their issuers. Hosting services process minimized application data. Group Pay verifies configured identity and observed facts but does not control third-party policy or availability.

## 11. Fail-closed behavior

No wallet handoff or paid state is produced when network, asset, issuer, amount, destination, provider binding, recipient readiness, or validated-ledger facts are uncertain. A retry cannot silently change frozen conditions.

## 12. Boundary review trigger

A renewed review is required before introducing operator-held funds, automatic debits, escrow, automatic swaps or bridges, on/off-ramp services, operator-settlement accounts, guaranteed recovery, arbitrary unreviewed assets, or personal expense information on-chain.

Adding a reviewed Wallet Provider, non-custodial asset, or Payment Rail requires its own compatibility and verification review while preserving direct payer-to-recipient settlement.
