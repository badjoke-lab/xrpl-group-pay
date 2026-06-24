# XRPL Group Pay — Open Decisions

**Status:** Active  
**Scope:** Product, technical, safety, and Make Waves decisions  
**Last reviewed:** 2026-06-24  
**Document class:** Public

This register contains decisions that affect implementation. A decision that changes the non-custodial boundary, verification contract, network separation, asset identity, receipt compatibility, localization behavior, or on-chain disclosure requires updates to every affected product document before implementation.

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
| OD-005 | How is Payment volume calculated? | Track verified XRP delivered volume and verified RLUSD delivered volume separately. Never add unlike asset quantities. Whether RLUSD counts toward an official Make Waves volume metric remains unresolved | Organizer response and metric methodology | Before metrics implementation | BLOCKED |
| OD-006 | Xaman SDK or direct REST wrapper on Cloudflare Workers? | Use a small server-only REST wrapper around official payload endpoints inside a Xaman Wallet Provider | Provider contract tests, credential-boundary tests, and Worker build | Wallet Provider extraction | DECIDED |
| OD-007 | Primary hosting platform? | Cloudflare Workers through OpenNext; change only after measured incompatibility | Next.js build, Worker build, and production smoke test | Application foundation | DECIDED |
| OD-008 | Database? | Cloudflare D1 with versioned forward migrations | Migration, uniqueness, compatibility, and Worker tests | Persistence implementation | DECIDED |
| OD-009 | ORM or typed SQL? | Use prepared typed SQL through a minimal D1 contract; add an ORM only if measured complexity justifies it | Strict TypeScript, adapter tests, migration tests, and Worker build | Persistence implementation | DECIDED |
| OD-010 | Primary XRPL endpoints and failover? | Query approved network-specific XRPL endpoints through a bounded verifier | Official server list, failover tests, and Worker build | Mainnet gate | DECIDED |
| OD-011 | Participant identity in initial flow? | Creator provides expected XRPL address | Usability test | Initial group-payment flow | ASSUMPTION |
| OD-012 | Future self-claim flow? | A wallet sign-in flow may bind a wallet to an open slot | Threat model and user test | Post-Make Waves | OPEN |
| OD-013 | Destination Tag behavior? | Optional in the Payment Intent; ledger verification requires exact presence and value | Verification tests | Validated-ledger verification | DECIDED |
| OD-014 | How many active signing requests may a slot have? | One active Wallet Handoff per PaymentSlot. Provider-specific payloads are implementations of that common boundary | Provider lifecycle and persistence tests | Wallet Provider extraction | DECIDED |
| OD-015 | Xaman payload expiry length? | Five minutes; treat expiry as open/scan-before and allow a signed late resolution to become submitted when safely bound to the frozen intent | Official Xaman behavior and lifecycle tests | Testnet handoff | DECIDED |
| OD-016 | Bill expiry behavior? | No deadline in the first vertical slice; explicit deadline in completed v1 or immediately after if schedule risk requires deferral | Product test | Mainnet release | DECIDED |
| OD-017 | Mainnet per-payment upper limit? | Configurable conservative limits by Settlement Asset | Risk review and controlled test plan | Before Mainnet | OPEN |
| OD-018 | Retention schedule? | Use the privacy-data-map schedule until Mainnet review approves or replaces it | Privacy and operations review | Before Mainnet | ASSUMPTION |
| OD-019 | Public proof default fields? | Publish only verified public ledger facts, asset identity, receipt contract, and proof digest; hide private Bill and participant data | Privacy, schema, API, and UI tests | Asset-aware proof | DECIDED |
| OD-020 | Initial UI languages? | English is canonical. English, Japanese, and Korean are supported in the Make Waves v1 critical flow | Complete catalogs, long-string tests, and mobile/desktop review | Localization release | DECIDED |
| OD-021 | Public license? | Apache License 2.0 | Root `LICENSE` and dependency compatibility review | Repository creation | DECIDED |
| OD-022 | Production domain? | Dedicated badjoke-lab subdomain or standalone domain | Deployment and naming review | Before public preview | OPEN |
| OD-023 | Authentication beyond capability URLs? | No account system in Make Waves v1 | Security and usability test | Post-v1 | ASSUMPTION |
| OD-024 | Analytics? | No third-party analytics on capability routes | Privacy review | Before public preview | ASSUMPTION |
| OD-025 | Error monitoring provider? | Optional only with strict redaction | Secret and capability leakage test | Before Mainnet | OPEN |
| OD-026 | Circle integration boundary? | Keep Payment Intent, Wallet Provider, verification, receipts, and proof reusable; do not implement Circle entities in Make Waves v1 | Architecture review | Product specification | DECIDED |
| OD-027 | What is the authoritative source of expected Payment values during verification? | The server-stored frozen Payment Intent and Asset Descriptor are authoritative. A provider response is evidence of signing lifecycle, not authority to alter expected fields | Provider tamper tests and verification tests | Wallet Provider extraction | DECIDED |
| OD-028 | When is duplicate processing durably prevented? | Enforce unique network plus transaction ID and network plus InvoiceID, then atomically insert or reuse the receipt, mark the slot paid, and recompute the Bill | D1 migration, conflict, and concurrency tests | Persistence implementation | DECIDED |
| OD-029 | Which fields define an identical XRP proof? | Preserve the existing immutable XRP ledger and expected-Payment facts; exclude observation timestamps so re-verification remains idempotent | Regression fixture with existing digest | Asset-aware receipt release | DECIDED |
| OD-030 | What does a read-only progress capability reveal? | Show amounts, asset, slot states, and verified public transaction references; hide participant labels, expected payer addresses, capabilities, and InvoiceIDs | Capability-role and redaction tests | Progress view | DECIDED |
| OD-031 | How is a public proof addressed and checked? | Use the receipt proof digest as the public fragment identifier, retrieve through a unique index, and recompute before publication | Digest, API, and browser tests | Public proof | DECIDED |
| OD-032 | When does a creator draft become a published Bill? | Keep the editable draft browser-local, run a no-write server review, and create the frozen Bill only after explicit final confirmation | Shared validation and browser-flow tests | Bill review | DECIDED |
| OD-033 | When may a participant flow create a Wallet Handoff? | First load frozen capability-bound details without writes, then require explicit confirmation of asset, amount, destination, expected payer, network, tags, and InvoiceID | No-write and provider-call ordering tests | Participant final confirmation | DECIDED |
| OD-034 | Which assets are Make Waves v1 settlement assets? | XRP and official network-specific RLUSD on XRPL | Asset Registry fixtures, official issuer references, Testnet and Mainnet controlled transactions | Asset Registry implementation | DECIDED |
| OD-035 | How is RLUSD identified? | By payment rail, network, issued-asset type, exact currency code, and exact official issuer. Ticker alone is never sufficient | Official network-specific references and negative issuer tests | RLUSD implementation | DECIDED |
| OD-036 | May one Make Waves v1 Bill mix assets? | No. One Bill has one frozen Settlement Asset inherited by every PaymentSlot | Schema and domain invariant tests | Asset-aware Bill model | DECIDED |
| OD-037 | Are Accounting Currency and Settlement Asset the same concept? | No. They are separate domain concepts. Make Waves v1 constrains them to the same asset; later fiat-denominated and mixed-asset flows may differ | Architecture and migration review | Product architecture | DECIDED |
| OD-038 | Which allocation strategies are in Make Waves v1? | Equal, Percentage, Shares, and Custom Amount, each producing exact fixed-precision obligations | Unit, remainder, and invariant tests | Allocation implementation | DECIDED |
| OD-039 | How are financial values calculated? | Fixed-precision integer units with an explicit scale. JavaScript floating-point values are never authoritative | Property and boundary tests | Money domain implementation | DECIDED |
| OD-040 | How is wallet support extended? | The Group Pay core emits a Payment Intent. Provider-specific adapters create and resolve signing handoffs. Xaman is the first provider | Mock-provider substitution and Xaman regression tests | Wallet Provider extraction | DECIDED |
| OD-041 | How are receipt formats extended? | Versioned Receipt Contracts. Preserve `xrpl-xrp-payment-v1`; add `xrpl-issued-payment-v1` for RLUSD and future approved XRPL issued assets | Digest compatibility and schema tests | Asset-aware receipt implementation | DECIDED |
| OD-042 | Does RLUSD support permit swaps or conversion? | No. Group Pay constructs and verifies direct RLUSD Payments only. It does not swap XRP, bridge assets, or provide on/off-ramp services | Transaction-builder negative tests and disclosures | RLUSD implementation | DECIDED |
| OD-043 | How is RLUSD recipient readiness handled? | Verify the official trust line and applicable receive conditions before freezing an RLUSD Bill. Missing readiness fails closed | XRPL account-line fixtures and UI tests | RLUSD readiness implementation | DECIDED |
| OD-044 | How will fiat-denominated Bills work later? | Accounting obligations may use JPY, USD, KRW, or EUR while a versioned Settlement Quote fixes the asset amount, source, timestamp, expiry, and any disclosed adjustment | Quote threat model and pricing-source review | Post-Make Waves | DECIDED |
| OD-045 | May creators manually adjust a future conversion result? | Yes, only through a disclosed immutable quote revision that preserves suggested and final values, actor, reason, and participant re-confirmation | Audit and UX tests | Post-Make Waves | DECIDED |
| OD-046 | How is mixed-asset settlement added? | Each PaymentSlot may later select from allowed assets and receive an independent quote. Bill progress remains denominated in Accounting Currency | Quote and progress architecture tests | Post-Make Waves | DECIDED |
| OD-047 | How are additional chains added? | As separate Payment Rails. No automatic bridge or swap is implied | Rail interface and chain-specific threat model | Future research | DECIDED |
| OD-048 | How is public product direction maintained? | `ROADMAP.md` and a public Roadmap page use Available, In Progress, Next, Later, and Research. They do not promise dates or expose internal fallback strategy | Roadmap schema and review policy | Public roadmap implementation | DECIDED |
| OD-049 | How is public change history maintained? | `CHANGELOG.md` records meaningful user-facing, security, compatibility, and operational changes. Each major PR supplies a fragment or explains why none is required | PR template and changelog checks | Changelog implementation | DECIDED |

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

A decision that changes any of the following requires all affected public documents to be updated in the same documentation sequence before implementation:

- non-custodial boundary;
- asset identity;
- Accounting Currency or Settlement Asset semantics;
- Wallet Provider contract;
- verification contract;
- Receipt Contract;
- network separation;
- on-chain data exposure;
- localization behavior;
- public Roadmap or Changelog policy.
