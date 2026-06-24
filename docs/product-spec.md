# XRPL Group Pay — Product Specification

**Status:** Active  
**Scope:** Approved Make Waves v1 target and post-submission product direction  
**Last reviewed:** 2026-06-24  
**Document class:** Public  
**Initial payment rail:** XRP Ledger  
**Make Waves v1 assets:** XRP and RLUSD on XRPL  
**Make Waves v1 wallet provider:** Xaman  
**Make Waves v1 languages:** English, Japanese, and Korean

## 1. Product summary

XRPL Group Pay is a non-custodial shared-expense settlement application. A creator defines a bill, allocates each participant's obligation, shares capability links, and receives direct payments from participant-controlled wallets. The application never holds user funds, private keys, seeds, or application balances.

The application coordinates and verifies settlement by:

1. defining a frozen payment obligation;
2. creating a wallet-neutral Payment Intent;
3. translating that intent through a Wallet Provider;
4. requiring the payer to review and sign in their own wallet;
5. fetching the resulting transaction from the expected ledger;
6. verifying the sender, destination, asset, amount, tags, InvoiceID, result, and delivered value;
7. storing a versioned verified receipt;
8. updating the related PaymentSlot and Bill only after final verification;
9. presenting progress and public proof without exposing private bill metadata.

## 2. Product identity

The public product remains **XRPL Group Pay** while XRPL is the only production payment rail.

The product is broader than a single wallet or a single XRPL asset:

```text
Group Pay Core
├── Quick Pay
├── Groups and recurring expenses
├── Settlement Circles
├── Event Collection
└── Payment Proof

Payment capabilities
├── Wallet Providers
├── Asset Registry
├── Verification Strategies
├── Receipt Contracts
└── Payment Rails
```

Xaman is the first Wallet Provider. XRP and RLUSD are the first settlement assets. Neither is the identity of the Group Pay core.

## 3. Problem

A raw token transfer proves that value moved between accounts, but it does not provide a complete group-expense workflow. Groups need to know:

- what the shared expense was;
- how the total was divided;
- which participant was expected to settle which obligation;
- which transfer belongs to which participant slot;
- whether the transaction succeeded on the expected network;
- whether the correct asset and issuer were delivered;
- which participants remain unpaid;
- whether the bill is fully settled;
- which public ledger facts can be shown as proof.

XRPL Group Pay provides that coordination and verification layer without becoming a custodian, exchange, broker, or debt-enforcement service.

## 4. Actors

### 4.1 Bill creator

Creates a bill, selects its settlement asset, chooses an allocation method, sets the recipient XRPL account, distributes capability links, and monitors settlement.

### 4.2 Payer

Opens an individual payment capability, reviews the frozen obligation and settlement conditions, chooses an available Wallet Provider, signs in their own wallet, and receives a verified result.

### 4.3 Progress viewer

Views capability-protected bill progress without receiving creator management access.

### 4.4 Proof viewer

Views a read-only public proof of a verified payment. A proof viewer cannot modify a bill or initiate a replacement payment.

## 5. Product principles

1. The payer signs with a payer-controlled wallet.
2. Funds move directly from payer to recipient.
3. The operator never receives or controls settlement funds.
4. The application never asks for a private key or seed.
5. The application does not create an internal balance.
6. A transaction hash or wallet status alone is never treated as proof of payment.
7. A PaymentSlot becomes paid only after strict verification against a validated ledger.
8. Asset identity includes network, asset type, currency, and issuer where applicable.
9. The application does not silently swap, bridge, or convert assets.
10. User-entered bill details are not written into XRPL Memos.
11. Existing verified receipts remain stable when new assets, wallets, or rails are added.
12. English is the canonical product language, while the same Bill may be viewed in English, Japanese, or Korean.

## 6. Make Waves v1 scope

The Make Waves v1 release includes:

- one-time Bills;
- one recipient XRPL account per Bill;
- one Settlement Asset per Bill;
- XRP and official RLUSD on XRPL;
- Xaman signing through a Wallet Provider boundary;
- creator share without self-payment;
- participant labels and expected payer addresses;
- Equal allocation;
- Percentage allocation;
- Shares allocation;
- Custom Amount allocation;
- explicit remainder handling;
- individual capability-based payment links;
- Source Tag support;
- one unique InvoiceID per PaymentSlot;
- validated-ledger verification;
- XRP and issued-asset Receipt Contracts;
- bill progress and settled state;
- public transaction proof;
- mobile-first payer flow and desktop creator flow;
- English, Japanese, and Korean interfaces;
- XRPL Testnet followed by a controlled XRPL Mainnet release;
- public Roadmap and Changelog.

### 6.1 Make Waves v1 constraint

For the Make Waves v1 release:

