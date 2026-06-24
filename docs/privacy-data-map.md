# XRPL Group Pay — Privacy Data Map

**Status:** Active  
**Scope:** Approved Make Waves v1 data map  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Principle

XRPL Group Pay stores only the data needed to create Bills, coordinate participants, verify settlement, show progress, and publish reviewed proof fields.

The product does not require real names and does not place Bill titles, participant labels, contact details, or expense descriptions in XRPL Memos.

## 2. Public ledger facts

A validated XRPL Payment can reveal transaction identifier, ledger index, sender, destination, asset identity, currency and issuer for RLUSD, requested and delivered amount, tags, InvoiceID, result, validation status, and ledger time.

These facts remain public on XRPL independently of the application.

## 3. Private application facts

- Bill title and participant label;
- Bill and PaymentSlot state;
- expected payer before payment;
- Accounting Currency and obligation amount;
- Allocation Strategy and metadata;
- creator share;
- Wallet Provider request state;
- selected interface locale;
- later Settlement Quote details.

## 4. Stored settlement facts

The application may store network, Payment Rail, Settlement Asset ID, exact currency and issuer, canonical obligation and Settlement Amount units, destination, tags, InvoiceID, verified transaction facts, Receipt Contract, proof digest, and lifecycle timestamps.

RLUSD is never represented by ticker alone in stored verification or proof data.

## 5. RLUSD readiness

Recipient readiness may inspect the destination account and official-issuer trust-line state. Store only the normalized result and observation time needed to explain and audit the readiness decision.

Readiness data is not automatically published in a transaction proof.

## 6. Shared links and locale

Participant payment, read-only progress, creator management, and public proof access remain separate.

Switching between English, Japanese, and Korean preserves the same access scope and must not expose private Bill or participant content through public metadata.

## 7. Public proof

Public proof uses a Receipt Contract-specific allowlist. It excludes Bill title, participant label, Wallet Provider request details, private application identifiers, and operational diagnostics. Issued-asset proof shows the issuer in full.

## 8. Localization

System labels, warnings, states, and errors are translated. User-entered content is not translated automatically.

Stored values, API fields, Payment Intents, receipts, and proof digests are identical across locales.

## 9. Retention

| Data | Proposed retention |
|---|---|
| Browser-local abandoned draft | Not stored by the server |
| Expired unused wallet handoff | 30 days after expiry |
| Normalized provider event | 30 days after resolution |
| Application logs | 14 days |
| Active Bill | Until final state |
| Final Bill and PaymentSlot data | 365 days after final state |
| Public receipt facts | Up to 365 days in the application; ledger facts remain public |

The schedule is reviewed before Mainnet release.

## 10. Deletion

Application deletion may remove off-chain titles, labels, unused expected payer data, provider references, locale preferences, and progress records according to retention policy. It cannot remove or rewrite XRPL history.

## 11. Operational records

Operational records use request IDs, operation names, normalized error codes, network, Payment Rail, Wallet Provider ID, Asset ID, locale, and shortened transaction identifiers.

They do not include private Bill contents, participant labels, complete shared links, or complete provider responses unless a specific short-lived diagnostic is approved.

## 12. User notices

Before Bill freeze, show destination, Settlement Asset, public-ledger disclosure, storage purpose, and RLUSD issuer/readiness information where applicable.

Before payment, show asset, amount, destination, tags, network, Wallet Provider, the distinction between RLUSD amount and XRP network fee, and the fact that Group Pay cannot reverse validated settlement.

## 13. Mainnet privacy gate

- published privacy notice;
- approved retention policy;
- shared-link redaction tests;
- no third-party analytics on sensitive routes;
- database-access review;
- deletion and retention tests;
- English, Japanese, and Korean disclosure warnings;
- issued-asset proof review;
- locale-routing review.
