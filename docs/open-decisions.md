# XRPL Group Pay — Open Decisions

**Status:** Draft for PR 1  
**Document class:** Public

This register contains product, technical, and official-requirement decisions that affect implementation.

## Status values

```text
OPEN
ASSUMPTION
BLOCKED
DECIDED
SUPERSEDED
```

## Decision register

| ID | Question | Current assumption or decision | Evidence required | Decision deadline | Status |
|---|---|---|---|---|---|
| OD-001 | What starts the Make Waves 30-day Mainnet period? | Do not encode a date assumption | Written organizer response | Before Challenge registration | BLOCKED |
| OD-002 | How is the Mainnet Gate demonstrated and approved? | Prepare all listed deliverables for one gate submission | Organizer instructions | Before Challenge registration | BLOCKED |
| OD-003 | What does “new and distinctive active account” mean? | Distinct signer address using the project after Mainnet Gate | Metric methodology or organizer response | Before metrics implementation | BLOCKED |
| OD-004 | Must counted transactions be validated and successful? | Count only validated `tesSUCCESS` transactions accepted by verification | Metric methodology or organizer response | Before metrics implementation | ASSUMPTION |
| OD-005 | How is Payment volume calculated? | Sum verified XRP `delivered_amount` | Metric methodology or organizer response | Before metrics implementation | ASSUMPTION |
| OD-006 | Xaman SDK or direct REST wrapper on Cloudflare Workers? | Prefer server SDK if compatibility and dependency review pass | PR 2 runtime spike | PR 2 | OPEN |
| OD-007 | Primary hosting platform? | Cloudflare Workers first; alternative only after measured incompatibility | Deployment spike and security review | PR 2 | ASSUMPTION |
| OD-008 | Database? | Cloudflare D1 after runtime decision | Atomicity, unique constraint, migration tests | PR 2 | ASSUMPTION |
| OD-009 | ORM or typed SQL? | Use the smallest layer that preserves migrations and types | Bundle/runtime comparison | PR 2 | OPEN |
| OD-010 | Primary XRPL endpoints and failover? | One configured primary and one independent failover per network | Reliability and rate-limit review | PR 4 | OPEN |
| OD-011 | Participant identity in initial MVP? | Creator provides expected XRPL address | Usability test | PR 1 decision, revisit after PR 5 | ASSUMPTION |
| OD-012 | Future self-claim flow? | Xaman SignIn can bind a wallet to an open slot | Threat model and user test | Post-MVP | OPEN |
| OD-013 | Destination Tag behavior? | Optional input; exact match when present | Recipient account checks and UX test | PR 3 | ASSUMPTION |
| OD-014 | One active Xaman payload per slot? | Yes, expire or resolve before replacement | Xaman lifecycle test | PR 3 | ASSUMPTION |
| OD-015 | Payload expiry length? | Use a conservative Xaman-supported period | Xaman current limits and mobile test | PR 3 | OPEN |
| OD-016 | Bill expiry behavior? | No deadline in first vertical slice; explicit deadline in completed v1 | Product test | PR 8 | DECIDED |
| OD-017 | Mainnet per-payment upper limit? | Configurable conservative limit | Risk review and controlled test plan | Before Mainnet | OPEN |
| OD-018 | Retention schedule? | Use privacy-data-map initial schedule | Privacy and operations review | Before Mainnet | ASSUMPTION |
| OD-019 | Public proof default fields? | On-chain facts; participant label hidden by default | Privacy review | PR 13 | ASSUMPTION |
| OD-020 | Initial UI languages? | English first, localization-ready architecture | Submission and user needs | PR 2 | DECIDED |
| OD-021 | Public license? | Apache License 2.0 | Root `LICENSE` and dependency compatibility review | Repository creation | DECIDED |
| OD-022 | Production domain? | Dedicated badjoke-lab subdomain or standalone domain | Deployment and naming review | Before public preview | OPEN |
| OD-023 | Authentication beyond capability URLs? | No account system in initial MVP | Security and usability test | After PR 5 | ASSUMPTION |
| OD-024 | Analytics? | No third-party analytics on capability routes | Privacy review | PR 2 | ASSUMPTION |
| OD-025 | Error monitoring provider? | Optional only with strict redaction | Secret/capability leakage test | Before Mainnet | OPEN |
| OD-026 | Circle integration boundary? | Keep payment verification reusable; do not implement Circle entities in MVP | Architecture review | PR 1 | DECIDED |

## Decision record template

```markdown
### OD-XXX — Decision title

- Status:
- Date:
- Decision:
- Context:
- Alternatives:
- Evidence:
- Consequences:
- Follow-up:
```

## Change rule

A decision that changes the non-custodial boundary, verification contract, network separation, or on-chain data exposure requires updates to all affected PR 1 documents before implementation.
