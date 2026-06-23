# XRPL Group Pay — Make Waves Requirements Register

**Status:** Draft for PR 1  
**Document class:** Public  
**Primary source reviewed:** Make Waves Challenge Terms & Conditions, Version 1.0  
**Source last updated:** June 11, 2026

This document records confirmed Challenge requirements and unresolved interpretation questions. It does not replace the official Terms.

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

The Terms describe the metrics start as the date on which the participant has demonstrated to the XRPL team that the application is live on Mainnet and can onboard users.

### Unresolved

- Exact event that starts the 30-day clock.
- Exact Mainnet Gate review process.
- Whether the metric start date is submission or approval.
- Whether a failed or delayed review affects the 30-day requirement.

These items require written organizer clarification.

## 3. Source Tag

Confirmed requirements:

- A project-specific Source Tag is assigned during registration.
- Every relevant on-chain transaction must carry the assigned Source Tag.
- On-chain metrics are attributed using that Source Tag.
- Activity before the Mainnet Gate does not count toward Challenge metrics.

Implementation consequence:

- Source Tag is deployment configuration.
- Source Tag is verified on every accepted project transaction.
- Source Tag is not used as the bill or participant identifier.
- Payment-slot correlation uses a separate InvoiceID.

## 4. Project requirements

Confirmed:

- The project must comply with applicable law.
- The project must be substantial work developed during the Challenge period.
- Open-source libraries, AI assistants, templates, and frameworks are allowed.
- A participant may build on an existing project, but the substantial value submitted must be developed during the Challenge.
- Projects intended to manipulate, defraud, or harm users are ineligible.

### Unresolved

Whether substantial work completed after June 21 but before project registration is treated as Challenge-period work requires clarification.

## 5. Prize thresholds

The Terms define prize categories totaling up to 50,000 XRP.

All listed prize paths require at least 300 new and distinctive active XRPL accounts attributed to the project Source Tag by the end of the Challenge.

The Terms define an Active User as an XRPL address that has signed at least one transaction carrying the project Source Tag.

### Unresolved

- Meaning of “new”.
- Whether the transaction must be validated and successful.
- Whether only transactions initiated through the application count.
- Exact handling of failed transactions.
- Exact deduplication methodology.
- Whether an address already attributed to another project can be considered new to this project.

## 6. Metrics

Confirmed:

- Metrics are computed from public XRPL Mainnet data.
- Counting begins at the Mainnet Gate.
- Off-chain metrics do not count toward the on-chain prize metrics.
- Source Tag is the attribution mechanism.
- The organizers may use heuristics and manual review.
- The organizers may discount activity reasonably believed to be inorganic.

Prohibited:

- Wash trading.
- Sybil attacks.
- Self-dealing.
- Scripted transactions.
- Other metric manipulation.
- Interfering with another participant's Source Tag.

### Group Pay metric interpretation requiring confirmation

Expected interpretation:

- Each distinct payer signs one XRP Payment carrying the Source Tag.
- Each distinct payer address can be an active account.
- The receiving bill-creator address does not sign that Payment and therefore is not counted for that transaction.
- Payment volume should reflect successfully delivered XRP.

This remains an assumption until organizer confirmation.

## 7. Mainnet Gate deliverables

The Terms require the following by the Mainnet Gate:

- Working live application integrated with XRPL Mainnet.
- Short video pitch, maximum three minutes.
- Pitch deck in Google Slides or PDF.
- Public GitHub repository or equivalent.
- Clear README.
- License file.
- Brief Source-Tag-attributable metrics summary:
  - Unique users.
  - Total on-chain volume.
  - Number of transactions.

Failure to meet a required deliverable by the deadline is described as disqualifying.

### Unresolved

Whether the video, deck, and metrics summary may be updated after the Mainnet Gate and before the Challenge closes.

## 8. Eligibility and KYC

Confirmed:

- Participants must meet the age, capacity, sanctions, location, and local-law requirements in the Terms.
- KYC is mandatory before prize disbursement.
- Prize eligibility and payment may be affected by territorial restrictions.
- Local tax responsibility remains with the recipient.

Operational consequence:

- The application repository does not store KYC data.
- Challenge KYC is handled between the participant and the organizer or its provider.

## 9. Intellectual property

Confirmed:

- The participant retains ownership of the project.
- The participant selects the project license.
- A public repository with a license file is required by the relevant deliverable deadline.
- The participant grants XRPL Commons a limited license to display project identification and promotional material related to the Challenge.
- Third-party and AI-generated material must not infringe third-party rights.

## 10. Code of conduct and additional documents

The Terms state that:

- A separate Code of Conduct may be incorporated.
- A metric methodology document may be part of the agreement.
- Other referenced documents may also apply.

Current status: organizer copy or official links requested.

## 11. Requirement-to-implementation matrix

| Requirement | Implementation evidence |
|---|---|
| XRPL Mainnet application | Mainnet deployment and controlled transaction test |
| Source Tag on relevant transactions | Transaction-builder test and verified transaction proof |
| Live onboarding | Mobile and desktop production flow |
| Public code | Public repository |
| README | Root README with setup, architecture, safety, and limitations |
| License | Root license file |
| Video | Maximum-three-minute submitted video |
| Pitch deck | Submitted PDF or Slides deck |
| Unique-user metrics | Distinct successful signer-address aggregation |
| Volume | Successful delivered XRP aggregation, subject to methodology confirmation |
| Transaction count | Validated successful project-transaction aggregation |
| No metric manipulation | Test activity labeling, organic-use records, no artificial transaction generation |

## 12. Open organizer questions

1. What starts the 30-day period?
2. Does pre-registration work after June 21 count as Challenge-period work?
3. How is the Mainnet Gate demonstrated and approved?
4. Are all deliverables due within the initial 30 days?
5. What exactly does “new and distinctive active account” mean?
6. Must counted transactions be validated and successful?
7. Does each distinct Group Pay payer count?
8. What is the exact scope of “relevant on-chain transaction”?
9. How is Payment volume calculated?
10. Where are the current Code of Conduct and metric methodology documents?

## 13. Change control

This register must be updated when:

- Organizers respond in writing.
- Terms are updated.
- A metric methodology document is published.
- A Code of Conduct is published.
- The Source Tag is assigned.
- Mainnet Gate instructions are received.

Each update records the date, source, changed requirement, and implementation impact.
