# XRPL Group Pay — Money and Allocation

**Status:** Active  
**Scope:** Approved payment-mode-aware money model and later settlement-quote boundary  
**Last reviewed:** 2026-07-01  
**Document class:** Public

## 1. Core rule

Accounting obligations and ledger settlement are separate concepts.

Make Waves v1 keeps them equal:

```text
Accounting Currency = Settlement Asset
Obligation Amount = Settlement Amount
One Bill = One Settlement Asset
```

The separation remains explicit so later versions can support fiat-denominated Bills and participant-specific settlement assets without replacing the Bill, allocation, wallet, verification, or receipt foundations.

## 2. Money concepts

### Accounting Currency

The unit used for the Bill total and payer obligations.

Make Waves v1:

```text
XRP
RLUSD
```

Later candidates:

```text
JPY
USD
KRW
EUR
```

### Obligation Amount

The frozen amount one payer is expected to settle, expressed in Accounting Currency.

### Settlement Asset

The asset transferred on a Payment Rail.

Make Waves v1:

```text
XRP on XRPL
Official RLUSD on XRPL
```

### Settlement Amount

The exact quantity of the Settlement Asset that the verified ledger transaction must deliver.

### Settlement Quote

A later immutable mapping from an obligation in one currency to a Settlement Amount in another asset. Make Waves v1 does not require quotes.

## 3. Fixed-precision representation

Authoritative arithmetic uses integer strings and an explicit scale.

```text
Money
- code
- units
- scale
```

Examples:

```text
1.25 XRP -> units 1250000, scale 6
100 JPY -> units 100, scale 0
12.34 USD -> units 1234, scale 2
```

Rules:

- JavaScript floating-point values are not authoritative;
- scientific notation is rejected;
- negative values are rejected;
- silent rounding is prohibited;
- stored values never contain locale separators;
- display formatting never changes stored units;
- XRP units are ledger drops;
- issued-asset integer units are converted to a canonical decimal string only at transaction and verification boundaries.

## 4. Payment modes

A Bill freezes one payment mode:

```text
representative
direct
```

### Representative mode

Participants pay a representative recipient. The Bill may contain a recipient-funded amount that is not assigned to a payer.

### Direct mode

Participants pay an external recipient directly. The Bill operator may be included as a normal payer. The recipient-funded amount is always zero.

The mode is part of the frozen Bill and cannot change after publication.

## 5. Recipient-funded amount

The recipient-funded amount is the portion of a representative-mode Bill that is not collected from payer PaymentSlots.

It is not:

- a self-payment instruction;
- a fee;
- an application balance;
- a payer Payment Intent;
- an on-ledger transfer.

The physical schema may temporarily retain `creator_share_units` for compatibility. Public copy and current domain documentation use `recipient_funded_units` or **recipient-funded amount**.

## 6. Exact-total invariants

### Representative mode

```text
recipient_funded_units
+ sum(payment_slot.obligation_units)
= bill.total_obligation_units
```

### Direct mode

```text
recipient_funded_units = 0
sum(payment_slot.obligation_units)
= bill.total_obligation_units
```

The client previews the applicable invariant. The server independently enforces it before review and again before freezing the Bill.

## 7. Display totals

The interface distinguishes:

```text
Bill total
recipient-funded amount, when applicable
amount expected from payers
verified amount
remaining amount
```

For representative mode:

```text
expected_from_payers
= bill.total_obligation_units - recipient_funded_units
```

For direct mode:

```text
expected_from_payers
= bill.total_obligation_units
```

The recipient-funded amount is labeled **No transfer** where a user could mistake it for another PaymentSlot.

## 8. Allocation strategies

### Equal

Divide the distributable amount equally among payable participants.

### Percentage

Allocate by percentages totaling exactly 100% under the accepted fixed-precision representation.

### Shares

Allocate in proportion to positive weights, such as `2 : 1 : 1`.

### Custom Amount

The Bill operator enters each final payer obligation directly.

All strategies produce the same normalized result:

```text
AllocationResult
- strategy
- totalUnits
- recipientFundedUnits
- participantObligations
- remainderUnits
- remainderAssignment
- metadata
```

The frozen payer obligation units are authoritative. Wallet and verification services do not recalculate the allocation strategy.

## 9. Remainder handling

Equal, Percentage, and Shares calculations may produce remainder units.

Representative mode allows explicit assignment to:

```text
recipient-funded amount
first normalized payer
selected payer
manual final allocation
```

Direct mode allows assignment to:

```text
first normalized payer
selected payer
manual final allocation
```

Direct mode cannot assign a remainder to the recipient-funded amount because that amount must remain zero.

The policy and final assignment are stored as allocation metadata and shown during Bill-operator review. Random or hidden remainder assignment is prohibited.

## 10. Payer and recipient address invariants

- Each PaymentSlot has one expected payer address.
- The same expected payer address cannot appear in multiple slots in one Bill.
- The frozen recipient address cannot also be an expected payer address in the same Bill.
- In direct mode, the Bill operator participates by being added as a normal payer with an explicit address and amount.
- Role labels do not change the on-ledger sender or recipient facts.

