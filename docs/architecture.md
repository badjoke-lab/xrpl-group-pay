# XRPL Group Pay — Architecture

**Status:** Active  
**Scope:** Approved Make Waves v1 architecture and extension boundaries  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Objective

XRPL Group Pay must support the Make Waves v1 release without hard-wiring the product core to one wallet, one asset representation, one allocation method, or one language.

The architecture therefore separates:

- group-expense coordination;
- financial obligation calculation;
- settlement intent construction;
- wallet-specific signing handoff;
- ledger-specific transaction construction;
- ledger verification;
- durable receipts and proofs;
- localization and presentation.

## 2. Layer model

```text
Application and UI
├── Creator workflows
├── Payer workflows
├── Progress and proof
├── Public roadmap and changelog
└── Localization

Group Pay Core
├── Bill
├── PaymentSlot
├── Allocation
├── Capability access
├── Progress recomputation
├── Audit events
└── Settlement state

Payment Domain
├── Accounting Currency
├── Obligation Amount
├── Settlement Asset
├── Settlement Amount
├── Payment Intent
└── Settlement Quote

Adapters
├── Wallet Provider
├── Transaction Builder
├── Verification Strategy
├── Asset Readiness Provider
├── Receipt Contract
└── Payment Rail

Infrastructure
├── XRPL nodes
├── Xaman API
├── Cloudflare Workers
├── Cloudflare D1
└── operational monitoring
```

## 3. Dependency direction

Dependencies point inward.

```text
UI
 -> application services
 -> Group Pay Core
 -> Payment Domain contracts

provider and infrastructure implementations
 -> Payment Domain contracts
```

The Group Pay core must not import:

- Xaman REST response types;
- Xaman UUID field names;
- QR-image field names;
- XRPL issued-asset JSON details unless through a transaction or verification adapter;
- translation message strings;
- future EVM or other-chain SDK types.

## 4. Group Pay Core

The core owns:

- Bill lifecycle;
- PaymentSlot lifecycle;
- capability authorization;
- allocation output;
- frozen obligation facts;
- settlement eligibility;
- progress recomputation;
- settled-state determination;
- append-only audit facts;
- association between a PaymentSlot and an accepted receipt.

The core does not:

- sign transactions;
- hold funds;
- choose a user's wallet account;
- infer a different recipient;
- exchange assets;
- fetch market prices directly;
- decide provider-specific deep-link behavior;
- interpret one chain's finality rules directly.

## 5. Payment Domain

The Payment Domain provides chain- and wallet-neutral contracts.

### 5.1 Accounting Currency

Defines the unit of the obligation.

### 5.2 Settlement Asset

Defines the asset transferred to satisfy an obligation.

### 5.3 Payment Intent

Defines the frozen transaction conditions that a wallet provider may present but may not change.

### 5.4 Settlement Quote

Defines how an obligation in one Accounting Currency maps to a Settlement Amount. Make Waves v1 does not require a quote because Accounting Currency equals Settlement Asset, but the contract boundary exists for later fiat-denominated and mixed-asset settlement.

## 6. Wallet Provider boundary

A Wallet Provider converts a Payment Intent into a provider-specific signing handoff and reports lifecycle facts.

```text
Payment Intent
    |
    v
Wallet Provider
    |
    +--> mobile deep link
    +--> QR handoff
    +--> browser extension request
    +--> WalletConnect session
```

The provider may return:

- provider request identifier;
- lifecycle state;
- mobile URI;
- QR image or payload;
- browser or extension instruction;
- status channel;
- expiry;
- submitted transaction identifier.

The provider may not change:

- network;
- payment rail;
- asset identity;
- amount;
- destination;
- Destination Tag;
- Source Tag;
- InvoiceID;
- frozen Bill revision;
- expected payer without an explicit approved reassignment flow.

Xaman is the Make Waves v1 Wallet Provider. Future providers are added behind the same contract.

## 7. Payment Rail boundary

A Payment Rail groups network-specific behavior.

```text
Payment Rail
├── address rules
├── transaction builder
├── verification strategy
├── confirmation or finality policy
├── fee-asset disclosure
├── explorer references
└── receipt contract family
```

The Make Waves v1 rail is XRPL.

Future rails may include EVM or other networks. Adding a rail must not change allocation, capability access, localization, or Group Pay settlement semantics.

## 8. Asset Registry

The Asset Registry is the only approved source for supported asset definitions.

Each entry includes:

```text
rail
network
asset_type
currency
issuer
precision
symbol
fee_asset
verification_strategy
receipt_contract
readiness_strategy
status
```