```text
Accounting Currency = Settlement Asset
One Bill = One Settlement Asset
```

Examples:

```text
XRP-denominated Bill -> XRP settlement
RLUSD-denominated Bill -> RLUSD settlement
```

A single v1 Bill does not mix XRP and RLUSD across participants.

## 7. Explicit non-goals for Make Waves v1

The v1 release does not include:

- custody or pooled funds;
- stored-value balances;
- automatic debits;
- escrow;
- token swaps;
- bridges;
- fiat on-ramp or off-ramp;
- automatic fiat conversion;
- multiple settlement assets inside one Bill;
- participant-selected settlement assets;
- automatic market quotes;
- creator-adjusted conversion quotes;
- payment guarantees;
- operator-funded refunds;
- percentage-of-payment service fees;
- debt enforcement;
- investment, fundraising, lending, or yield features;
- Settlement Circle entities in the v1 data model;
- payment rails outside XRPL.

## 8. Money model

XRPL Group Pay separates four concepts even when the v1 interface keeps them equal.

### 8.1 Accounting Currency

The unit in which the obligation is defined.

Examples:

```text
XRP
RLUSD
Future: JPY, USD, KRW, EUR
```

### 8.2 Obligation Amount

The amount a participant is expected to settle in the Bill's Accounting Currency.

### 8.3 Settlement Asset

The asset actually transferred on a payment rail.

### 8.4 Settlement Amount

The exact quantity of the Settlement Asset accepted as satisfying the obligation.

All arithmetic uses fixed-precision integer representations. JavaScript floating-point arithmetic is not authoritative for financial values.

Detailed rules are defined in `docs/money-and-allocation.md`.

## 9. Allocation model

A Bill records one Allocation Strategy and produces an immutable obligation amount for each PaymentSlot when the Bill is frozen.

Supported Make Waves v1 strategies:

- **Equal:** divide the remaining total equally;
- **Percentage:** allocate by percentages totaling 100%;
- **Shares:** allocate by integer or decimal weights;
- **Custom Amount:** creator enters final amounts directly.

The strategy and its inputs remain audit context. The frozen obligation amount is the authoritative value used for settlement.

Remainders must be assigned explicitly to the creator, a selected participant, or through a creator-confirmed manual allocation.

## 10. Asset model

An `AssetDescriptor` identifies a settlement asset by:

```text
payment_rail
network
asset_type
currency
issuer
precision
symbol
verification_strategy
receipt_contract
```

### 10.1 XRP

```text
payment_rail: xrpl
asset_type: native
currency: XRP
issuer: null
ledger unit: drops
```

### 10.2 RLUSD

```text
payment_rail: xrpl
asset_type: issued
currency: official network-specific RLUSD currency code
issuer: official network-specific RLUSD issuer
ledger amount: currency + issuer + decimal value
```

The application never identifies RLUSD by ticker alone. Testnet and Mainnet issuer definitions are separate Asset Registry entries.

## 11. Bill model

A `Bill` represents one shared expense.

Logical fields:

```text
id
public_id
admin_token_hash
title
network
payment_rail
accounting_currency
settlement_asset_id
destination_address
destination_tag
total_obligation_units
creator_share_units
allocation_strategy
allocation_metadata
status
revision
frozen_at
expires_at
default_locale
created_at
updated_at
```

The physical schema may retain compatibility columns while migrations move toward the logical model.

### 11.1 Creator share

The creator share records the creator's portion of the expense. It does not instruct the creator to send funds to themselves.

The following invariant holds:

```text
creator_share_units + sum(payment_slot.obligation_units)
= bill.total_obligation_units
```

### 11.2 Bill status

```text
draft
open
partially_paid
settled
expired
cancelled
needs_review
```

## 12. PaymentSlot model

A `PaymentSlot` represents one participant obligation and one settlement opportunity.

Logical fields:

```text
id
bill_id
public_token_hash
participant_label
expected_payer_address
obligation_units
settlement_asset_id
settlement_amount_units
invoice_id
status
accepted_receipt_id
paid_tx_hash
paid_ledger_index
paid_at
created_at
updated_at
```

For Make Waves v1, the PaymentSlot Settlement Asset is inherited from the Bill.

Each PaymentSlot has:

- one expected payer address in the initial flow;
- one frozen obligation amount;
- one frozen Settlement Asset;
- one unique InvoiceID;
- one capability-based payment URL;
- at most one accepted verified receipt.

A payment from a different address is not silently accepted.

## 13. Capability model

```text
/pay/{paymentToken}       Participant payment capability
/bill/{publicToken}       Read-only bill progress capability
/manage/{adminToken}      Bill-management capability
/proof/{proofToken}       Read-only transaction proof
```

Requirements:

