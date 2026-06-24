# XRPL Group Pay — Threat Model

**Status:** Active  
**Scope:** Approved Make Waves v1 security model  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Security objectives

1. Never mark an invalid transaction as paid.
2. Never present a destination, asset, amount, network, tag, or InvoiceID different from the frozen Payment Intent.
3. Never expose wallet credentials, signing material, or capabilities.
4. Never reuse one transaction for multiple PaymentSlots.
5. Preserve Testnet/Mainnet and issuer separation.
6. Preserve existing XRP receipt and proof meaning while adding RLUSD.
7. Fail closed when asset identity, readiness, or ledger facts are uncertain.

## 2. Protected facts

- user-controlled XRP and RLUSD;
- user signing intent;
- frozen destination, network, asset, and amount;
- official network-specific RLUSD identity;
- Source Tag and InvoiceID;
- creator, participant, and progress capabilities;
- Wallet Provider credentials and request binding;
- Asset Registry integrity;
- verification results, receipts, and proof digests;
- private Bill and participant metadata;
- future quote source, timestamp, expiry, and adjustment history.

## 3. Trust boundaries

```text
Browser
  -> application server
  -> Wallet Provider
  -> XRPL network
  -> verification service
  -> database
```

Additional inputs cross separate boundaries:

- Asset Registry configuration;
- RLUSD issuer and trust-line state;
- localization catalogs;
- future quote sources.

No boundary response is final without the validation appropriate to that boundary.

## 4. Required threat controls

| ID | Risk | Required control |
|---|---|---|
| T01 | Participant or creator capability leaks | High entropy, role separation, hashing, redaction, revocation |
| T02 | Amount or destination changes after review | Frozen Payment Intent, final confirmation, exact ledger comparison |
| T03 | Tags or InvoiceID differ | Exact presence and value checks |
| T04 | Fake or provisional transaction | Fetch from expected network, require validated and `tesSUCCESS` |
| T05 | Partial Payment | Reject Partial Payment and verify delivered amount |
| T06 | Wrong asset type | Dispatch by frozen AssetDescriptor |
| T07 | Wrong RLUSD issuer or same ticker from another issuer | Exact network-specific currency and issuer checks |
| T08 | Testnet and Mainnet asset definitions mix | Separate Asset Registry entries, endpoints, databases, and deployment values |
| T09 | Wrong payer | Exact sender comparison and a defined review state |
| T10 | Transaction reused | Unique network plus transaction identifier |
| T11 | Provider status treated as proof | Provider status only starts independent ledger verification |
| T12 | Provider changes the request | Bind provider request to frozen Payment Intent and Bill revision |
| T13 | Duplicate callback or polling race | Idempotent processing and atomic compare-and-set |
| T14 | Capability appears in logs or localized URLs | Redaction, safe routing, no third-party analytics on sensitive routes |
| T15 | Provider credential reaches the client | Server-only configuration and bundle checks |
| T16 | Temporary node failure | Retryable not-found and unvalidated states, no optimistic success |
| T17 | Numeric precision error | Fixed-precision integer units, explicit scale, no floating-point authority |
| T18 | RLUSD trust line missing or insufficient | Recipient readiness check before Bill freeze |
| T19 | Issuer condition blocks payment | Inspect implemented ledger conditions and explain residual limitations |
| T20 | Asset Registry changes unexpectedly | Reviewed configuration, fixtures, and release checks |
| T21 | Mainnet enabled accidentally | Separate environments and prominent real-value confirmation |
| T22 | Proof exposes private Bill data | Contract-specific public allowlist and digest recomputation |
| T23 | Stale signing request remains usable | Expiry, one active handoff, intent and revision binding |
| T24 | Locale changes financial meaning | Canonical units, explicit asset labels, locale-independent API values |
| T25 | Translation omits a safety warning | Complete critical catalogs and English fallback |
| T26 | Future quote expires or changes | Immutable revision, expiry, and participant re-confirmation |
| T27 | Future adjustment is hidden | Retain suggested and final amounts and show the reason |
| T28 | Mixed-asset progress combines unlike units | Recompute progress in Accounting Currency only |

## 5. Verification algorithm

```text
1. Load PaymentSlot, Bill revision, Payment Intent, AssetDescriptor, and network.
2. Load the server-side Wallet Provider result.
3. Require a signed or submitted state and a transaction identifier.
4. Confirm that the provider request is bound to the frozen intent.
5. Fetch the transaction from the expected XRPL endpoint.
6. Return a retryable state if it is missing or unvalidated.
7. Require Payment and tesSUCCESS.
8. Compare sender, destination, Destination Tag, Source Tag, and InvoiceID.
9. Dispatch to the frozen asset Verification Strategy.
10. For XRP, compare exact drops and delivered drops.
11. For RLUSD, compare exact currency, official issuer, value, and delivered amount.
12. Reject Partial Payment and unsupported conversion fields.
13. Atomically insert or reuse the versioned receipt.
14. Mark the PaymentSlot paid and recompute the Bill.
```

## 6. RLUSD readiness

Before an RLUSD Bill is frozen:

```text
1. Load the official network-specific AssetDescriptor.
2. Validate the destination account.
3. Query the official issuer trust line.
4. Confirm that the implemented receive checks pass for the required amount.
5. Reject wrong issuer, missing line, insufficient capacity, or blocking state.
6. Show the readiness result during creator review.
```

Readiness is a preflight, not a guarantee that the issuer, wallet, or network will remain available.

## 7. Input and logging rules

Initial limits include bounded Unicode titles and labels, 2–50 participants, asset-specific precision, positive integer units, exact Percentage totals, positive Shares, UInt32 tags, and validated XRPL addresses.

Logs may contain request IDs, operation names, normalized error codes, network, provider ID, asset ID, locale, and non-secret entity IDs.

Logs must not contain capabilities, provider credentials, signing material, full private URLs, raw authorization headers, raw signed transactions by default, participant labels, or unnecessary provider responses.

## 8. Release gates

### Testnet

- XRP mismatch fixtures rejected;
- RLUSD wrong-currency and wrong-issuer fixtures rejected;
- duplicate and concurrency tests pass;
- trust-line readiness tests pass;
- Wallet Provider credentials remain server-side;
- English, Japanese, and Korean critical warnings are covered;
- existing XRP proof digest fixtures remain unchanged.

### Mainnet

- separate Mainnet secrets, database, endpoints, and Asset Registry entries;
- conservative limits by asset;
- explicit Mainnet and asset confirmation;
- incident and disable procedures;
- controlled XRP Mainnet settlement and proof;
- controlled RLUSD Mainnet settlement and proof.

## 9. Residual risks

- a user can approve a mistaken Bill;
- public XRPL transactions expose settlement facts;
- the application cannot reverse a validated transaction;
- Wallet Providers, nodes, issuers, and hosting providers may become unavailable;
- verification cannot prove that the real-world expense was legitimate;
- readiness cannot guarantee future issuer policy;
- later quote values may become stale after expiry.

These risks must be disclosed rather than represented as eliminated.
