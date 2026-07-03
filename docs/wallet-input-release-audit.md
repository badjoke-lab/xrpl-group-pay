# XRPL Group Pay — Wallet Input Release Audit

**Status:** Completed  
**Decision:** Passed  
**Scope:** PR #150–#152 wallet-input safety, browser-local saved wallets, integrated regression, and feature freeze  
**Audited:** 2026-07-03  
**Document class:** Public

## 1. Decision

PR #150 and PR #151 are merged, tested, and covered by the machine-readable record in `config/wallet-input-release-audit.json`.

The wallet-input pre-submission phase passes its integrated review. Address-input and saved-wallet feature work is frozen for the Make Waves submission, and submission preparation may resume.

PR #152 adds no new settlement behavior. It records the final cross-control decision, makes the audit a required CI/build/Mainnet-deploy gate, aligns public documentation, and closes the bounded PR #150–#152 schedule.

## 2. Product boundary reviewed

The audit confirms that:

- an XRPL account address is not a Xaman-specific address;
- compatible recipients do not need Xaman merely to receive a valid Payment;
- payer Payment and TrustSet handoff for this release remains Xaman-only;
- the Xaman account selected by the payer must match the frozen expected payer address;
- exchange withdrawals and ordinary manual transfers are not presented as supported PaymentSlot settlement paths;
- no new Wallet Provider, manual-settlement path, custody function, exchange function, or account-ownership claim was introduced.

## 3. Address-input review

### Classic Address

Recipient and payer inputs validate canonical XRPL Classic Address format and checksum before Bill review. Surrounding whitespace may be trimmed, but the application does not silently repair invalid characters or change the address.

### X-address

X-address entry is an input convenience only. The application:

- decodes the Classic Address;
- shows the encoded network;
- shows an embedded recipient Destination Tag;
- blocks Mainnet/Testnet mismatch;
- blocks payer X-addresses with embedded tags;
- blocks a recipient tag that conflicts with an already entered tag;
- requires explicit confirmation before applying decoded values;
- stores the Classic Address and optional recipient Destination Tag separately.

### Clipboard

Clipboard reading occurs only after an explicit user action. Permission failure or browser unavailability leaves direct typing and ordinary paste available.

## 4. Recipient and payer semantics

The recipient address remains the frozen Payment destination. The expected payer address remains a settlement-verification fact and must match the validated transaction sender.

The audit confirms that recipient/payer overlap and duplicate payer checks remain active, and saved-wallet selection cannot alter these rules.

## 5. Browser-local saved wallets

Saved wallets are optional input shortcuts stored in versioned IndexedDB for the current application origin and browser profile.

The approved record contains only:

- local ID;
- label;
- canonical Classic Address;
- optional recipient Destination Tag;
- recipient, payer, or both role;
- Mainnet or Testnet identity;
- favorite state;
- created, updated, and last-used timestamps.

The audit confirms that saved-wallet records do not contain:

- Bill or PaymentSlot IDs;
- Bill titles or amounts;
- capabilities or shared links;
- InvoiceIDs;
- provider request IDs;
- transaction hashes;
- receipts or public proof data;
- balances, trust-line observations, or readiness results;
- claimed identity or account ownership.

Saved-wallet operations do not call the Group Pay API, write D1, enter application analytics, or synchronize across devices.

## 6. Saved-wallet behavior reviewed

The implementation supports:

- explicit per-field saving;
- optional post-Bill saving;
- recipient/payer role filtering;
- Mainnet/Testnet filtering;
- label and address search;
- favorites and recent use;
- editing;
- deletion of one record;
- confirmed deletion of all records;
- reviewable JSON export;
- bounded, schema-validated JSON import with confirmation;
- duplicate network/address handling;
- role merging for repeated recipient/payer use;
- recipient Destination Tag isolation from payer fields.

Selecting a saved wallet fills only role-appropriate fields and then follows the normal validation, readiness, review, immutable freeze, wallet-handoff, and validated-ledger verification path.

## 7. Failure and privacy review

IndexedDB unavailability, storage quota failure, malformed import, excessive import, duplicate import, missing local records, browser cleanup, and private-browser cleanup do not change Bills, PaymentSlots, receipts, proofs, or XRPL history.

Direct address entry remains available when local storage or clipboard assistance fails.

Labels linked to public addresses may reveal personal or business relationships. English, Japanese, and Korean interfaces explain the local-only boundary, shared-browser exposure, deletion, export/import, and possible loss through browser cleanup.

## 8. Accessibility and responsive review

The saved-wallet picker uses a mobile bottom sheet and desktop side panel with:

- semantic dialog labeling;
- keyboard-reachable actions;
- focus trapping;
- Escape and backdrop dismissal;
- focus restoration;
- live status and alert messages;
- visible focus;
- address wrapping;
- no reliance on color alone.

The integrated review covers 320px, 390px, and 1280px layouts and the 200% zoom requirement. Existing production Bill UI auditing remains green.

## 9. Multilingual review

English, Japanese, and Korean cover:

- Classic Address and X-address errors;
- network and Destination Tag conflicts;
- recipient versus payer wallet compatibility;
- exchange and unsupported manual-transfer warnings;
- clipboard success and failure;
- saved-wallet local-only storage;
- save, select, search, favorite, recent, edit, delete, delete-all, export, and import;
- storage and import failures;
- shared-browser and browser-cleanup privacy guidance.

User-entered labels remain unchanged and are not translated automatically.

## 10. Payment and Mainnet regression

The audit preserves the completed PR #132–#149 payment-lifecycle release decision and confirms no change to:

- representative and direct payment modes;
- XRP and official RLUSD identity;
- Payment Intent construction;
- Xaman handoff lifecycle;
- readiness and TrustSet controls;
- validated-ledger verification;
- duplicate and replay protection;
- recovery and review dispositions;
- receipt, proof, capability, or immutable freeze boundaries;
- Mainnet evidence, acceptance, Source Tag, D1 isolation, and operational modes.

CI continues to run D1, Mainnet evidence, Mainnet acceptance, lifecycle audit, lint, type checking, all unit/component tests, Next.js, Storybook, Worker, browser, and production UI checks.

## 11. Deferred features

The following remain outside the submission release:

- camera QR scanning in Bill creation;
- Xaman Sign-In or account discovery for form filling;
- additional Wallet Providers;
- generic manual-wallet settlement;
- exchange-withdrawal settlement support;
- participant self-registration;
- cloud contact synchronization;
- user accounts and cross-device contacts.

Their absence does not block the Make Waves submission package.

## 12. Final result

No unresolved high- or critical-severity wallet-input, privacy, verification, accessibility, localization, responsive, Mainnet, or payment-regression finding remains.

The PR #150–#152 wallet-input phase is complete. The next work is limited to registration and Source Tag confirmation, metrics, controlled real-user evidence, XRP/RLUSD demonstration capture, video, deck, submission text, and evidence links.
