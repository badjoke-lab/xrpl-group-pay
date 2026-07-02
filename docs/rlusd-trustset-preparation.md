# XRPL Group Pay — Official RLUSD TrustSet Preparation

**Status:** Active  
**Scope:** PR #137 capability link, TrustSet handoff, and validated-ledger readiness contract  
**Last reviewed:** 2026-07-02  
**Document class:** Public

## 1. Purpose

XRPL Group Pay can create a shareable preparation link for a recipient or payer who must establish sufficient official RLUSD trust-line capacity.

The preparation route is:

```text
/rlusd/prepare#token=<preparation capability>
```

The capability remains in the URL fragment. The browser sends it to the application only in a POST body when loading, starting, or checking the preparation.

## 2. TrustSet is not a Payment

TrustSet:

- creates or updates an XRPL trust line;
- does not transfer the Bill amount;
- does not purchase RLUSD;
- does not fund the wallet;
- does not mark any PaymentSlot paid;
- does not create a payment Receipt;
- still requires XRP for the network fee and, when a trust line is new, account reserve.

TrustSet persistence and Payment persistence are separate.

## 3. Frozen preparation facts

A preparation freezes:

- network;
- purpose: recipient or payer;
- target classic account;
- canonical RLUSD Asset ID;
- canonical network-specific currency and issuer;
- required amount units and precision;
- calculated trust-limit units and decimal value;
- preparation capability hash.

The client cannot submit a different issuer, currency, network, account, or trust limit.

## 4. Planning

Before creating a shareable link, the server reads validated XRPL state and classifies the request.

### 4.1 No TrustSet required

A preparation is recorded as `not_required` when the existing official RLUSD trust line already has the required capacity and is not blocked by freeze or authorization conditions.

### 4.2 TrustSet required

A preparation is recorded as `required` when:

- the official trust line is missing; or
- its current limit is below the required capacity.

For a recipient, the planned limit preserves existing positive balance and adds the amount expected to be received.

For a payer, the planned limit is at least the amount the wallet may need to hold.

### 4.3 Blocked

The server does not offer TrustSet as a false fix for:

- missing account;
- missing issuer account;
- issuer Global Freeze;
- frozen or deep-frozen trust line;
- required authorization not granted by the issuer;
- malformed trust-line data;
- insufficient XRP for the future reserve and estimated fee.

Temporary validated-ledger read failure is `unavailable`, not a confirmed block.

## 5. TrustSet transaction contract

The transaction uses:

```text
TransactionType: TrustSet
Account: frozen target account
LimitAmount.currency: canonical RLUSD currency
LimitAmount.issuer: canonical network-specific RLUSD issuer
LimitAmount.value: server-calculated frozen limit
Flags: tfSetNoRipple
Sequence: validated account sequence
LastLedgerSequence: bounded validated-ledger window
```

The Xaman payload is forced to the preparation network, expires after a short signing window, and requests submission.

No arbitrary transaction fields are accepted from the browser.

## 6. Xaman lifecycle

Preparation states are:

```text
not_required
required
handoff_created
awaiting_signature
rejected
expired
submitted
verifying
ready
failed
```

Detailed Xaman provider state is stored separately:

```text
created
available
opened
signed
submitted
rejected
expired
failed
```

Rejection and expiry may create a new canonical handoff. A signed or submitted observation is not replaced only because the original QR window elapsed.

## 7. Provider payload verification

A Xaman status response is rejected if its transaction template does not match the frozen preparation, including:

- transaction type;
- target account;
- RLUSD currency;
- RLUSD issuer;
- trust-limit value;
- No Ripple flag.

A provider-reported transaction identifier is recorded for status and troubleshooting but is not sufficient to mark readiness.

## 8. Validated-ledger readiness

After Xaman reports submission, the preparation moves to `submitted` or `verifying`.

It becomes `ready` only when validated XRPL account-lines data shows:

- the exact official network-specific RLUSD issuer and currency;
- no freeze or deep-freeze block;
- required issuer authorization where applicable;
- a trust-line limit equal to or greater than the frozen planned limit.

Until then, the UI remains in a checking state. This avoids treating Xaman completion as ledger completion.

## 9. Localization and UI

The shareable preparation page provides English, Japanese, and Korean copy together.

It must always explain:

- this is not a Payment;
- no Bill amount moves;
- RLUSD is not purchased or deposited;
- XRP is required for fees and reserve;
- the official issuer, network, account, and trust limit must be reviewed before signing.

## 10. Privacy and capability boundary

- raw preparation capabilities are never stored;
- only capability hashes are persisted;
- preparation pages are excluded from search indexing;
- capability values are not placed in query parameters;
- payment capabilities and preparation capabilities are not interchangeable;
- public proof does not expose preparation records.

## 11. Deployment

Migration `0017_rlusd_trustset_preparations.sql` must be applied to the target D1 database before deploying code that reads the preparation table.

Automated tests must never submit an uncontrolled real-value Mainnet TrustSet.
