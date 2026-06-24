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
| OD-008 | Database? | Cloudflare D1 with versioned migrations; begin with verified Payment receipts and add bill entities in later migrations | Local D1 migration application, uniqueness tests, and OpenNext Worker build | Verified receipt persistence | DECIDED |
| OD-009 | ORM or typed SQL? | Use prepared typed SQL through a minimal D1 contract; do not add an ORM until measured schema complexity justifies it | Strict TypeScript, adapter tests, migration tests, and Worker build | Verified receipt persistence | DECIDED |
| OD-010 | Primary XRPL endpoints and failover? | Query Ripple Testnet first and XRPL Labs Testnet second with `tx` API v2 | Official public-server list, failover tests, and Worker build | Validated-ledger verification | DECIDED |
| OD-011 | Participant identity in initial MVP? | Creator provides expected XRPL address | Usability test | Initial group-payment flow | ASSUMPTION |
| OD-012 | Future self-claim flow? | Xaman SignIn can bind a wallet to an open slot | Threat model and user test | Post-MVP | OPEN |
| OD-013 | Destination Tag behavior? | Optional in the Sign Request; ledger verification requires exact presence and value | Verification tests | Validated-ledger verification | DECIDED |
| OD-014 | One active Xaman payload per slot? | Yes, expire or resolve before replacement | Persistence model and Xaman lifecycle test | Participant-slot PR | ASSUMPTION |
| OD-015 | Payload expiry length? | Five minutes; treat expiry as open/scan-before and allow a signed late resolution to become submitted | Official Xaman payload behavior and status tests | Testnet payment handoff | DECIDED |
| OD-016 | Bill expiry behavior? | No deadline in first vertical slice; explicit deadline in completed v1 | Product test | Completed v1 flow | DECIDED |
| OD-017 | Mainnet per-payment upper limit? | Configurable conservative limit | Risk review and controlled test plan | Before Mainnet | OPEN |
| OD-018 | Retention schedule? | Use privacy-data-map initial schedule | Privacy and operations review | Before Mainnet | ASSUMPTION |
| OD-019 | Public proof default fields? | Publish only verified public XRPL facts and the proof digest; hide bill titles, participant labels, capability values, expected pre-payment data, operational timestamps, Xaman payload identifiers, and internal IDs | Privacy-redaction, schema, API, and UI tests | Public proof PR | DECIDED |
| OD-020 | Initial UI languages? | English first, localization-ready architecture | Submission and user needs | Application foundation | DECIDED |
| OD-021 | Public license? | Apache License 2.0 | Root `LICENSE` and dependency compatibility review | Repository creation | DECIDED |
| OD-022 | Production domain? | Dedicated badjoke-lab subdomain or standalone domain | Deployment and naming review | Before public preview | OPEN |
| OD-023 | Authentication beyond capability URLs? | No account system in initial MVP | Security and usability test | After initial group-payment flow | ASSUMPTION |
| OD-024 | Analytics? | No third-party analytics on capability routes | Privacy review | Before public preview | ASSUMPTION |
| OD-025 | Error monitoring provider? | Optional only with strict redaction | Secret and capability leakage test | Before Mainnet | OPEN |
| OD-026 | Circle integration boundary? | Keep payment verification reusable; do not implement Circle entities in MVP | Architecture review | Product specification | DECIDED |
| OD-027 | What is the source of expected Payment values during verification? | Server-fetch the Xaman payload by UUID and use its original template, signer, and txid; never trust client-supplied expected fields | Xaman response types and tamper-boundary tests | Validated-ledger verification | DECIDED |
| OD-028 | When is duplicate processing durably prevented? | Enforce unique `network + transaction_id` and `network + invoice_id`, then atomically insert or reuse the receipt, mark the slot paid, and recompute the bill; exact retries are idempotent and a competing transaction is rejected | D1 migration, readback, conflict, and concurrent-winner tests | Bill and slot persistence | DECIDED |
| OD-029 | Which fields define an identical verified Payment proof? | Hash immutable ledger and expected-Payment facts; exclude verification and receipt observation timestamps so later re-verification remains idempotent | Re-verification test with different observation timestamps | Verified receipt persistence | DECIDED |
| OD-030 | What does a read-only bill-progress capability reveal? | Show amounts, slot states, and verified public transaction references; hide participant labels, expected payer addresses, and InvoiceIDs. The creator capability may show the full management view | Capability-role, redaction, API, and UI tests | Bill progress view | DECIDED |
| OD-031 | How is a public proof addressed and checked? | Use the receipt proof digest as a public URL-fragment identifier, retrieve it through a unique D1 index, and recompute the digest before publication. Viewing reads the durable receipt and does not mutate or resubmit the transaction | Migration uniqueness check, digest-mismatch test, API test, and browser smoke test | Public proof PR | DECIDED |
| OD-032 | When does a creator draft become a published Bill? | Keep the editable draft browser-local, run a no-write server review through the same normalization contract, and create the frozen `open` Bill only after explicit final confirmation | Shared validation tests, no-write API test, component state test, and browser flow | Bill review flow | DECIDED |
| OD-033 | When may the participant flow create a Xaman Sign Request? | First load the frozen capability-bound Payment details without writes, then require an explicit final confirmation of amount, destination, signer, tags, InvoiceID, and Testnet before payload creation | No-write API test, payload-call ordering test, state tests, and desktop/mobile browser flow | Participant final confirmation | DECIDED |

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
