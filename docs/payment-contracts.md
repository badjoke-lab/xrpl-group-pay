# XRPL Group Pay — Payment Contracts

**Status:** Active  
**Scope:** Approved Make Waves v1 contracts and post-submission extension interfaces  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Purpose

This document defines the stable logical contracts between the Group Pay core and wallet-, asset-, network-, quote-, and receipt-specific implementations.

The contracts are language-agnostic. TypeScript types may use different names where necessary, but must preserve the same fields and invariants.

## 2. AssetDescriptor

```text
AssetDescriptor
- id
- paymentRail
- network
- assetType
- currency
- issuer
- precision
- symbol
- feeAsset
- verificationStrategy
- receiptContract
- readinessStrategy
- status
```

### Invariants

- `id` is stable and unique.
- `assetType` is `native` or `issued` for XRPL v1 assets.
- Native XRP has no issuer.
- Issued assets require exact currency and issuer values.
- Asset identity includes network.
- A ticker or display symbol is never authoritative identity.
- Unsupported, disabled, or mismatched assets fail closed.

## 3. PaymentAmount

```text
PaymentAmount
- assetId
- units
- scale
```

### Invariants

- `units` is a canonical integer string.
- `scale` is defined by the AssetDescriptor or Accounting Currency definition.
- Arithmetic is performed on integer units.
- Display decimals are derived, not authoritative.
- Silent rounding is prohibited.

XRPL XRP uses ledger drops directly. XRPL issued assets use fixed-precision application units and a canonical decimal string when creating or verifying ledger amounts.

## 4. PaymentIntent

```text
PaymentIntent
- intentId
- paymentSlotId
- billRevision
- paymentRail
- network
- asset
- amount
- destination
- destinationTag
- sourceTag
- invoiceId
- expectedPayer
- expiresAt
```

### Invariants

- The intent is created from server-authoritative frozen Bill and PaymentSlot state.
- The wallet provider may present but not alter intent fields.
- A retry preserves the frozen intent unless a defined revision invalidates every previous handoff.
- Intent identifiers do not encode private Bill data.
- The expected payer may be absent only in an explicitly designed future open-claim flow.

## 5. WalletProvider

```text
WalletProvider
- providerId
- capabilities
- createHandoff(intent)
- readHandoff(requestId)
- resolveHandoff(requestId)
- getSubmittedTransaction(requestId)
- expireOrCancel(requestId)
```

A provider implementation may return:

```text
WalletHandoff
- providerId
- requestId
- status
- mobileUri
- browserUri
- qrData
- statusChannel
- expiresAt
- transactionId
- providerMetadata
```

### Handoff statuses

```text
created
available
opened
rejected
expired
signed
submitted
failed
```

### Invariants

- One active handoff is preferred per PaymentSlot.
- Provider lifecycle state is not payment proof.
- Provider metadata is isolated from the Group Pay core.
- Secrets and provider credentials remain server-side.
- A provider cannot mark a slot paid.
- A submitted transaction is independently fetched and verified.

### Make Waves v1 implementation

```text
XamanProvider
```

Future adapters may include Joey Wallet, GemWallet, and CROSSMARK only after actual compatibility testing.

## 6. TransactionBuilder

```text
TransactionBuilder
- builderId
- supports(asset, network)
- buildUnsignedTransaction(intent)
```

### XRPL v1 implementations

```text
XrpPaymentBuilder
IssuedAssetPaymentBuilder
```

### Invariants

- The builder accepts a validated PaymentIntent only.
- Output preserves destination, tags, InvoiceID, asset, amount, and network.
- No `SendMax`, `Paths`, or `DeliverMin` is added in v1.
- Partial Payment is not enabled.
- No Memo is added from user-entered Bill data.
- No automatic swap or bridge fields are added.

## 7. AssetReadinessProvider

```text
AssetReadinessProvider
- strategyId
- checkRecipient(asset, destination, amount)
- checkPayer(asset, account, amount)
```

The result is structured:

```text
AssetReadinessResult
- ready
- checks
- blockingCode
- userMessageKey
- observedAt
```

### RLUSD v1 readiness

Recipient readiness checks the official network-specific RLUSD trust line and applicable receive conditions before the Bill is frozen.

Payer readiness may provide a user-facing preflight, but final authority remains the wallet and validated ledger transaction.

## 8. VerificationStrategy

```text
VerificationStrategy
- strategyId
- verify(intent, ledgerTransaction, ledgerMetadata)
```

The result is structured:

```text
VerificationResult
- status
- retryable
- code
- expected
- observed
- verifiedPayment
```

### Common statuses

```text
verified
retry_not_found
retry_unvalidated
fail_validated_result
fail_wrong_transaction_type
fail_wrong_network
fail_wrong_sender
fail_wrong_destination
fail_wrong_destination_tag
fail_wrong_source_tag
fail_wrong_invoice_id
fail_wrong_asset
fail_wrong_currency
fail_wrong_issuer
fail_wrong_amount
fail_partial_payment
fail_unsupported_path
fail_duplicate_transaction
fail_slot_already_paid
fail_malformed_response
review_alternative_payer
```

### XRPL v1 strategies

```text
XrpPaymentVerification
IssuedAssetPaymentVerification
```

### Invariants

- `validated=true` is required.
- `tesSUCCESS` is required.
- Exact frozen fields are compared.
- `delivered_amount` is checked using the expected asset representation.
- Wrong issuer or same ticker with another issuer fails.
- Duplicate transaction use fails durably.
- Verification is deterministic for the same frozen intent and ledger facts.

## 9. VerifiedPayment

```text
VerifiedPayment
- receiptContract
- paymentRail
- network
- transactionId
- ledgerIndex
- sender
- destination
- destinationTag
- sourceTag
- invoiceId
- asset
- requestedAmount
- deliveredAmount
- transactionResult
```

A VerifiedPayment contains only normalized immutable settlement facts. It does not include wallet-provider lifecycle metadata as payment authority.

## 10. ReceiptContract

```text
ReceiptContract
- contractId
- normalize(verifiedPayment)
- validate(receipt)
- digestInput(receipt)
- publicProof(receipt)
```

### Make Waves v1 contracts

```text
xrpl-xrp-payment-v1
xrpl-issued-payment-v1
```

### Compatibility rules

- The existing XRP digest input remains unchanged.
- RLUSD uses the issued-payment contract.
- Receipt observation and verification timestamps are not immutable ledger facts.
- A new fact model requires a new contract version.
- Public proof output is contract-specific and privacy-reviewed.

## 11. AllocationStrategy

```text
AllocationStrategy
- strategyId
- allocate(total, creatorShare, participants, options)
```

The result is:

```text
AllocationResult
- strategyId
- totalUnits
- creatorShareUnits
- participantObligations
- remainderUnits
- remainderAssignment
- metadata
```

### Make Waves v1 strategies

```text
equal
percentage
shares
custom_amount
```

Every successful result satisfies the exact-total invariant.

## 12. QuoteProvider

Quote providers are post-Make Waves extensions.

```text
QuoteProvider
- providerId
- quote(obligation, settlementAsset, policy)
```

```text
SettlementQuote
- quoteId
- accountingCurrency
- obligationAmount
- settlementAsset
- suggestedSettlementAmount
- finalSettlementAmount
- rate
- source
- quotedAt
- expiresAt
- adjusted
- adjustedBy
- adjustmentReason
- revision
- status
```

### Invariants

- A quote is not an exchange or custody service.
- Suggested and final values are stored separately.
- Manual adjustment is visible to the payer.
- An expired or replaced quote cannot remain signable.
- A changed quote requires participant re-confirmation.

Make Waves v1 does not require a quote because Accounting Currency equals Settlement Asset.

## 13. PaymentRail

```text
PaymentRail
- railId
- addressValidator
- transactionBuilders
- verificationStrategies
- assetRegistry
- feeDisclosure
- confirmationPolicy
- explorerResolver
- receiptContracts
```

### Make Waves v1 rail

```text
xrpl
```

Future rails are additive implementations. They do not change Bill allocation, capabilities, localization, or the meaning of existing XRPL receipts.

## 14. Error boundary

Provider, asset, quote, and rail errors use stable application error codes and localized message keys.

Rules:

- external raw errors are not the only user-facing explanation;
- capabilities and credentials are redacted;
- retryable and terminal failures are distinguished;
- no retry changes the frozen destination, asset, or amount;
- unsupported combinations fail before a wallet handoff is created.

## 15. Contract acceptance tests

The implementation architecture is accepted when:

- a mock WalletProvider can replace Xaman without changing Bill logic;
- XRP and RLUSD use the same PaymentIntent entry point;
- native and issued-asset verification share one dispatcher but preserve distinct checks;
- current XRP digest fixtures remain unchanged;
- allocation strategies all produce exact integer-unit totals;
- localization changes presentation but not serialized intents or receipts;
- unsupported assets, networks, issuers, providers, and rails fail closed.