- tokens use cryptographically secure random values;
- only token hashes are stored where practical;
- management tokens are never included in participant URLs;
- tokens are excluded from logs and analytics;
- invalid or revoked capabilities reveal no private Bill data;
- locale changes do not alter or expose the capability;
- language may be represented in a normal path segment while the capability remains in a protected body or URL fragment as applicable.

## 14. Payment Intent

The Group Pay core creates a wallet-neutral `PaymentIntent` containing:

```text
intent_id
payment_slot_id
payment_rail
network
asset_descriptor
amount
destination
destination_tag
source_tag
invoice_id
expected_payer
expires_at
revision
```

A Wallet Provider converts the Payment Intent into a provider-specific signing request. The Group Pay core does not depend on Xaman payload response types.

Detailed contracts are defined in `docs/payment-contracts.md`.

## 15. Wallet Provider boundary

The Make Waves v1 provider is Xaman.

A Wallet Provider is responsible for:

- creating a signing handoff from a Payment Intent;
- exposing provider-specific deep-link, QR, extension, or connection data;
- reporting request lifecycle state;
- returning the submitted transaction identifier where available.

A Wallet Provider is not payment proof. The application independently verifies the ledger transaction.

Future providers may include Joey Wallet, GemWallet, and CROSSMARK after compatibility testing. Their inclusion is a roadmap direction, not a current compatibility claim.

## 16. XRPL transaction rules

### 16.1 XRP Payment

```json
{
  "TransactionType": "Payment",
  "Destination": "<BILL_DESTINATION>",
  "Amount": "<EXPECTED_DROPS>",
  "SourceTag": "<CONFIGURED_SOURCE_TAG>",
  "InvoiceID": "<PAYMENT_SLOT_UINT256>",
  "DestinationTag": "<OPTIONAL_DESTINATION_TAG>"
}
```

### 16.2 RLUSD Payment

```json
{
  "TransactionType": "Payment",
  "Destination": "<BILL_DESTINATION>",
  "Amount": {
    "currency": "<OFFICIAL_NETWORK_RLUSD_CURRENCY>",
    "issuer": "<OFFICIAL_NETWORK_RLUSD_ISSUER>",
    "value": "<EXPECTED_DECIMAL_VALUE>"
  },
  "SourceTag": "<CONFIGURED_SOURCE_TAG>",
  "InvoiceID": "<PAYMENT_SLOT_UINT256>",
  "DestinationTag": "<OPTIONAL_DESTINATION_TAG>"
}
```

Rules:

- `Account`, `Fee`, and `Sequence` may be filled by the Wallet Provider;
- `SourceTag` and `InvoiceID` are required according to deployment policy;
- `DestinationTag` is included only when configured;
- `SendMax`, `Paths`, and `DeliverMin` are not used in v1;
- Partial Payment is not enabled;
- Memos are omitted;
- no automatic asset conversion is requested.

## 17. Verification contract

A PaymentSlot becomes paid only when all applicable checks pass:

```text
wallet handoff resolved and signed
transaction identifier exists
transaction found on expected network
validated = true
TransactionType = Payment
meta.TransactionResult = tesSUCCESS
Account = expected payer
Destination = frozen destination
DestinationTag matches, including absence
SourceTag matches configured value
InvoiceID matches PaymentSlot
asset type matches
currency matches
issuer matches when applicable
requested amount matches
meta.delivered_amount matches expected asset and amount
Partial Payment flag absent
SendMax absent
Paths absent
DeliverMin absent
transaction not previously accepted
PaymentSlot has no competing accepted receipt
```

Verification is dispatched by the Payment Intent's Verification Strategy:

```text
verifyXrplPayment()
├── verifyXrpPayment()
└── verifyIssuedAssetPayment()
```

## 18. Receipt contracts

Make Waves v1 uses versioned receipt contracts:

```text
xrpl-xrp-payment-v1
xrpl-issued-payment-v1
```

Existing XRP receipts and proof digests retain their current meaning. Support for RLUSD is added through a separate receipt contract instead of changing the semantics of historical XRP proof records.

## 19. Bill review and freezing

Before publication, the creator reviews:

- network;
- Settlement Asset;
- destination and optional Destination Tag;
- total and creator share;
- Allocation Strategy;
- each participant's expected payer and obligation;
- RLUSD recipient readiness when applicable;
- the warning that publication freezes settlement conditions.

When the Bill becomes `open`, the following are frozen:

- network and payment rail;
- destination and Destination Tag;
- Accounting Currency;
- Settlement Asset;
- total obligation;
- creator share;
- allocation result;
- PaymentSlot obligations;
- PaymentSlot InvoiceIDs;
- expected payer addresses for issued slots.

A published Bill cannot switch between XRP and RLUSD. A different asset requires a new Bill or a defined future revision flow that invalidates all prior signing opportunities.

