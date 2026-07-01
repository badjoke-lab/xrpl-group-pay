# XRPL Group Pay — Payment Lifecycle Security Addendum

**Status:** Active  
**Scope:** Security additions for the PR #132–#149 payment-lifecycle revision  
**Last reviewed:** 2026-07-01  
**Document class:** Public

## 1. Relationship to the threat model

This document supplements `threat-model.md`. Existing verification, capability, asset-identity, Mainnet, receipt, and non-custodial controls remain in force.

## 2. Additional security objectives

- A Bill operator, recipient, and payer must not be treated as the same role unless explicitly represented by the frozen Bill.
- One payer failure must never reverse or invalidate another payer's accepted receipt.
- A replacement Payment must not be created while earlier value movement remains uncertain.
- A mismatched transaction must not be treated as safely unpaid when value may have moved.
- An administrator must not be able to manufacture a ledger-verified paid state.
- TrustSet assistance must use only the canonical network-specific RLUSD identity.
- Guide and contextual-help navigation must not leak capability values, payer data, or browser drafts.
- Status meaning must remain understandable without color.

## 3. Added risks and controls

| ID | Risk | Required control |
|---|---|---|
| PL01 | Bill operator confused with recipient or application operator | Explicit role model, mode review, and direct funds-flow copy |
| PL02 | One payer failure causes group rollback or duplicate collection | Independent PaymentSlots and monotonic accepted receipts |
| PL03 | Replacement Payment after uncertain submission | Submitted and validating states block replacement; reconciliation required |
| PL04 | Wrong payer, amount, recipient, asset, issuer, tag, or InvoiceID treated as retryable | Review-required state when value may have moved |
| PL05 | Administrator marks an observation paid | Paid transition remains exclusive to the validated-ledger verifier |
| PL06 | Closed Bill still accepts a handoff | Terminal Bill and slot checks before handoff creation |
| PL07 | Copy-to-revise reuses frozen identities | New Bill, slot, InvoiceID, capability, and handoff identities |
| PL08 | TrustSet link adds another issuer or network | Server-generated canonical AssetDescriptor; reject untrusted issuer or currency input |
| PL09 | TrustSet mistaken for Bill Payment or funding | Separate transaction type, lifecycle, copy, and ledger confirmation |
| PL10 | Temporary XRPL or provider failure reported as confirmed insufficiency | Separate `unavailable` result and wait-and-recheck recovery |
| PL11 | Help or Guide URL leaks a private capability | Public fixed Guide URL; no capability, draft, or payer context in parameters |
| PL12 | Help navigation discards financial input | In-place help and session-scoped draft restoration |
| PL13 | Status color is misunderstood or inaccessible | Text, icon, semantic token, and accessible name required |
| PL14 | Mainnet progress reads Testnet data | Bill-network-derived query, badge, endpoint, and receipt filter |

## 4. Recovery controls

Every failure maps to one class:

```text
retry_safe
wait_and_recheck
setup_required
needs_review
already_paid
terminal
```

Rules:

- `retry_safe` is permitted only after reconciliation excludes an earlier valid Payment.
- `wait_and_recheck` never creates another Payment.
- `setup_required` addresses a prerequisite and then re-runs readiness.
- `needs_review` blocks automatic retry.
- `already_paid` returns the existing receipt and tells the payer not to pay again.
- `terminal` blocks new payment activity.

## 5. RLUSD and TrustSet controls

- Recipient readiness is checked before Bill freeze.
- Payer readiness is checked before Payment handoff where supported.
- TrustSet uses the exact canonical currency and issuer for the Bill network.
- TrustSet completion is accepted only after XRPL confirms the trust line.
- TrustSet never marks a PaymentSlot paid.
- A recipient-readiness capability cannot reveal or exercise Bill-management or payer-payment authority.

## 6. Closure and copy controls

Closing incomplete:

- preserves accepted receipts;
- prevents new handoffs;
- records unpaid and unresolved amounts;
- performs no refund or rollback.

Copy-to-revise:

- copies only approved human-entered and allocation inputs;
- creates new payment-critical identities;
- leaves the source Bill and receipts unchanged.

## 7. Guide and help privacy

- `/guide` is public and context-free.
- Contextual help is rendered inside the authorized view.
- The full Guide opens in a separate protected tab.
- Capability fragments, addresses, draft values, and private Bill identifiers are not appended to Guide URLs.
- No third-party analytics are added to capability or contextual-help surfaces.

## 8. Required tests

- role and mode authorization tests;
- independent-slot and no-rollback tests;
- submitted/validating replacement-block tests;
- mismatch review tests;
- no-manual-paid authorization tests;
- closed-Bill handoff rejection tests;
- copy identity-separation tests;
- TrustSet issuer, network, and signer tests;
- Guide URL and referrer privacy tests;
- draft restoration tests;
- no-color status comprehension and accessibility tests;
- Mainnet/Testnet progress separation tests.