Make Waves v1 entries:

- XRP Testnet;
- XRP Mainnet;
- official RLUSD Testnet;
- official RLUSD Mainnet.

The registry prevents ticker-only identification and Testnet/Mainnet issuer confusion.

## 9. Transaction Builder

The transaction builder receives a validated Payment Intent and produces an unsigned rail-specific transaction template.

XRPL builders:

```text
XrpPaymentBuilder
IssuedAssetPaymentBuilder
```

Builders must:

- preserve exact frozen facts;
- omit unsupported conversion fields;
- reject unknown assets;
- reject network/asset mismatches;
- avoid floating-point amount generation;
- produce deterministic normalized values for verification and tests.

## 10. Verification Strategy

Verification is independent of Wallet Provider lifecycle.

```text
Wallet Provider reports signed/submitted
                |
                v
Application fetches ledger transaction
                |
                v
Verification Strategy compares frozen intent
                |
                v
Versioned Verified Payment
```

XRPL verification dispatch:

```text
verifyXrplPayment()
├── verifyXrpPayment()
└── verifyIssuedAssetPayment()
```

A provider success response cannot directly mark a PaymentSlot paid.

## 11. Asset readiness

Some assets require preconditions before a Bill can be safely frozen.

For RLUSD, readiness includes network-specific account and trust-line checks. The readiness provider is separate from payment verification because it answers whether the recipient is prepared before payment, not whether a completed transaction is valid.

Future asset readiness strategies may check:

- trust lines;
- authorization requirements;
- freeze state;
- limits;
- account existence;
- chain-specific token-account requirements.

## 12. Receipt Contract

A Receipt Contract defines the immutable normalized facts stored and published after verification.

Make Waves v1:

```text
xrpl-xrp-payment-v1
xrpl-issued-payment-v1
```

Rules:

- historical XRP receipt meaning is not changed by RLUSD support;
- new asset families use new contracts when their fact model differs;
- digest inputs are contract-versioned;
- proof pages recompute the digest from stored immutable facts;
- observation timestamps are not authoritative payment facts.

## 13. Allocation Strategy

Allocation strategies convert a Bill total and participant inputs into frozen obligation amounts.

```text
AllocationStrategy
├── Equal
├── Percentage
├── Shares
└── CustomAmount
```

The settlement pipeline receives final obligation units and does not need to know which strategy produced them.

This allows new strategies or item-level expense allocation to be added without modifying wallet handoff or ledger verification.

## 14. Localization boundary

Application code references message keys, not embedded user-facing prose.

```text
message key
├── en
├── ja
└── ko
```

Locale selection changes presentation only. It never changes:

- Bill identity;
- capability authorization;
- financial values;
- asset identity;
- transaction intent;
- receipt digest;
- API field names.

## 15. Current implementation compatibility

The current implementation contains XRP- and Xaman-specific field names such as drops and payload identifiers. Migration to the approved architecture must preserve current behavior while moving dependency boundaries.

Compatibility rules:

- existing XRP Bills remain valid;
- existing XRP Receipt digests remain unchanged;
- current Xaman deep-link and QR behavior remains available through the Xaman Provider;
- current capability URLs and privacy boundaries remain valid;
- database changes use forward migrations;
- unsupported asset states fail closed.

## 16. Make Waves v1 architecture gate

Before the Mainnet release:

- the Group Pay core emits or consumes wallet-neutral Payment Intents;
- Xaman is implemented behind the Wallet Provider contract;
- XRP and RLUSD are Asset Registry entries;
- XRP and issued-asset verification use separate strategies behind one dispatcher;
- Receipt Contract version is persisted;
- all allocation strategies produce fixed-precision obligations;
- locale switching cannot alter protected or financial facts;
- mock-provider substitution proves the core does not depend on Xaman response types;
- no automatic swap, bridge, or custody path exists.

## 17. Post-submission extensions

### Multi-wallet XRPL

Add provider adapters and compatibility tests without changing Bills, allocations, receipts, or proofs.

### Fiat accounting and quotes

Add Accounting Currency entries and Settlement Quote providers without changing ledger verification contracts.

### Mixed-asset Bills

Allow each PaymentSlot to select from approved assets and receive an independent quote while progress remains in Accounting Currency.

### Persistent Groups and Settlement Circles

Add new group, expense, period, approval, dispute, and netting entities. Their resulting obligations enter the existing Payment Intent pipeline.

### Additional rails

Add rail-specific addresses, transaction builders, verifiers, fee rules, and Receipt Contracts. Core expense coordination remains reusable.
