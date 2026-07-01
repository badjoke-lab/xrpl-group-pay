# XRPL Group Pay — Screen Inventory

**Status:** Active  
**Scope:** Approved payment-lifecycle screens and future extension placeholders  
**Last reviewed:** 2026-07-01  
**Document class:** Public

## 1. Priority

- **P0:** required for the end-to-end payment-lifecycle revision.
- **P1:** required for complete guidance, management, and public release quality.
- **P2:** post-revision enhancement.

## 2. Common and public

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| A01 | Landing | New user | P1 | Default, Testnet, Mainnet |
| A02 | Network warning | Bill operator/payer | P0 | Testnet explanation, Mainnet confirmation |
| A03 | Language selector | All | P0 | English, Japanese, Korean, fallback |
| A04 | Public Roadmap | Public | P1 | Available, In Progress, Next, Later, Research |
| A05 | Changelog | Public | P1 | Unreleased, releases, empty category |
| A06 | Guide | Public | P0 | Overview, modes, roles, XRP, RLUSD, failures, statuses, security, FAQ |
| A07 | Contextual help | All | P0 | Desktop side panel, mobile bottom sheet, Guide link, close and restore |

## 3. Bill creation

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| B01 | Payment-mode selection | Bill operator | P0 | Representative, direct, selected, help |
| B02 | Recipient details | Bill operator | P0 | Representative recipient, external recipient, invalid address, tag |
| B03 | Bill and asset details | Bill operator | P0 | XRP, RLUSD, Testnet, Mainnet, invalid total |
| B04 | Recipient-funded amount | Bill operator | P0 representative only | Disabled, enabled, valid, invalid, no-transfer explanation |
| B05 | Split method | Bill operator | P0 | Equal, Percentage, Shares, Custom |
| B06 | Payers and allocation | Bill operator | P0 | Incomplete, under, exact, over, duplicate payer, recipient conflict, remainder |
| B07 | Add operator as payer | Bill operator | P0 direct only | Not included, included, incomplete, valid |
| B08 | RLUSD recipient readiness | Bill operator/recipient | P0 for RLUSD | Checking, ready, missing line, blocked, unavailable |
| B09 | Recipient RLUSD setup/share | Bill operator/recipient | P0 for RLUSD | TrustSet handoff, rejected, expired, verifying, ready, copy instructions |
| B10 | Review and freeze | Bill operator | P0 | Representative, direct, XRP, RLUSD, Testnet, Mainnet |
| B11 | Bill created and share | Bill operator | P0 | Management, read-only, participant, recipient-readiness links; copy success |
| B12 | Draft recovery | Bill operator | P1 | Restored, discarded, invalidated by incompatible schema |

## 4. Payer payment

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| C01 | Payment details | Payer | P0 | Unpaid, closed, already paid, invalid capability |
| C02 | Payer readiness | Payer | P0 | Checking, ready, missing trust line, insufficient RLUSD, insufficient XRP, unavailable |
| C03 | RLUSD TrustSet setup | Payer | P0 for RLUSD | Create, QR/deep link, rejected, expired, submitted, verifying, ready |
| C04 | Final asset confirmation | Payer | P0 | XRP, RLUSD, Testnet, Mainnet |
| C05 | Wallet Handoff | Payer | P0 | Xaman deep link, QR, resumed, unavailable |
| C06 | Awaiting wallet approval | Payer | P0 | Available, opened, pending |
| C07 | Rejected or expired | Payer | P0 | Rejected, expired, reconciliation, safe retry |
| C08 | Ledger verification | Payer | P0 | Not found, unvalidated, checking, temporarily unavailable |
| C09 | Payment verified | Payer | P0 | XRP verified, RLUSD verified, Bill partial, Bill settled |
| C10 | Retry required | Payer | P0 | Validated failure, setup corrected, safe retry |
| C11 | Needs review | Payer/Bill operator | P0 | Sender, recipient, asset, issuer, amount, tags, InvoiceID, partial, multiple candidates |
| C12 | Already paid | Payer | P0 | Existing receipt, no new Payment |
| C13 | Asset details | Payer | P1 | Native XRP, official RLUSD issuer, fee asset, trust line |

## 5. Bill management

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| D01 | Mobile Bill progress | Bill operator/viewer | P0 | Accepting, partial, review, settled, closed incomplete |
| D02 | Desktop Bill detail | Bill operator | P0 | Mode totals, payer states, management actions |
| D03 | Payer detail card | Bill operator | P0 | Unpaid, waiting, verifying, paid, retry, review, closed |
| D04 | Settlement complete | Bill operator/viewer | P0 | XRP, RLUSD, proof available |
| D05 | Review comparison | Bill operator | P0 | Expected versus observed, Explorer, recheck |
| D06 | Retry authorization | Bill operator | P0 | Double-payment warning, confirm, cancel |
| D07 | Close incomplete | Bill operator | P0 | Eligible, unresolved warning, confirm, completed |
| D08 | Closed-incomplete summary | Bill operator/viewer | P0 | Paid count, verified amount, unpaid amount, no refund |
| D09 | Copy to new draft | Bill operator | P1 | Copy, edit new draft, new identities, original unchanged |
| D10 | Read-only progress | Viewer | P0 | Redacted payer states, no management controls |

