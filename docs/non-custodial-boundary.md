# XRPL Group Pay — Non-Custodial Boundary

**Status:** Active  
**Scope:** Approved payment-lifecycle and Make Waves v1 boundary  
**Last reviewed:** 2026-07-01  
**Document class:** Public

## 1. Direct settlement

Payers review and approve settlement through their own wallet. XRP or official network-specific RLUSD moves directly from the payer account to the Bill's frozen recipient account. XRPL Group Pay is not an intermediate recipient.

Each payer settles an independent PaymentSlot. One payer failure does not reverse, pool, or redistribute another payer's verified Payment.

## 2. Role distinction

The product distinguishes:

- **Bill operator** — creates and manages one Bill;
- **recipient** — XRPL account that receives the Payments;
- **payer** — XRPL account that signs and sends one Payment;
- **application operator** — operates the XRPL Group Pay service.

A Bill operator may also be the recipient in representative mode or a payer in direct mode. This does not mean the application operator receives or controls the funds.

The interface must not describe the application as holding funds merely because the Bill operator and recipient may be the same person.

## 3. Payment modes

### Representative mode

Payers send directly to a representative recipient. A recipient-funded portion may exist as an accounting value with no transfer.

### Direct-recipient mode

Payers send directly to an external store, organizer, seller, or other recipient. The Bill operator may participate only as a normal payer with an explicit PaymentSlot.

In both modes, Group Pay remains outside the funds flow.

## 4. Payment Intent

The application may create a frozen Payment Intent, construct an unsigned XRPL Payment, ask a Wallet Provider to present it, receive lifecycle information, fetch the resulting transaction, and independently verify validated-ledger facts.

The provider and application must not alter the frozen network, asset, amount, recipient, tags, InvoiceID, expected payer, payment mode, or Bill revision behind an active handoff.

## 5. Wallet Provider

Xaman is the Make Waves v1 Wallet Provider. Future providers use the same Payment Intent boundary.

Provider identifiers, links, QR data, and status channels coordinate signing. They are not payment proof. A PaymentSlot becomes paid only after independent ledger verification.

A rejected, expired, signed, or submitted provider request does not authorize Group Pay to move funds or infer payment completion.

## 6. Asset boundary

Make Waves v1 supports:

- XRP on the selected XRPL network;
- official network-specific RLUSD on XRPL.

RLUSD is identified by network, exact currency code, and exact issuer. A display ticker alone is insufficient.

The application may prepare a wallet-reviewed TrustSet request and check recipient or payer readiness for official RLUSD. It cannot establish readiness without wallet approval and ledger confirmation or treat another issuer as RLUSD.

TrustSet assistance:

- is not the Bill Payment;
- does not transfer the Bill amount;
- does not fund the account with RLUSD;
- cannot bypass wallet approval;
- cannot add an arbitrary asset supplied through a shared URL.

## 7. Prohibited application-operator roles

The XRPL Group Pay service and its application operator do not:

- receive or pool settlement funds;
- maintain user balances;
- hold value for later distribution;
- control escrow;
- redirect Payments away from the frozen recipient;
- approve transactions for users;
- sign with a payer or recipient key;
- swap or bridge assets;
- operate fiat entry or exit services;
- guarantee refunds, collection, redemption, recovery, or asset value;
- mark an unverified or mismatched transaction paid by administrative choice.

## 8. Accounting and recipient-funded amount

A recipient-funded amount is accounting data for representative mode. It creates no PaymentSlot, Payment Intent, application balance, or self-transfer.

A future Bill may use JPY, USD, KRW, EUR, or another approved Accounting Currency while settlement uses a supported asset. Accounting denomination records an off-chain obligation; it does not mean Group Pay receives or transfers fiat.

A future Settlement Quote may disclose a proposed Settlement Amount. A quote is coordination data and cannot move funds.

## 9. Recipient, fees, and readiness

Every Payment names the Bill's frozen recipient. The recipient is shown before Wallet Handoff and verified on-ledger.

The payer is responsible for network fees shown by the wallet. For RLUSD, the settlement amount and the XRP fee and reserve requirements are presented separately.

Readiness checks are informational and fail-closed. They do not guarantee later issuer, wallet, node, or network availability.

## 10. Failure, retry, and closure

- Group Pay never reverses a verified Payment because another payer failed.
- Automatic refund and group rollback are prohibited.
- An uncertain submitted Payment blocks a replacement until it is resolved or reviewed.
- A mismatched transaction with possible value movement is review-required, not automatically retryable.
- Closing a Bill incomplete stops new handoffs but preserves every verified receipt.
- Copy-to-revise creates a new Bill and never rewrites the old Bill or receipt history.

## 11. Data and capability boundary

The application stores only data required to coordinate, verify, audit, and present settlement. This may include Bill and PaymentSlot identifiers, mode, recipient-funded amount, asset identity, obligation and settlement amounts, addresses, tags, InvoiceID, provider state, validated transaction facts, Receipt Contract version, locale, readiness state, review state, and later quote audit facts.

User-entered Bill or payer details are not placed in XRPL Memos.

Participant payment, read-only progress, Bill management, recipient-readiness, Guide, and public proof access remain separate.

- Locale switching cannot broaden a capability.
- Guide links cannot contain capability values, draft values, or payer data.
- Proof access cannot initiate a Payment or mutate a Bill.
- A recipient-readiness capability cannot reveal Bill-management or participant-payment capability material.

## 12. External services

Wallet Providers coordinate wallet approval. XRPL nodes provide ledger data. Issued assets depend on their issuers. Hosting services process minimized application data. Group Pay verifies configured identity and observed facts but does not control third-party policy or availability.

## 13. Fail-closed behavior

No Wallet Handoff or paid state is produced when network, asset, issuer, amount, recipient, provider binding, readiness, or validated-ledger facts are uncertain.

A retry cannot silently change frozen conditions. A new Bill is required to change the payment mode, recipient, payer, amount, network, asset, tag, or InvoiceID.

## 14. Boundary review trigger

A renewed review is required before introducing application-held funds, automatic debits, escrow, automatic swaps or bridges, on/off-ramp services, application settlement accounts, guaranteed recovery, arbitrary unreviewed assets, personal expense information on-chain, administrator-created proof of payment, or any feature that weakens direct payer-to-recipient settlement.

Adding a reviewed Wallet Provider, non-custodial asset, or Payment Rail requires its own compatibility and verification review while preserving this boundary.
