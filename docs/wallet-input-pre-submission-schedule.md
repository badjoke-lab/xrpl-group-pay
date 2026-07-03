# XRPL Group Pay — Wallet Input Pre-Submission Schedule

**Status:** Approved for implementation  
**Scope:** Ordered pre-submission improvements after the completed PR #132–#149 payment-lifecycle revision  
**Last reviewed:** 2026-07-03  
**Document class:** Public  
**Planned PR range:** #150–#152

## 1. Purpose

This schedule adds a bounded wallet-input improvement phase before Make Waves submission assembly resumes.

The completed payment-lifecycle revision remains closed and authoritative. This sequence does not reopen PR #132–#149, change custody, add a new Wallet Provider, weaken verified-ledger settlement, or alter frozen Bill and PaymentSlot facts.

The phase addresses three practical pre-submission risks:

1. users may confuse an XRPL account address with Xaman-specific support;
2. manually entered recipient and payer addresses may contain avoidable errors;
3. repeat Bill creators currently need to re-enter labels, addresses, and recipient tags.

## 2. Authority and reviewed contracts

Before implementation, each PR must review:

- `product-spec.md`;
- `payment-lifecycle-contract.md`;
- `architecture.md`;
- `payment-contracts.md`;
- `non-custodial-boundary.md`;
- `threat-model.md`;
- `privacy-data-map.md`;
- `state-machine.md`;
- `persistence-scope.md`;
- `asset-readiness.md`;
- `payment-reconciliation.md`;
- `payment-lifecycle-security.md`;
- `localization.md`;
- `payment-lifecycle-localization.md`;
- `ui-ux-spec.md`;
- `accessibility-spec.md`;
- `responsive-behavior.md`;
- `guide-and-contextual-help.md`;
- `wallet-input-and-local-address-book.md`;
- `mainnet-operational-controls.md`;
- `mainnet-acceptance-audit.md`.

The specific approved behavior for this sequence is defined by `wallet-input-and-local-address-book.md`.

## 3. Fixed scope

### Included before submission

- strict Classic Address format and checksum validation;
- X-address decode with explicit network and Destination Tag handling;
- recipient/payer overlap and duplicate-payer protection;
- field-level Wallet Provider and exchange compatibility guidance;
- explicit paste assistance with direct-entry fallback;
- browser-local saved wallets using IndexedDB;
- label, Classic Address, optional recipient Destination Tag, role, network, favorite, and use timestamps;
- search, recent, favorite, edit, delete, delete-all, export, and validated import;
- English, Japanese, and Korean coverage;
- privacy, accessibility, responsive, regression, Mainnet-safe, and production UI audit.

### Deferred until after submission

- camera QR scanning in Bill creation;
- Xaman Sign-In or account discovery for form filling;
- additional Wallet Providers;
- generic manual-wallet settlement;
- exchange-withdrawal settlement support;
- participant self-registration;
- cloud contact synchronization;
- user accounts and cross-device contacts.

## 4. PR sequence

| PR | Status | Result |
|---|---|---|
| #150 | Planned | Harden recipient and payer address input, clarify wallet compatibility, add paste assistance, update Guide/help/localization, and preserve all existing payment boundaries. |
| #151 | Planned | Add the browser-local saved-wallet address book, picker, management, explicit save, export/import, privacy controls, and direct-entry fallback. |
| #152 | Planned | Run and machine-enforce the integrated wallet-input, privacy, accessibility, responsive, localization, regression, Mainnet-safe, and production UI audit; freeze feature work and return to submission assembly. |

## 5. PR #150 — Wallet input safety and compatibility

### 5.1 Domain and validation

Implement one shared address-input module used by recipient and payer fields.

It must:

- validate Classic Address format and checksum;
- decode supported X-addresses;
- block network mismatch;
- keep Destination Tag separate from the Classic Address;
- reject embedded payer tags;
- reject conflicting recipient tags;
- preserve existing duplicate-payer and recipient/payer overlap checks;
- keep server review and validated-ledger readiness authoritative.

### 5.2 User interface

Add:

- paste actions;
- immediate localized validation;
- a decoded X-address review state;
- concise recipient and payer compatibility notices;
- exchange/custodial and unsupported manual-transfer warnings;
- links to the matching Guide and contextual-help sections.

### 5.3 Tests

Cover:

- valid and invalid Classic Addresses;
- checksum failures;
- recipient and payer X-addresses;
- Mainnet/Testnet mismatch;
- Destination Tag conflicts;
- clipboard success and failure;
- duplicate and overlap validation;
- EN/JA/KO messages;
- server-side review compatibility;
- no regression in representative/direct, XRP/RLUSD, and Xaman handoff flows.

### Gate A

PR #150 passes only when direct entry remains fully usable and no unsupported wallet path is described as supported.

## 6. PR #151 — Browser-local saved wallets

### 6.1 Local persistence

Add a versioned IndexedDB repository for the approved saved-wallet record shape.

Requirements:

- local origin only;
- no API or D1 persistence;
- bounded record and import sizes;
- schema validation;
- versioned migration boundary;
- deterministic duplicate handling;
- safe failure when IndexedDB is unavailable.

### 6.2 Save and select

Add:

- explicit `Save this wallet`;
- optional post-creation save prompt;
- role-aware saved-wallet picker;
- label/address search;
- favorites and recent use;
- Mainnet/Testnet filtering;
- recipient Destination Tag filling only in recipient fields;
- duplicate update confirmation;
- validation and readiness recheck after selection.

### 6.3 Manage and move local data

Add:

- edit;
- favorite/unfavorite;
- delete one;
- delete all with confirmation;
- reviewable JSON export;
- schema-validated import preview and confirmation.

Exports and imports must exclude Bill, capability, PaymentSlot, transaction, provider, receipt, proof, and management data.

### 6.4 Tests

Cover:

- create, read, update, delete, and clear;
- duplicate address handling;
- role and network filtering;
- recipient tag isolation;
- favorites and recent ordering;
- storage unavailable and quota failures;
- import/export schema and size limits;
- no server requests for address-book operations;
- no capability or Bill data in records;
- direct-entry fallback;
- EN/JA/KO and accessibility behavior.

### Gate B

PR #151 passes only when all saved-wallet functionality is optional, local-only, and unable to bypass financial validation or freeze review.

## 7. PR #152 — Integrated audit and feature freeze

### 7.1 Audit dimensions

The final audit covers:

- recipient and payer field semantics;
- representative and direct modes;
- XRP and official RLUSD;
- Mainnet and Testnet separation;
- Classic Address and X-address behavior;
- Destination Tag handling;
- Xaman-supported payer guidance;
- unsupported exchange/manual-transfer guidance;
- direct entry, paste, saved selection, edit, delete, export, and import;
- IndexedDB failure fallback;
- EN, JA, and KO;
- keyboard and screen-reader behavior;
- 200% zoom;
- 320px, 390px, and 1280px layouts;
- server/API compatibility;
- Mainnet operational controls;
- existing payment-lifecycle regression.

### 7.2 Machine-readable audit

Add a machine-readable audit record and a CI checker that confirms:

- PR #150 and #151 are merged;
- required controls passed;
- no high- or critical-severity finding remains;
- no new Wallet Provider claim was introduced;
- no address-book server persistence exists;
- no capability or Bill identity is stored in the local address book;
- current README, Roadmap, Changelog, Guide, privacy, and schedule statements agree.

### 7.3 Feature freeze

After PR #152:

- wallet-input feature work is frozen for the Make Waves submission;
- QR scanning, Xaman account discovery, additional wallets, participant self-registration, and cloud sync remain deferred;
- the next work returns to Source Tag metrics, real-use evidence, video, deck, submission text, and evidence links.

### Gate C

PR #152 passes only when the integrated audit is green and no unresolved safety, privacy, localization, accessibility, responsive, Mainnet, or regression finding remains.

## 8. Validation baseline

Each implementation PR runs the relevant subset of:

```bash
pnpm validate
pnpm check:mainnet-evidence
pnpm check:mainnet-acceptance
pnpm check:lifecycle-audit
pnpm db:migrate:local
pnpm db:check:local
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm storybook:build
pnpm build:worker
pnpm test:e2e
```

PR #152 adds and runs the dedicated wallet-input audit checker.

## 9. Completion condition

This sequence is complete when PR #150–#152 are merged, audited, and reflected in public availability documents.

The next sequence then resumes Make Waves submission preparation in this order:

1. registration, project approval, and assigned Source Tag confirmation;
2. Source Tag metrics summary;
3. controlled real-user usage and evidence;
4. XRP and RLUSD demonstration capture;
5. video and pitch deck;
6. final submission text and evidence links.

No deferred wallet feature is required to begin or complete that submission sequence.