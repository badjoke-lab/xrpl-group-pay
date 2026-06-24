# XRPL Group Pay — Screen Inventory

**Status:** Active  
**Scope:** Approved Make Waves v1 screens and future extension placeholders  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Priority

- **P0:** required for the end-to-end payment flow.
- **P1:** required before Make Waves v1 Mainnet release.
- **P2:** post-submission enhancement.

## 2. Common and public

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| A01 | Landing | New user | P1 | Default, Testnet, Mainnet |
| A02 | Network warning | Creator/payer | P1 | Testnet explanation, Mainnet confirmation |
| A03 | Language selector | All | P1 | English, Japanese, Korean, fallback |
| A04 | Public Roadmap | Public | P1 | Available, In Progress, Next, Later, Research |
| A05 | Changelog | Public | P1 | Unreleased, releases, empty category |

## 3. Bill creation

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| B01 | Bill basics and asset | Creator | P0 | XRP, RLUSD, invalid destination |
| B02 | Split method | Creator | P0 | Equal, Percentage, Shares, Custom |
| B03 | Participants and allocation | Creator | P0 | Incomplete, under, exact, over, remainder |
| B04 | RLUSD readiness | Creator | P0 for RLUSD | Checking, ready, missing line, blocked, unavailable |
| B05 | Review and freeze | Creator | P0 | Testnet, Mainnet, XRP, RLUSD |
| B06 | Bill created and share | Creator | P0 | Individual links, copy success, QR |

## 4. Participant payment

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| C01 | Payment details | Payer | P0 | Unpaid, expired, already paid |
| C02 | Final asset confirmation | Payer | P0 | XRP, RLUSD, Testnet, Mainnet |
| C03 | Wallet Handoff | Payer | P0 | Xaman deep link, QR, unavailable |
| C04 | Awaiting wallet approval | Payer | P0 | Available, opened, pending |
| C05 | Rejected or expired | Payer | P0 | Rejected, expired, safe retry |
| C06 | Ledger verification | Payer | P0 | Not found, unvalidated, checking |
| C07 | Payment verified | Payer | P0 | XRP verified, RLUSD verified, Bill settled |
| C08 | Verification exception | Payer/creator | P0 | Sender, destination, asset, issuer, amount, duplicate |
| C09 | Asset details | Payer | P1 | Native XRP, official RLUSD issuer, fee asset |

## 5. Bill management

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| D01 | Mobile Bill progress | Creator/viewer | P0 | Open, partial, validating, settled |
| D02 | Settlement complete | Creator/viewer | P0 | XRP, RLUSD, proof available |
| D03 | Cancel Bill | Creator | P1 | Eligible, blocked by accepted payment |
| D04 | Expired Bill | Creator/viewer | P1 | Close, future extension policy |

## 6. Desktop creator workspace

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| E01 | Dashboard | Creator | P1 | Empty, active Bills, mixed assets |
| E02 | Bill list | Creator | P1 | Search, filter, empty |
| E03 | Bill detail | Creator | P0 | Open, partial, settled, review |
| E04 | Desktop Bill creation | Creator | P1 | Asset and split editing |
| E05 | Transaction proof | Creator/viewer | P0 | XRP, issued asset, unavailable |
| E06 | Settings | Creator | P1 | Language, network, future wallet preferences |

## 7. Future quote and mixed-asset screens

These are P2 and must not appear as enabled controls in Make Waves v1.

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| F01 | Accounting Currency | Creator | P2 | JPY, USD, KRW, EUR |
| F02 | Allowed Settlement Assets | Creator | P2 | One asset, multiple assets, per-slot assignment |
| F03 | Settlement Quote | Payer | P2 | Active, expired, replaced |
| F04 | Manual adjustment review | Creator/payer | P2 | Suggested, adjusted, reason, reconfirmation |

## 8. Mock and regression set

### Mobile

- M01 — Bill basics and asset.
- M02 — Split method and participants.
- M03 — RLUSD readiness.
- M04 — Review and share.
- M05 — Payment details.
- M06 — Final confirmation.
- M07 — Xaman handoff and waiting.
- M08 — Ledger verification.
- M09 — Verified payment.
- M10 — Bill progress and settlement.

### Desktop

- P01 — Dashboard.
- P02 — Bill detail.
- P03 — Bill creation.
- P04 — XRP proof.
- P05 — RLUSD proof.
- P06 — Roadmap and Changelog.

### State sheet

- empty;
- loading;
- rejected;
- expired;
- invalid capability;
- wrong network;
- wrong asset;
- wrong issuer;
- missing trust line;
- duplicate transaction;
- unavailable provider;
- settled.

## 9. Required fixtures

Every critical screen is reviewed with:

- short and maximum-length Bill title;
- empty and maximum-length participant label;
- small and large XRP amount;
- small and large RLUSD amount;
- official and wrong issuer;
- trust line ready and missing;
- Destination Tag present and absent;
- Testnet and Mainnet;
- full and shortened addresses;
- long transaction identifier;
- Equal, Percentage, Shares, and Custom allocation;
- English, Japanese, and Korean;
- long Japanese and Korean strings;
- loading and error states.

## 10. Completion checklist

A screen is complete when actor, authorization, entry and exit routes, loading, empty, success, failure, mobile/desktop behavior, accessibility names, focus behavior, network presentation, localization, privacy-safe logging, and visual-regression fixtures are defined.
