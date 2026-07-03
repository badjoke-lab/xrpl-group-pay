# XRPL Group Pay — Guide, Contextual Help, and Troubleshooting

**Status:** Active  
**Scope:** Current implementation through PR #153  
**Last reviewed:** 2026-07-03  
**Document class:** Public

## 1. Purpose

This contract defines the public, multilingual explanation of the current XRPL Group Pay product, the contextual-help links embedded in critical flows, and the symptom-based troubleshooting surface available inside the application.

The Guide and troubleshooting page describe only implemented behavior. Future product directions remain in the Roadmap and are not presented as currently available functionality.

## 2. Supported languages

Critical Guide, address-input, saved-wallet, troubleshooting, and contextual-help content is available in:

- English;
- Japanese;
- Korean.

Every supported locale uses the same stable Guide identifiers and troubleshooting identifiers. A locale must not silently omit a critical topic or fall back to mixed-language guidance.

## 3. Stable Guide sections

`/guide` exposes the following language-independent anchors:

- `overview`;
- `roles`;
- `payment-modes`;
- `create-and-freeze`;
- `capability-links`;
- `xrp`;
- `rlusd`;
- `trustset`;
- `readiness`;
- `payment-flow`;
- `verification`;
- `progress`;
- `status-meanings`;
- `failures`;
- `recovery`;
- `review-required`;
- `partial-completion`;
- `incomplete-closure`;
- `copy-to-revise`;
- `privacy`;
- `security-limitations`;
- `faq`.

The visible title may be translated. The anchor must not change by locale.

## 4. Required current-product coverage

The Guide explains:

- product purpose and the non-custodial boundary;
- Bill operator, recipient, and payer roles;
- representative and direct-recipient payment modes;
- creation, allocation, review, freeze, sharing, signing, verification, and progress;
- recipient versus expected-payer address semantics;
- that an XRPL account address is not specific to Xaman;
- that recipients may use another compatible XRPL wallet while the current payer handoff is Xaman-only;
- why exchange withdrawals and ordinary manual transfers are not supported PaymentSlot settlement paths;
- Classic Address checksum validation and X-address review;
- X-address network and Destination Tag handling;
- clipboard assistance and direct-entry fallback;
- browser-local saved-wallet purpose and limits;
- explicit save, selection, search, favorites, recent use, edit, delete, delete-all, export, and import;
- local-only storage, shared-browser exposure, browser-cleanup loss, and no identity proof;
- saved-wallet exclusion of Bills, capabilities, amounts, provider requests, transactions, receipts, proofs, balances, and readiness observations;
- XRP and official network-specific RLUSD identity;
- TrustSet, trust lines, issued balance, XRP fee, and reserve behavior;
- management, read-only progress, payer, setup, and proof capability scopes;
- Bill, PaymentSlot, wallet-handoff, verification, and recovery meanings;
- safe retry, wait-and-recheck, setup-required, review-required, already-paid, and terminal recovery;
- independent PaymentSlots and partial completion;
- expected-versus-observed review and repeated-payment warning;
- incomplete closure and its no-refund meaning;
- copy-to-revise and new-identity generation;
- privacy boundaries, security checks, product limitations, and FAQ.

## 5. Address-input guidance

The Guide and inline help communicate these distinctions consistently:

- **Recipient address:** the frozen destination account. Receiving does not require Xaman when the account and selected Asset are compatible.
- **Expected payer address:** the exact sender account that must match the validated transaction. The payer must select the same account in Xaman.
- **Exchange withdrawal:** may originate from a shared hot wallet and may not preserve required tags, InvoiceID, Source Tag, Asset, or exact amount.
- **Manual transfer:** may move funds without settling the intended PaymentSlot and must not be suggested as a retry path.
- **X-address:** is decoded and reviewed before the canonical Classic Address and optional recipient Destination Tag are used.
- **Payer X-address with tag:** is rejected because Destination Tag semantics apply to the recipient, not the sender.
- **Wrong-network X-address:** is blocked.
- **Clipboard failure:** does not block direct typing or ordinary paste.

Recipient and payer address fields link directly to the public troubleshooting page without copying field values, addresses, Bill data, or capability fragments.

## 6. Saved-wallet guidance

The Guide and inline saved-wallet UI explain that:

- saving is explicit and never automatic;
- records remain in IndexedDB for the current origin and browser profile;
- records are filtered by recipient/payer role and Mainnet/Testnet identity;
- selecting a record fills only role-appropriate fields;
- a recipient record may fill label, Classic Address, and Destination Tag;
- a payer record fills label and Classic Address only;
- selecting a record never skips validation, readiness, review, freeze, wallet handoff, or validated-ledger verification;
- the same network and address may be reused for recipient and payer roles in one local record;
- edit and delete affect only future input assistance, not frozen Bills or ledger history;
- export and import are user-controlled and schema-validated;
- IndexedDB, quota, import, or local-record failure leaves direct address entry available;
- other users of the same browser profile may see local labels;
- private browsing, browser cleanup, storage eviction, or profile removal may erase records.

## 7. Troubleshooting page

`/troubleshooting` provides stable, public, symptom-based guidance for:

- invalid or checksum-failing Classic Addresses;
- X-address network mismatch, payer tag, and recipient Destination Tag conflict;
- clipboard permission or browser availability failure;
- a disabled `Save this wallet` action;
- a saved wallet missing from the current role or network filter;
- IndexedDB unavailability, blocked upgrade, private-browsing restriction, and quota failure;
- invalid, duplicate, excessive, or unsupported saved-wallet JSON import;
- a Xaman account that does not match the frozen expected payer;
- exchange withdrawals or ordinary manual transfers that do not settle a PaymentSlot;
- blocked or unavailable official RLUSD readiness.

