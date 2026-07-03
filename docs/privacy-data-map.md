# XRPL Group Pay — Privacy Data Map

**Status:** Active  
**Scope:** Approved Make Waves v1 data map through PR #151  
**Last reviewed:** 2026-07-03  
**Document class:** Public

## 1. Principle

XRPL Group Pay stores only the data needed to create Bills, coordinate participants, verify settlement, show progress, publish reviewed proof fields, and optionally reuse wallet addresses in the user's current browser profile.

The product does not require real names and does not place Bill titles, participant labels, saved-wallet labels, contact details, or expense descriptions in XRPL Memos.

## 2. Public ledger facts

A validated XRPL Payment can reveal transaction identifier, ledger index, sender, destination, asset identity, currency and issuer for RLUSD, requested and delivered amount, tags, InvoiceID, result, validation status, and ledger time.

These facts remain public on XRPL independently of the application.

## 3. Private application facts

- Bill title and participant label;
- Bill and PaymentSlot state;
- expected payer before payment;
- Accounting Currency and obligation amount;
- Allocation Strategy and metadata;
- recipient-funded accounting amount;
- Wallet Provider request state;
- selected interface locale;
- later Settlement Quote details.

## 4. Browser-local saved wallets

Saved wallets are optional records held only in IndexedDB for the current application origin and browser profile.

An approved record contains only:

- local record ID;
- user-entered label;
- canonical XRPL Classic Address;
- optional recipient Destination Tag;
- recipient, payer, or both role;
- Mainnet or Testnet identity;
- favorite state;
- created, updated, and last-used timestamps.

Saved-wallet records do not contain:

- Bill or PaymentSlot IDs;
- Bill titles or amounts;
- management, read-only, payer, setup, or proof capabilities;
- InvoiceIDs;
- provider request IDs;
- transaction hashes;
- receipt or proof data;
- readiness balances or trust-line observations;
- claimed account ownership or verified identity.

Saved-wallet operations do not call the Group Pay API, write D1, or enter application analytics. A public XRPL address combined with a private label can reveal a personal or business relationship, so the interface identifies the storage as browser-local and warns users of shared-browser exposure.

## 5. Stored settlement facts

The application may store network, Payment Rail, Settlement Asset ID, exact currency and issuer, canonical obligation and Settlement Amount units, destination, tags, InvoiceID, verified transaction facts, Receipt Contract, proof digest, and lifecycle timestamps.

RLUSD is never represented by ticker alone in stored verification or proof data.

## 6. RLUSD readiness

Recipient readiness may inspect the destination account and official-issuer trust-line state. Store only the normalized result and observation time needed to explain and audit the readiness decision.

Readiness data is not automatically published in a transaction proof and is not copied into saved-wallet records.

## 7. Shared links and locale

Participant payment, read-only progress, Bill management, RLUSD setup, and public proof access remain separate.

Switching between English, Japanese, and Korean preserves the same access scope and must not expose private Bill, participant, or saved-wallet content through public metadata.

## 8. Public proof

Public proof uses a Receipt Contract-specific allowlist. It excludes Bill title, participant label, saved-wallet label, Wallet Provider request details, private application identifiers, and operational diagnostics. Issued-asset proof shows the issuer in full.

## 9. Localization

System labels, warnings, states, and errors are translated. User-entered content, including saved-wallet labels, is not translated automatically.

Stored values, API fields, Payment Intents, receipts, and proof digests are identical across locales.

## 10. Retention

| Data | Retention |
|---|---|
| Browser-local abandoned draft | Current browser session; not stored by the server |
| Browser-local saved wallet | Until the user deletes it, clears browser data, uses private browsing cleanup, or removes the browser profile |
| Exported saved-wallet JSON | Controlled entirely by the user after download |
| Expired unused wallet handoff | 30 days after expiry |
| Normalized provider event | 30 days after resolution |
| Application logs | 14 days |
| Active Bill | Until final state |
| Final Bill and PaymentSlot data | 365 days after final state |
| Public receipt facts | Up to 365 days in the application; ledger facts remain public |

Browser storage availability, private browsing, browser cleanup, and storage eviction can remove saved wallets without affecting Bills or XRPL history.

## 11. Deletion and portability

Application deletion may remove off-chain titles, labels, unused expected payer data, provider references, locale preferences, and progress records according to retention policy. It cannot remove or rewrite XRPL history.

Saved-wallet users can:

- delete one local record;
- delete all local records with confirmation;
- export a reviewable versioned JSON file;
- import a schema-validated JSON file after preview and confirmation.

Saved-wallet deletion does not change frozen Bills, PaymentSlots, receipts, proofs, or ledger transactions. Export and import exclude Capability and Bill data.

## 12. Operational records

Operational records use request IDs, operation names, normalized error codes, network, Payment Rail, Wallet Provider ID, Asset ID, locale, and shortened transaction identifiers.

They do not include private Bill contents, participant labels, saved-wallet labels, complete shared links, complete provider responses, or local address-book interaction records unless a specific short-lived diagnostic is approved.

## 13. User notices

Before Bill freeze, show destination, Settlement Asset, public-ledger disclosure, storage purpose, and RLUSD issuer/readiness information where applicable.

Before payment, show asset, amount, destination, tags, network, Wallet Provider, the distinction between RLUSD amount and XRP network fee, and the fact that Group Pay cannot reverse validated settlement.

Before saving or importing wallets, show that labels and addresses remain in the current browser profile, may be visible to other users of the same profile, can be lost through browser cleanup, and are not identity proof.

## 14. Mainnet and saved-wallet privacy gate

- published privacy notice;
- approved retention policy;
- shared-link redaction tests;
- no third-party analytics on sensitive routes or saved-wallet interactions;
- no saved-wallet API or D1 persistence;
- database-access review;
- local delete, delete-all, export, and import validation tests;
- Capability and Bill-data exclusion tests for local records and exports;
- English, Japanese, and Korean disclosure warnings;
- issued-asset proof review;
- locale-routing review.