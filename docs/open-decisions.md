# XRPL Group Pay — Open Decisions

**Status:** Active  
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
| OD-006 | Xaman SDK or direct REST wrapper on Cloudflare Workers? | Use a small server-only REST wrapper around the official payload endpoints | Official API contract, credential-boundary tests, and OpenNext Worker build | Testnet payment handoff | DECIDED |
| OD-007 | Primary hosting platform? | Cloudflare Workers through OpenNext; change only after measured incompatibility | Next.js build, OpenNext Worker build, and later production smoke test | Application foundation | DECIDED |
| OD-008 | Database? | Cloudflare D1 after runtime decision | Atomicity, unique constraint, and migration tests | Persistence PR | ASSUMPTION |
| OD-009 | ORM or typed SQL? | Use the smallest layer that preserves migrations and types | Bundle and runtime comparison | Persistence PR | OPEN |
| OD-010 | Primary XRPL endpoints and failover? | Query Ripple Testnet first and XRPL Labs Testnet second with `tx` API v2 | Official public-server list, failover tests, and Worker build | Validated-ledger verification | DECIDED |
| OD-011 | Participant identity in initial MVP? | Creator provides expected XRPL address | Usability test | Initial group-payment flow | ASSUMPTION |
| OD-012 | Future self-claim flow? | Xaman SignIn can bind a wallet to an open slot | Threat model and user test | Post-MVP | OPEN |
| OD-013 | Destination Tag behavior? | Optional in the Sign Request; ledger verification requires exact presence and value | Verification tests | Validated-ledger verification | DECIDED |
| OD-014 | One active Xaman payload per slot? | Yes, expire or resolve before replacement | Persistence model and Xaman lifecycle test | Participant-slot PR | ASSUMPTION |
| OD-015 | Payload expiry length? | Five minutes; treat expiry as open/scan-before and allow a signed late resolution to become submitted | Official Xaman payload behavior and status tests | Testnet payment handoff | DECIDED |
| OD-016 | Bill expiry behavior? | No deadline in first vertical slice; explicit deadline in completed v1 | Product test | Completed v1 flow | DECIDED |
| OD-017 | Mainnet per-payment upper limit? | Configurable conservative limit | Risk review and controlled test plan | Before Mainnet | OPEN |
| OD-018 | Retention schedule? | Use privacy-data-map initial schedule | Privacy and operations review | Before Mainnet | ASSUMPTION |
| OD-019 | Public proof default fields? | On-chain facts; participant label hidden by default | Privacy review | Public proof PR | ASSUMPTION |
| OD-020 | Initial UI languages? | English first, localization-ready architecture | Submission and user needs | Application foundation | DECIDED |
| OD-021 | Public license? | Apache License 2.0 | Root `LICENSE` and dependency compatibility review | Repository creation | DECIDED |
| OD-022 | Production domain? | Dedicated badjoke-lab subdomain or standalone domain | Deployment and naming review | Before public preview | OPEN |
| OD-023 | Authentication beyond capability URLs? | No account system in initial MVP | Security and usability test | After initial group-payment flow | ASSUMPTION |
| OD-024 | Analytics? | No third-party analytics on capability routes | Privacy review | Before public preview | ASSUMPTION |
| OD-025 | Error monitoring provider? | Optional only with strict redaction | Secret and capability leakage test | Before Mainnet | OPEN |
| OD-026 | Circle integration boundary? | Keep payment verification reusable; do not implement Circle entities in MVP | Architecture review | Product specification | DECIDED |
| OD-027 | What is the source of expected Payment values during verification? | Server-fetch the Xaman payload by UUID and use its original template, signer, and txid; never trust client-supplied expected fields | Xaman response types and tamper-boundary tests | Validated-ledger verification | DECIDED |
| OD-028 | When is duplicate processing durably prevented? | Emit `testnet:<txid>` now; claim durable prevention only after a database unique constraint exists | Persistence and concurrency tests | Persistence PR | DECIDED |

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

A decision that changes the non-custodial boundary, verification contract, network separation, or on-chain data exposure requires updates to all affected product documents before implementation.
