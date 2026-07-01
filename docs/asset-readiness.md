# XRPL Group Pay — Asset Readiness

**Status:** Active  
**Scope:** PR #136 read-only recipient and payer preflight contract  
**Last reviewed:** 2026-07-02  
**Document class:** Public

## 1. Contract

The readiness strategy is:

```text
xrpl-asset-readiness-v1
```

It returns structured facts for either the `recipient` or `payer` role:

```text
status: ready | blocked | unavailable
ready: boolean
checks: stable machine-readable codes
blockingCode: confirmed blocking condition or null
unavailableCode: temporary data failure or null
userMessageKey: localization key, not raw provider copy
observedAt: observation timestamp
facts: non-authoritative observed balances and requirements
```

Readiness is read-only. It does not create a transaction, create a Xaman handoff, mark a Payment paid, or enable Mainnet operations.

## 2. Recipient checks

Recipient readiness preserves the existing validated-ledger checks:

- account existence;
- required Destination Tag;
- Deposit Authorization;
- exact official network-specific RLUSD issuer and currency;
- issuer Global Freeze;
- trust-line existence, freeze, deep-freeze, and authorization;
- remaining trust-line receive capacity for the frozen amount.

## 3. Payer checks

Payer readiness checks:

- account existence on a validated ledger;
- XRP balance and OwnerCount;
- current validated account reserve;
- current base, minimum, and open-ledger fee facts;
- reserve-aware spendable XRP;
- XRP payment amount plus estimated fee for native payments;
- estimated XRP fee capacity for issued-asset payments;
- exact official RLUSD trust line;
- issuer Global Freeze;
- trust-line freeze, deep-freeze, and authorization;
- exact RLUSD balance against the frozen payment amount.

The fee estimate is the maximum of the observed base, minimum, and open-ledger reference fees. It is advisory because network conditions may change before submission.

## 4. Arithmetic

- XRP values use integer drops and `bigint` arithmetic.
- Issued-asset balances use bounded arbitrary-precision decimal normalization.
- JavaScript floating-point arithmetic is not used for readiness decisions.
- Account reserve is calculated from the observed base reserve plus OwnerCount multiplied by the observed incremental reserve.

## 5. Failure semantics

A confirmed ledger condition returns `blocked` with a stable reason such as:

```text
account_not_found
insufficient_spendable_xrp
trust_line_missing
trust_line_frozen
trust_line_not_authorized
issued_balance_insufficient
issuer_global_freeze
```

A provider outage, malformed response, unvalidated response, or incomplete network fact returns `unavailable`, not a false account failure.

## 6. Network isolation

- Testnet and Mainnet endpoint sets remain separate.
- Mainnet reads require explicit Mainnet gate approval.
- Mainnet Asset identity must match the approved registry exactly.
- A network mismatch fails before account reads.

## 7. Authority boundary

A ready result is a preflight observation only. Xaman and XRPL may still reject a later transaction if balances, reserves, fees, trust lines, freezes, or authorization change. Payment completion still requires the existing validated-ledger verification against the frozen PaymentSlot.
