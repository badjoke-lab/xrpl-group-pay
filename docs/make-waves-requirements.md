# XRPL Group Pay — Make Waves Requirements Register

**Status:** Active  
**Scope:** External requirements register  
**Last reviewed:** 2026-06-24  
**Document class:** Public  
**Primary source reviewed:** Make Waves Challenge Terms & Conditions, Version 1.0  
**Source last updated:** June 11, 2026

This document records confirmed requirements and unresolved interpretation questions. It does not replace the official Terms.

## 1. Challenge period

| Requirement | Status | Recorded value |
|---|---|---|
| Challenge start | Confirmed | June 21, 2026 |
| Challenge end | Confirmed | September 21, 2026 |
| Registration model | Confirmed | Continuous onboarding |
| Registration deadline | Confirmed | July 21, 2026 |
| Target network | Confirmed | XRPL Mainnet |

## 2. Mainnet Gate

The project must be live on XRPL Mainnet within 30 days of registration.

Unresolved:

- exact event that starts the 30-day clock;
- exact review and approval process;
- whether the metric start is submission or approval;
- how delayed review affects the deadline.

Written organizer clarification is required.

## 3. Source Tag

Confirmed:

- a project-specific Source Tag is assigned during registration;
- every relevant on-chain transaction carries that Source Tag;
- metrics are attributed through the Source Tag;
- activity before the Mainnet Gate does not count.

Implementation:

- Source Tag is deployment configuration;
- every accepted XRP and RLUSD Payment is checked for the configured Source Tag;
- Source Tag is not the Bill or participant identifier;
- PaymentSlot correlation uses InvoiceID.

## 4. Project requirements

Confirmed:

- legal compliance is required;
- substantial Challenge-period work is required;
- open-source libraries, AI assistance, templates, and frameworks are allowed;
- work may build on an existing project when substantial submitted value is Challenge-period work;
- harmful or manipulative projects are ineligible.

Whether work completed after June 21 but before registration is treated as Challenge-period work remains unresolved.

## 5. Active-account threshold

All listed prize paths require at least 300 new and distinctive active XRPL accounts attributed to the Source Tag by the end of the Challenge.

The recorded definition of an Active User is an XRPL address that signs at least one transaction carrying the project Source Tag.

Unresolved:

- meaning of `new` and `distinctive`;
- whether the transaction must be validated and successful;
- handling of failed transactions;
- exact deduplication method;
- whether an address can be new to more than one project.

## 6. Metrics

Confirmed:

- metrics use public XRPL Mainnet data;
- counting begins at the Mainnet Gate;
- off-chain metrics do not count toward on-chain prize metrics;
- Source Tag is the attribution mechanism;
- organizers may use heuristics and manual review;
- inorganic activity may be discounted.

Prohibited activity includes wash trading, Sybil behavior, self-dealing, scripted metric generation, and interference with another project's Source Tag.

### Group Pay metric interpretation

Expected, pending confirmation:

- each distinct successful payer signs one project Payment;
- the recipient does not sign that Payment and is not counted for it;
- only validated `tesSUCCESS` Payments accepted by Group Pay verification are counted;
- XRP volume is the sum of verified XRP delivered amount;
- RLUSD volume is the sum of verified official RLUSD delivered amount;
- XRP and RLUSD quantities are reported separately and are never added together.

Organizer confirmation is required on:

- whether an RLUSD Payment counts toward active-account and transaction metrics;
- how RLUSD contributes to the official volume metric;
- whether volume is asset-native, converted, or restricted to XRP;
- whether a user-signed RLUSD TrustSet carrying the Source Tag is a relevant project transaction.

Until confirmed, internal product metrics and official Challenge metrics remain separate.

## 7. Mainnet Gate deliverables

Required:

- working live XRPL Mainnet application;
- video pitch no longer than three minutes;
- pitch deck in Google Slides or PDF;
- public repository;
- clear README;
- license file;
- Source-Tag-attributable metrics summary covering unique users, volume, and transaction count.

Failure to meet required deliverables by the deadline is described as disqualifying.

Whether the video, deck, and metrics summary may be updated after the Gate remains unresolved.

Project quality additions, not separately confirmed official requirements:

- public Roadmap;
- public Changelog;
- XRP proof example;
- RLUSD proof example;
- architecture and non-custodial documentation.

## 8. Eligibility, ownership, and KYC

- age, capacity, sanctions, location, and local-law requirements apply;
- KYC is required before prize disbursement;
- territorial restrictions may affect eligibility and payment;
- local tax responsibility remains with the recipient;
- the repository does not store Challenge KYC data;
- the participant retains project ownership and selects the license;
- third-party and AI-assisted material must respect third-party rights.

## 9. Requirement-to-implementation matrix

| Requirement | Implementation evidence |
|---|---|
| XRPL Mainnet application | Production deployment and controlled Mainnet tests |
| Source Tag | XRP and RLUSD builder tests plus verified proofs |
| Live onboarding | Mobile and desktop production flows |
| Public code | Public repository |
| README and license | Root project files |
| Video | Submitted video of no more than three minutes |
| Pitch deck | Submitted PDF or Slides deck |
| Unique-user metrics | Distinct successful signer aggregation |
| XRP volume | Verified XRP delivered amount |
| RLUSD volume | Separate verified RLUSD delivered amount, pending official treatment |
| Transaction count | Validated successful project transaction aggregation |
| Organic activity | Test labeling and no artificial metric generation |

## 10. Mainnet evidence target

The project aims to prepare:

- controlled XRP Mainnet transaction and proof;
- controlled official RLUSD Mainnet transaction and proof;
- Source Tag evidence for both;
- distinct signer, transaction, XRP volume, and RLUSD volume summaries;
- explanation that unlike asset quantities are not combined.

RLUSD remains a product target even if organizer metric treatment differs from XRP.

## 11. Open organizer questions

1. What starts the 30-day period?
2. Does pre-registration work after June 21 count?
3. How is the Mainnet Gate demonstrated and approved?
4. Are all deliverables due within the initial 30 days?
5. What exactly is a new and distinctive active account?
6. Must counted transactions be validated and successful?
7. Does each distinct Group Pay payer count?
8. What is the exact scope of relevant on-chain transaction?
9. How is XRP Payment volume calculated?
10. Do RLUSD Payments count toward active accounts and transaction count?
11. How is RLUSD volume reported or converted?
12. Does a project TrustSet count as a relevant transaction?
13. Where are the current Code of Conduct and metric methodology documents?

## 12. Change control

Update this register when organizers respond, Terms change, a metric methodology or Code of Conduct is published, the Source Tag is assigned, or Mainnet Gate instructions are received.

Each update records date, source, changed requirement, and implementation impact.