## 11. Make Waves v1 asset behavior

### XRP Bill

```text
Accounting Currency: XRP
Settlement Asset: XRP on the selected XRPL network
```

Ledger settlement uses drops. Display may remove meaningless trailing zeros.

### RLUSD Bill

```text
Accounting Currency: RLUSD
Settlement Asset: official network-specific RLUSD on XRPL
```

The interface displays `RLUSD`, not a generic dollar symbol alone. Asset details expose the network and official issuer.

### No mixed settlement

Every PaymentSlot inherits the Bill Settlement Asset. A published Bill cannot switch between XRP and RLUSD.

## 12. Input and display

- Amount inputs always show their unit.
- Excess precision is rejected rather than rounded.
- Server requests use canonical numeric strings or integer units.
- Locale controls grouping, decimal presentation, and currency placement only.
- Locale never changes asset identity, units, Payment Intents, receipts, or proof digests.
- Group progress never adds XRP and RLUSD as if they were the same unit.

## 13. Freeze boundary

Before freezing, the Bill operator reviews:

- payment mode;
- Accounting Currency;
- Settlement Asset;
- recipient and optional Destination Tag;
- Bill total;
- recipient-funded amount when applicable;
- amount expected from payers;
- Allocation Strategy;
- remainder policy;
- every payer obligation and expected address;
- network;
- recipient readiness where applicable.

At freeze time, the application stores the mode, strategy, metadata, final units, currency, asset, scale, recipient, payer facts, and Bill revision. Later editing cannot modify already-issued PaymentSlots.

## 14. Independent settlement and progress

Each payer obligation settles independently.

- A verified PaymentSlot contributes its frozen obligation amount to verified progress.
- A failed or unpaid slot does not subtract another slot's verified amount.
- A review-required slot is not counted as paid.
- Closing incomplete preserves verified totals and records the remaining amount.
- Automatic refund, rollback, waiver, and redistribution are outside this revision.

## 15. Copy-to-revise

Changing payment mode, recipient, payer, or amount requires a new Bill.

Copy-to-revise may copy human-entered labels and allocation inputs into a new browser-local draft, but the new Bill receives new:

- Bill identity;
- revision identity;
- PaymentSlots;
- InvoiceIDs;
- capability tokens;
- Wallet Handoffs.

The original Bill, allocation, and receipts remain unchanged.

## 16. Later fiat-denominated Bills

A later Bill may use JPY, USD, KRW, or EUR as Accounting Currency while settlement remains XRP or RLUSD.

```text
Bill: 30,000 JPY
A: 12,000 JPY
B: 10,000 JPY
C: 8,000 JPY
```

A Settlement Quote then defines each exact Settlement Amount. Fiat denomination is an accounting and display function; Group Pay still does not hold fiat or user funds.

## 17. Later Settlement Quotes

A quote records:

```text
quote ID
PaymentSlot
Accounting Currency
obligation amount
Settlement Asset
suggested Settlement Amount
final Settlement Amount
rate source
rate value
created time
expiry
adjustment flag
adjustment reason
revision
status
```

Rules:

- suggested and final values are retained separately;
- any adjustment is shown before wallet handoff;
- a replaced or expired quote cannot remain signable;
- a changed quote requires payer re-confirmation;
- quote failure never substitutes another asset or amount silently;
- Group Pay does not become an exchange, custodian, or bridge.

## 18. Later mixed-asset settlement

A future Bill may allow each PaymentSlot to select from approved assets.

```text
Accounting Currency: JPY
A: 12,000 JPY -> XRP
B: 10,000 JPY -> RLUSD
C: 8,000 JPY -> XRP
```

Bill progress remains denominated in JPY. XRP and RLUSD quantities are never added together.

Each slot stores its allowed assets, selected asset, active quote, final Settlement Amount, and verified receipt.

## 19. Later manual quote adjustment

A Bill operator may later adjust a suggested Settlement Amount only when:

- the suggestion remains recorded;
- the final amount and difference are explicit;
- an adjustment reason is stored;
- the payer reviews the final value;
- prior wallet handoffs are invalidated.

The adjustment changes the settlement quote, not the underlying obligation, unless a separate Bill revision changes the obligation.

## 20. Proof and export

A payment proof distinguishes:

```text
Accounting Currency
obligation amount
Settlement Asset
requested Settlement Amount
delivered Settlement Amount
quote reference when applicable
```

Make Waves v1 XRP and RLUSD Bills have no quote reference. Machine-readable exports use stable language-independent fields and canonical numeric strings.

## 21. Required tests

- exact decimal parsing;
- excess-precision rejection;
- minimum and maximum allowed values;
- Equal allocation with and without remainder;
- Percentage total validation;
- Shares with uneven division;
- Custom under, exact, and over states;
- representative-mode recipient-funded invariant;
- direct-mode zero recipient-funded invariant;
- payer-address uniqueness and recipient separation;
- deterministic remainder assignment;
- independent partial progress;
- closed-incomplete totals;
- copy-to-revise identity separation;
- XRP drops compatibility;
- RLUSD canonical decimal serialization;
- locale-independent stored values;
- frozen allocation immutability.