Each troubleshooting topic includes:

- the visible symptom;
- the likely reason;
- ordered recovery actions;
- an explicit warning when retrying or using the wrong path may cause a repeated or unmatched payment.

The page also includes:

- safe address-entry steps;
- saved-wallet usage steps;
- the exact local-only storage boundary;
- links back to the Guide and Changelog.

The application exposes the page from:

- the home navigation and footer;
- the Guide;
- the public Changelog;
- recipient and payer address fields.

## 8. Search and navigation

Guide search matches localized section titles, paragraphs, and bullet guidance.

The search experience:

- does not change the stable section anchors;
- reports the matching section count through an accessible live region;
- provides a recoverable no-results state;
- supports `/` to focus search when the user is not editing another control;
- supports `Escape` to clear and leave the focused search control;
- keeps all displayed result links keyboard reachable;
- works in the mobile single-column and desktop sticky-navigation layouts.

The troubleshooting page provides a sticky table of contents on desktop, normal document flow on mobile, and stable public anchors for every symptom.

## 9. Contextual-help topics

The typed help registry covers:

- roles and payment modes;
- recipient and Destination Tag fields;
- settlement Asset and allocation fields;
- capability-link privacy;
- XRP, RLUSD, TrustSet, and general readiness;
- payment states and validated-ledger verification;
- safe recovery and review-required states;
- partial completion;
- incomplete closure and destructive confirmation;
- copy-to-revise;
- security limitations.

Recipient, payer, and saved-wallet surfaces may also provide localized inline guidance and a public troubleshooting link when the complete explanation does not justify a new modal help-topic identifier.

Each typed topic contains localized short guidance, localized detailed guidance, and one stable Guide target.

## 10. Private-flow safety

Opening contextual help:

- does not submit a form;
- does not create a Xaman request;
- does not authorize a retry;
- does not close a Bill;
- does not discard a draft;
- does not replace the active private page;
- restores focus to the trigger when closed.

Using address paste or X-address review:

- does not submit or freeze a Bill;
- does not create a wallet handoff;
- does not read the clipboard before explicit user interaction;
- does not save the address automatically.

Using saved wallets:

- does not call the Group Pay API or D1;
- does not change a frozen Bill or PaymentSlot;
- does not create or expose a capability link;
- does not create a Xaman request;
- does not attest account ownership;
- does not accept a payment or mark a slot paid.

Opening `/troubleshooting` is a public navigation action. It does not include the current private URL fragment, query, capability, Bill ID, PaymentSlot ID, address, label, InvoiceID, transaction hash, provider ID, receipt, proof, or draft data.

The modal help and saved-wallet panels support close-button, backdrop, and `Escape` dismissal and trap keyboard focus while open.

## 11. URL and capability privacy

Guide and troubleshooting URLs consist only of public paths and approved stable anchors.

They must not include:

- management, progress, payer, setup, or proof capabilities;
- query parameters copied from the active flow;
- payer or recipient addresses;
- saved-wallet labels or records;
- Bill titles or draft values;
- InvoiceIDs, provider identifiers, transaction identifiers, receipt data, or proof data.

Saved-wallet exports must also exclude all capability and Bill identity data.

Full Guide links opened in a new tab use `noopener`, `noreferrer`, and no referrer policy so the active private flow remains intact.

## 12. Accessibility and responsive behavior

The Guide, contextual help, address-input assistance, saved-wallet picker, and troubleshooting page require:

- visible keyboard focus;
- semantic headings and navigation labels;
- accessible search and clear controls;
- a modal dialog or sheet name and description;
- focus trapping and restoration after modal close;
- live status for clipboard, selection, save, import, delete, and storage failure;
- an explicit action before applying decoded X-address values;
- readable long Japanese and Korean text;
- mobile bottom-sheet and desktop side-panel layouts where applicable;
- a readable single-column troubleshooting flow on mobile;
- no reliance on color alone;
- keyboard-accessible record and navigation actions;
- no horizontal overflow for addresses, decoded details, saved-wallet records, or troubleshooting cards;
- usable behavior at 200% zoom.

## 13. Public Changelog

The in-application `/changelog` page records the wallet-input and saved-wallet release in English, Japanese, and Korean.

It includes:

- Classic Address and X-address safety changes;
- saved-wallet operations and privacy boundary;
- duplicate role handling;
- legacy empty-label handling;
- storage-unavailable fallback;
- invalid-import recovery;
- a direct link to `/troubleshooting`.

The app Changelog summarizes user-visible behavior. The repository `CHANGELOG.md` remains the fuller release and security record.

## 14. Validation

Automated coverage verifies:

- all stable Guide sections exist in every supported locale;
- all typed help topics exist in every supported locale;
- every help target is an approved Guide anchor;
- all troubleshooting topic IDs exist in English, Japanese, and Korean in the same order;
- every troubleshooting topic contains a title, symptom, cause, and at least three recovery actions;
- local-storage, direct-entry fallback, unsupported-transfer, and Xaman-mismatch warnings remain explicit;
- Guide, help, and troubleshooting links contain no query or capability fragment;
- search filtering, no-results recovery, slash focus, and Escape behavior;
- help open, close, protected-tab, and focus-restoration behavior;
- critical payer states resolve to the correct help family;
- address-format, X-address, network, tag, clipboard, saved-wallet, and troubleshooting guidance is key-equivalent in English, Japanese, and Korean;
- address assistance does not submit, freeze, create a handoff, or expose capability data;
- saved-wallet selection respects role and network filters;
- saved-wallet failure preserves direct input;
- exports contain only the approved local record fields;
- Next.js, Storybook, Worker, browser, and production UI regression gates remain green.