## 6. Capability and sharing surfaces

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| E01 | Management capability card | Bill operator | P0 | Copy, privacy warning, open |
| E02 | Read-only progress capability card | Bill operator | P0 | Copy, redaction explanation, open |
| E03 | Participant payment capability card | Bill operator | P0 | Payer label, amount, copy link, copy instructions |
| E04 | RLUSD preparation instruction card | Bill operator | P0 for RLUSD | Recipient or payer preparation, copy success |
| E05 | Public transaction proof | Public/viewer | P0 | XRP, issued asset, unavailable, digest mismatch |

## 7. Future workspace and extension screens

These are P2 and must not appear as enabled controls in the payment-lifecycle revision unless separately implemented.

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| F01 | Dashboard | Bill operator | P2 | Empty, active Bills, mixed assets |
| F02 | Bill list | Bill operator | P2 | Search, filter, empty |
| F03 | Settings | Bill operator | P2 | Language, network, future wallet preferences |
| F04 | Accounting Currency | Bill operator | P2 | JPY, USD, KRW, EUR |
| F05 | Allowed Settlement Assets | Bill operator | P2 | One asset, multiple assets, per-slot assignment |
| F06 | Settlement Quote | Payer | P2 | Active, expired, replaced |
| F07 | Manual adjustment review | Bill operator/payer | P2 | Suggested, adjusted, reason, reconfirmation |

## 8. Mock and regression set

### Mobile

- M01 — Payment-mode selection.
- M02 — Representative recipient and Bill details.
- M03 — Direct recipient and operator-as-payer.
- M04 — Split method and payer cards.
- M05 — RLUSD recipient readiness and TrustSet.
- M06 — Review and share.
- M07 — Payment details and payer readiness.
- M08 — RLUSD payer TrustSet.
- M09 — Final confirmation.
- M10 — Xaman handoff and waiting.
- M11 — Ledger verification.
- M12 — Retry required.
- M13 — Needs review.
- M14 — Verified payment.
- M15 — Bill progress, partial completion, and closure.
- M16 — Contextual help and Guide return.

### Desktop

- P01 — Representative Bill creation.
- P02 — Direct-recipient Bill creation.
- P03 — Created Bill and capability sharing.
- P04 — Bill detail with mixed payer states.
- P05 — Review comparison and retry authorization.
- P06 — Closed-incomplete summary and copy-to-revise.
- P07 — XRP proof.
- P08 — RLUSD proof.
- P09 — Guide and contextual help.
- P10 — Roadmap and Changelog.

### State sheet

- empty;
- loading;
- unpaid;
- waiting for Xaman;
- rejected;
- expired;
- verifying;
- temporarily unavailable;
- missing trust line;
- insufficient RLUSD;
- insufficient XRP;
- wrong network;
- wrong payer;
- wrong recipient;
- wrong asset;
- wrong issuer;
- wrong amount;
- wrong tags or InvoiceID;
- partial or cross-currency Payment;
- duplicate transaction;
- multiple candidate transactions;
- retry required;
- needs review;
- paid;
- partially paid;
- all paid;
- closed incomplete;
- invalid capability.

## 9. Required fixtures

Every critical screen is reviewed with:

- representative and direct modes;
- Bill operator equal to and different from recipient;
- operator included and not included as payer in direct mode;
- recipient-funded amount absent, zero, and positive where permitted;
- short and maximum-length Bill title;
- empty and maximum-length payer label;
- small and large XRP amount;
- small and large RLUSD amount;
- official and wrong issuer;
- trust line ready and missing;
- sufficient and insufficient RLUSD;
- sufficient and insufficient spendable XRP;
- Destination Tag present and absent;
- Testnet and Mainnet;
- full and shortened addresses;
- long transaction identifier;
- Equal, Percentage, Shares, and Custom allocation;
- English, Japanese, and Korean;
- long English, Japanese, and Korean strings;
- contextual help open and closed;
- loading, error, pending, review, paid, and closed states;
- 320px, 390px, and desktop supported widths.

## 10. Completion checklist

A screen is complete when actor, authorization, entry and exit routes, loading, empty, success, failure, recovery, mobile/desktop behavior, accessibility names, focus behavior, network presentation, localization, privacy-safe logging, contextual help, Guide link, semantic status, and visual-regression fixtures are defined.