## 20. RLUSD readiness

Before an RLUSD Bill is frozen, the application verifies that the recipient can receive the official network-specific RLUSD asset according to the implemented XRPL account and trust-line checks.

The interface must explain that:

- RLUSD is an issued asset on XRPL;
- the official issuer is verified by the application;
- the recipient must be able to receive RLUSD;
- the payer still needs XRP for XRPL network fees;
- Group Pay does not exchange XRP and RLUSD.

## 21. Localization

English is the canonical source language. The Make Waves v1 interface supports English, Japanese, and Korean.

The same Bill and PaymentSlot can be opened in any supported language. System labels, instructions, warnings, statuses, and errors are localized. User-entered titles, participant labels, addresses, hashes, currency codes, issuer addresses, Source Tags, and InvoiceIDs are not translated.

Detailed localization rules are defined in `docs/localization.md`.

## 22. Network separation

Testnet and Mainnet are visibly and operationally separated.

Requirements:

- separate environment variables;
- separate XRPL endpoints;
- separate databases;
- separate XRP and RLUSD Asset Registry records;
- network stored on every Bill, Payment Intent, handoff, observation, and receipt;
- Mainnet warnings before Bill publication and payment approval;
- no automatic copying of Testnet Bills to Mainnet;
- a transaction on another network cannot satisfy a PaymentSlot.

## 23. Settlement rule

A Bill becomes `settled` when every externally payable PaymentSlot has one accepted verified receipt.

Progress is displayed in the Bill's Accounting Currency. In Make Waves v1, this is also the Settlement Asset, so XRP and RLUSD Bills remain separately denominated and their volumes are never added together as if they were the same unit.

## 24. Post-submission product direction

### 24.1 Multi-wallet XRPL

Add Wallet Providers after XRP and RLUSD compatibility testing. Provider support requires actual signing, rejection, expiry, Source Tag, InvoiceID, transaction-identifier, mobile, and desktop verification.

### 24.2 Fiat-denominated Bills

Add JPY, USD, KRW, and EUR as Accounting Currencies while settlement remains on supported payment rails.

### 24.3 Settlement Quotes

Add fixed, market, and manual quote policies with:

- source;
- rate;
- timestamp;
- expiry;
- suggested amount;
- final agreed amount;
- manual adjustment;
- adjustment reason.

### 24.4 Mixed-asset settlement

Permit participants in one Bill to settle obligations using different allowed assets. Bill progress remains denominated in the Accounting Currency.

### 24.5 Persistent Groups

Add saved groups, reusable members, recurring expenses, history, and activity.

### 24.6 Settlement Circles

Add multiple expenses, approvals, disputes, closing periods, net balances, reduced settlement routes, partial settlement, carry-over, exports, and audit history.

### 24.7 Event Collection

Add event fees, open participation slots, shared QR entry, capacity, deadlines, organizer dashboards, and event settlement records.

### 24.8 Additional assets and payment rails

Additional XRPL assets require curated Asset Registry review. Other chains are added as separate Payment Rails. Group Pay does not become an automatic swap or bridge service.

Public direction and current availability are maintained in `ROADMAP.md`. Roadmap items are directions, not implementation commitments.

## 25. Make Waves v1 acceptance criteria

The v1 release is accepted when:

1. A creator can create XRP and RLUSD Bills on the supported XRPL network.
2. A Bill uses one frozen Settlement Asset.
3. Equal, Percentage, Shares, and Custom Amount allocations produce exact frozen obligations.
4. Each participant can open a distinct capability link on supported mobile and desktop widths.
5. Each participant can review the correct asset, amount, destination, expected payer, network, tags, and InvoiceID.
6. Xaman receives the correct XRP or RLUSD Payment Intent.
7. The application verifies each submitted transaction on the expected validated ledger.
8. Wrong sender, destination, network, amount, currency, issuer, tag, InvoiceID, result, duplicate, and partial-payment cases are rejected.
9. Existing XRP receipts and proof digests retain their defined meaning.
10. RLUSD receipts use the issued-asset receipt contract.
11. The Bill becomes settled only after all payable PaymentSlots are verified.
12. The complete critical flow works in English, Japanese, and Korean.
13. No private key, seed, or user fund is handled by the application.
14. Public Roadmap and Changelog accurately distinguish available, in-progress, and future work.

## 26. Official technical references

- XRP Ledger Payment transaction reference.
- XRP Ledger issued-currency amount reference.
- XRP Ledger Source and Destination Tags.
- XRP Ledger transaction metadata and `delivered_amount`.
- XRP Ledger robust payment monitoring guidance.
- Ripple RLUSD on XRPL developer documentation.
- Xaman Payloads and Sign Requests.
- Xaman secure payment verification.
- Xaman network and webhook documentation.
