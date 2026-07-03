# XRPL Group Pay — Wallet Input and Local Address Book

**Status:** Approved for implementation  
**Scope:** Make Waves pre-submission wallet-input safety and browser-local address reuse  
**Last reviewed:** 2026-07-03  
**Document class:** Public

## 1. Purpose

This contract defines the final pre-submission improvement to XRPL Group Pay address entry.

The change reduces address-entry mistakes and repeated manual entry without changing the non-custodial payment model, frozen Payment facts, validated-ledger verification, Xaman request lifecycle, or capability boundaries.

The approved work consists of:

1. stricter recipient and payer address input;
2. clear Wallet Provider compatibility guidance;
3. direct-entry and clipboard assistance;
4. a browser-local saved-wallet address book;
5. one integrated regression and privacy audit before submission work resumes.

## 2. Terms and authority

An XRPL address is not a Xaman-specific address. The address identifies an XRPL account. A Wallet Provider controls how a user reviews and signs a transaction for that account.

For the Make Waves release:

- the Settlement Rail is XRPL;
- the supported Wallet Provider for Payment and TrustSet handoff is Xaman;
- a recipient does not need to use Xaman to receive a valid XRPL Payment;
- a payer must use a supported handoff path and the account selected in Xaman must match the frozen expected payer account;
- ordinary exchange withdrawals or manually constructed transfers are not claimed as supported PaymentSlot settlement paths.

The frozen Bill and PaymentSlot values remain authoritative. A label, saved-wallet entry, clipboard value, or decoded QR value never authorizes settlement.

## 3. Address-field roles

### 3.1 Recipient address

The recipient address is the frozen XRPL destination for every payer Payment in the Bill.

A recipient may control the account through Xaman, another self-custody wallet, a hardware wallet, or another compatible account-management system. Receiving does not require Xaman.

The application still checks the network- and Asset-specific recipient requirements, including account state, Destination Tag requirements where detectable, Deposit Authorization, XRP reserve conditions, and official RLUSD trust-line capacity.

### 3.2 Expected payer address

The expected payer address is a settlement-verification condition, not a contact hint.

A PaymentSlot is settled only when the validated transaction sender matches the frozen expected payer account and all other Payment Intent facts pass verification.

The interface must explain that:

- the payer should use an account they control;
- the account selected in Xaman must equal the expected payer address;
- an exchange may send from a shared hot wallet rather than the user's deposit address;
- a transfer sent outside the supported handoff may move funds without settling the intended PaymentSlot;
- the user must not retry only because a wallet screen closed or a provider request expired.

### 3.3 Labels

Recipient and payer labels are optional human-readable names.

Labels:

- do not replace the XRPL address;
- do not enter a Payment transaction or XRPL Memo;
- are not proof of identity or account ownership;
- may be stored with a saved-wallet entry only after an explicit user action;
- remain exact user-entered text and are not automatically translated.

## 4. Direct address input

Direct typing and ordinary paste remain available in every address field. The address book is an optional accelerator and never replaces direct entry.

The input layer must:

- trim surrounding whitespace;
- preserve address characters exactly;
- reject malformed XRPL Classic Addresses;
- validate the XRPL checksum;
- distinguish recipient and payer field semantics;
- block recipient/payer overlap;
- block duplicate payer accounts within one Bill;
- keep server-side validation authoritative;
- keep validated-ledger readiness authoritative for account and Asset state.

The client must not silently repair an invalid address, change case, remove internal characters, or accept a label as an address.

## 5. X-address handling

The input layer may accept an XRPL X-address as an entry convenience, but the frozen domain values remain a Classic Address and an optional Destination Tag.

### 5.1 Recipient X-address

For a recipient X-address, the interface must:

1. decode it using an XRPL-tested library;
2. show the decoded Classic Address;
3. show the embedded Destination Tag when present;
4. show the encoded network;
5. block a network mismatch;
6. require explicit confirmation before replacing the visible recipient fields;
7. reject a conflicting manually entered Destination Tag.

### 5.2 Payer X-address

For an expected payer field, the interface may decode the account portion only when the X-address contains no embedded tag.

An embedded tag in a payer X-address is rejected with an explanation because Destination Tag semantics apply to the destination, not the transaction sender.

### 5.3 Canonical storage

Bills, PaymentSlots, saved-wallet entries, Payment Intents, and verification contracts store the canonical Classic Address. A recipient Destination Tag is stored separately.

## 6. Clipboard assistance

Each recipient and payer address field may provide an explicit paste action.

The paste action:

- requests clipboard access only after user interaction;
- falls back to normal direct entry when permission is denied or unavailable;
- validates the pasted value immediately;
- never reads the clipboard in the background;
- never submits or freezes a Bill;
- never stores the value in the address book automatically.

## 7. Wallet compatibility notices

Address-entry and payer-review surfaces must distinguish account compatibility from Wallet Provider support.

Required meanings:

- **Recipient:** any recipient account that passes XRPL and Asset readiness may receive; Xaman is not required for receipt.
- **Payer:** the Make Waves release supports Xaman handoff; the selected Xaman account must match the frozen expected payer account.
- **Exchange or custodial withdrawal:** not a supported payer path because sender, InvoiceID, Source Tag, Destination Tag, amount, Asset, or timing may not remain under the payer's control.
- **Manual transfer from another wallet:** not claimed as supported settlement even when funds reach the recipient; it may fail PaymentSlot correlation and must not be encouraged as a retry method.

The notices must be concise near the fields, with detailed explanation in the Guide and contextual help.

## 8. Browser-local saved wallets

### 8.1 Purpose

