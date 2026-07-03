# XRPL Group Pay — Wallet Input Pre-Submission Schedule

**Status:** Completed  
**Scope:** Completed pre-submission improvements after the PR #132–#149 payment-lifecycle revision  
**Last reviewed:** 2026-07-03  
**Document class:** Public  
**PR range:** #150–#152

## 1. Result

The bounded wallet-input phase is complete.

It improved address entry and repeat-recipient reuse without reopening the completed payment-lifecycle revision, adding custody, adding another Wallet Provider, accepting manual transfers as settlement, weakening validated-ledger verification, or altering frozen Bill and PaymentSlot facts.

The final decision is recorded in:

- `config/wallet-input-release-audit.json`;
- `docs/wallet-input-release-audit.md`;
- `scripts/check-wallet-input-release-audit.mjs`.

## 2. Completed PR sequence

| PR | Status | Result |
|---|---|---|
| #150 | Completed | Added Classic Address checksum validation, explicit X-address review, network and Destination Tag safeguards, clipboard assistance, recipient/payer wallet guidance, and EN/JA/KO coverage. Merged as `cfdb89b760958bd5f97f36c653502fdff7a9e3bd`. |
| #151 | Completed | Added browser-local saved wallets, role/network filtering, search, favorites, recent use, edit, delete, delete-all, bounded JSON export/import, privacy controls, and direct-entry fallback. Merged as `1e1a4dad4655055f5ef0312fee4b8e550e1ffdfe`. |
| #152 | Completed | Added the integrated machine-readable audit, CI/build/Mainnet-deploy gate, documentation alignment, feature freeze, and return to submission work. |

## 3. PR #150 — Wallet input safety

Completed behavior:

- validates XRPL Classic Address format and checksum;
- trims surrounding whitespace without rewriting address characters;
- decodes supported X-addresses for explicit review;
- displays the decoded Classic Address, network, and recipient Destination Tag;
- blocks Mainnet/Testnet mismatch;
- blocks payer X-addresses with embedded Destination Tags;
- blocks conflicting recipient Destination Tags;
- preserves duplicate-payer and recipient/payer overlap checks;
- provides user-triggered clipboard assistance;
- preserves direct typing and ordinary paste when clipboard access fails;
- explains that compatible recipients do not need Xaman merely to receive;
- explains that payer handoff remains Xaman-only for this release;
- warns that exchange withdrawals and ordinary manual transfers are not supported PaymentSlot settlement paths;
- preserves normal server review, readiness, freeze, Xaman handoff, and validated-ledger verification.

### Gate A — Passed

Direct entry remains fully usable and no unsupported wallet path is described as supported.

## 4. PR #151 — Browser-local saved wallets

Completed storage boundary:

- versioned IndexedDB on the current origin;
- no Group Pay API persistence;
- no D1 persistence;
- no analytics persistence;
- no cross-device synchronization;
- no user account or identity proof;
- bounded record and import sizes;
- schema validation and deterministic duplicate handling;
- safe fallback when IndexedDB or quota is unavailable.

Approved record fields:

```text
id
label
classicAddress
destinationTag
role
network
favorite
createdAt
updatedAt
lastUsedAt
```

Completed user actions:

- explicit `Save this wallet`;
- optional post-Bill save;
- recipient/payer role filtering;
- Mainnet/Testnet filtering;
- label/address search;
- favorites and recent use;
- edit;
- delete one;
- confirmed delete-all;
- reviewable JSON export;
- bounded, schema-validated JSON import with confirmation;
- recipient Destination Tag filling only for recipient fields;
- normal validation and readiness after saved-wallet selection.

Excluded from records and exports:

- Bills and PaymentSlots;
- capabilities and shared links;
- amounts and allocation data;
- InvoiceIDs;
- provider requests;
- transaction hashes;
- receipts and proof data;
- balances, trust-line observations, and readiness results;
- claimed identity or ownership.

### Gate B — Passed

Saved-wallet functionality is optional, local-only, and unable to bypass validation, readiness, review, immutable freeze, wallet handoff, or settlement verification.

## 5. PR #152 — Integrated audit and feature freeze

The final audit covers:

- recipient and payer semantics;
- representative and direct payment modes;
- XRP and official RLUSD;
- Mainnet and Testnet separation;
- Classic Address and X-address behavior;
- Destination Tag handling;
- Xaman-supported payer guidance;
- unsupported exchange/manual-transfer guidance;
- direct entry, clipboard, saved selection, search, favorite, recent use, edit, delete, delete-all, export, and import;
- IndexedDB and quota failure fallback;
- English, Japanese, and Korean;
- keyboard and screen-reader behavior;
- 200% zoom;
- 320px, 390px, and 1280px layouts;
- server/API compatibility;
- payment-lifecycle and Mainnet operational regression.

The audit checker confirms:

- PR #150 and PR #151 are merged;
- all fourteen required controls passed;
- no unresolved high- or critical-severity finding remains;
- no new Wallet Provider claim was introduced;
- no address-book server, D1, analytics, or synchronization persistence exists;
- only the approved saved-wallet fields are stored;
- direct entry remains available;
- public documentation agrees with the machine-readable decision.

### Gate C — Passed

No unresolved wallet-input, privacy, localization, accessibility, responsive, Mainnet, or payment-regression finding remains.

## 6. Validation completed

The phase passed the applicable checks for:

```bash
pnpm check:mainnet-evidence
pnpm check:mainnet-acceptance
pnpm check:lifecycle-audit
pnpm check:wallet-input-audit
pnpm db:migrate:local
pnpm db:check:local
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm storybook:smoke
pnpm build:worker
pnpm test:e2e
```

Production Bill UI auditing remains active at 320px, 390px, and 1280px.

## 7. Feature freeze

Wallet-input feature work is frozen for the Make Waves submission.

The following remain deferred:

- camera QR scanning;
- Xaman Sign-In or account discovery;
- additional Wallet Providers;
- generic manual-wallet settlement;
- exchange-withdrawal settlement support;
- participant self-registration;
- cloud contact synchronization;
- user accounts and cross-device contacts.

No deferred wallet feature is required for submission.

## 8. Next sequence

Make Waves submission preparation resumes in this order:

1. confirm registration, project approval, and assigned Source Tag;
2. produce the Source Tag metrics summary;
3. collect controlled real-user usage and evidence;
4. capture XRP and official RLUSD demonstrations;
5. prepare the video and pitch deck;
6. assemble final submission text and evidence links.
