# XRPL Group Pay — Payment Failure Taxonomy

**Status:** Active  
**Scope:** PR #138 recovery-policy contract  
**Last reviewed:** 2026-07-02  
**Document class:** Public

## Purpose

XRPL Group Pay uses one machine-readable recovery policy across wallet handoffs, ledger verification, readiness checks, reconciliation, and public UI copy. Recovery metadata cannot mark a Payment paid. Validated-ledger verification and receipt settlement remain authoritative.

## Dispositions

| Disposition | Meaning | Replacement |
|---|---|---|
| `safe_retry` | Evidence indicates the earlier request did not satisfy the slot | `reconcile_first` |
| `wait_recheck` | State is pending or temporarily unavailable | blocked |
| `setup_required` | A wallet or recipient prerequisite must be corrected | blocked until ready |
| `review_required` | Submitted or validated evidence is ambiguous or mismatched | blocked |
| `already_paid` | A validated Payment already satisfies the slot | blocked |
| `terminal` | The frozen payment path cannot continue | blocked |

No uncertain transfer is treated as a simple retry.

## Core mappings

- payer rejection without a transaction: safe retry after reconciliation;
- handoff expiry without a transaction: safe retry after reconciliation;
- rejection, expiry, or provider failure with a transaction: review required;
- active or unresolved handoff: wait and recheck;
- submitted transaction not yet validated: wait and recheck;
- validated transaction failure: safe retry after reconciliation;
- wrong signer, destination, amount, asset, issuer, tags, InvoiceID, Partial Payment, or cross-currency Payment: review required;
- missing account, balance, trust line, trust-line capacity, tag, or authorization: setup required;
- issuer Global Freeze or frozen trust line: terminal;
- one existing validated match: already paid;
- multiple validated candidates: review required;
- unavailable validated history: wait and recheck;
- closed Bill: terminal.

## Replacement rules

`safe_retry` is not blind retry. Cancellation, expiry, and validated transaction failure must pass the existing validated-history reconciliation before a replacement handoff is created.

Pending, uncertain, review-required, already-paid, and terminal states cannot create a replacement.

## Verification API

Pending and failed verification responses may include:

```text
recovery.code
recovery.disposition
recovery.replacementRule
recovery.canRecheck
recovery.requiresSetup
recovery.requiresReview
recovery.reasonKey
recovery.titleKey
recovery.bodyKey
recovery.actionKey
```

Verified response and Receipt shapes do not change.

## Localization

English, Japanese, and Korean explanations are maintained together. Public text uses stable recovery keys rather than raw provider messages. It must clearly distinguish retry, recheck, setup, review, already-paid, and terminal conditions.

## Boundaries

Recovery metadata does not replace frozen PaymentSlot facts, Xaman lifecycle persistence, replacement reconciliation, strict ledger verification, receipt settlement, Bill closure rules, or Mainnet operational controls.