The saved-wallet feature allows a user to register a recipient or payer once and reuse it in later Bill drafts on the same browser profile.

It is not an identity system, social graph, cloud contact service, wallet connection, or ownership proof.

### 8.2 Storage boundary

Saved wallets are stored only in browser-local IndexedDB for the current origin.

The application must not:

- send saved-wallet records to the Group Pay server;
- place them in D1;
- include them in logs or analytics;
- sync them between devices;
- associate them with a user account;
- include capability links, Bill IDs, PaymentSlot IDs, InvoiceIDs, transaction hashes, provider request IDs, proof digests, or private management data.

### 8.3 Record shape

A saved-wallet record contains only:

```text
id
label
classic_address
destination_tag | null
roles: recipient | payer | both
network: mainnet | testnet
favorite
created_at
updated_at
last_used_at | null
```

A record does not store balances, trust-line status, readiness results, Wallet Provider state, or claimed identity.

### 8.4 Save behavior

Saving is always explicit.

Approved entry points:

- `Save this wallet` beside a valid address field;
- `Save wallets used in this Bill` after successful Bill creation.

The application must not automatically save every typed or pasted address.

Before saving, the interface shows the label, canonical address, optional Destination Tag, role, and network.

### 8.5 Selection behavior

`Choose a saved wallet` opens a searchable picker that supports:

- label search;
- address search;
- favorites;
- recently used records;
- recipient/payer role filtering;
- Mainnet/Testnet filtering;
- keyboard navigation;
- mobile bottom-sheet and desktop dialog presentation.

Selecting a record fills only the fields appropriate to the current role. A recipient record may fill label, Classic Address, and Destination Tag. A payer record fills label and Classic Address only.

Selection never bypasses current field validation, duplicate checks, readiness, review, or freeze confirmation.

### 8.6 Duplicate and update rules

The same network and Classic Address should normally resolve to one saved-wallet record.

When a user attempts to save an existing address, the interface offers to:

- use the existing record;
- update its label, role, favorite status, or recipient Destination Tag;
- cancel.

Changing a saved record never changes an already frozen Bill or PaymentSlot.

### 8.7 Management and deletion

Users can:

- edit a label;
- edit roles;
- edit or remove a recipient Destination Tag;
- mark or unmark favorite;
- delete one record;
- delete all saved wallets;
- export a reviewable JSON file;
- import a validated JSON file after preview and confirmation.

Deletion affects only browser-local records and does not alter XRPL history, Bills, PaymentSlots, receipts, proofs, or transactions.

## 9. Privacy and safety

An XRPL address is public on the ledger, but a user-entered label linked to an address can reveal a private relationship or business context.

The interface must state that saved wallets remain on the current browser profile unless exported by the user.

Required controls:

- no server upload;
- no third-party analytics on saved-wallet interactions;
- explicit save and import confirmation;
- explicit delete-all confirmation;
- export excludes capabilities and Bill data;
- import schema and size limits;
- malformed or duplicate imports fail safely;
- private browsing and browser-data deletion may remove saved wallets;
- shared-device users are warned that other browser-profile users may see local labels.

## 10. Localization and accessibility

English, Japanese, and Korean must cover:

- address format and checksum errors;
- recipient versus payer wallet compatibility;
- exchange and manual-transfer warnings;
- X-address decode, network, tag, and conflict states;
- paste success and permission failure;
- save, duplicate, update, favorite, delete, delete-all, export, and import actions;
- local-only storage and shared-device privacy notices;
- empty, loading, search-no-results, and storage-unavailable states.

The picker and management UI require:

- visible keyboard focus;
- semantic dialog or sheet labeling;
- focus trapping and restoration;
- screen-reader announcements for selection, save, update, delete, and validation;
- no reliance on color alone;
- address wrapping and copy access;
- no horizontal overflow at 320px, 390px, and 1280px;
- usable layout at 200% zoom.

## 11. Failure and recovery

The address-entry feature must distinguish:

- malformed address;
- checksum failure;
- unsupported X-address;
- X-address network mismatch;
- conflicting Destination Tag;
- duplicate payer;
- recipient/payer overlap;
- clipboard permission failure;
- IndexedDB unavailable;
- storage quota failure;
- invalid import;
- duplicate import;
- local record missing after browser cleanup.

A local storage or clipboard failure must not block ordinary direct entry. A validation failure must not be hidden by selecting a saved record.

## 12. Explicitly deferred

This pre-submission phase does not add:

- camera-based QR scanning in the Bill-creation form;
- Xaman Sign-In or account discovery for form filling;
- Wallet Providers other than Xaman;
- generic manual-transaction settlement;
- exchange-withdrawal settlement support;
- participant self-registration before Bill freeze;
- cloud address-book synchronization;
- user accounts or cross-device contacts;
- address ownership attestation;
- automatic contact discovery.

These remain separate post-submission items and must not be implied by the address-book UI.

## 13. Acceptance criteria

The phase is complete only when:

- direct entry remains usable without clipboard or IndexedDB;
- malformed and wrong-network values fail before Bill freeze;
- recipient and payer compatibility guidance is accurate;
- no unsupported wallet or exchange path is presented as working;
- saved wallets remain browser-local and contain only the approved fields;
- selection cannot bypass validation, readiness, review, or immutable freeze;
- Mainnet and Testnet entries cannot be mixed silently;
- recipient Destination Tags do not leak into payer fields;
- EN, JA, and KO critical states are complete;
- accessibility, responsive, privacy, unit, component, persistence, browser, and production UI checks pass;
- the completed payment-lifecycle and Mainnet release controls remain unchanged.