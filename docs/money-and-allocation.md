# XRPL Group Pay — Money and Allocation

**Status:** Active  
**Scope:** Approved Make Waves v1 money model and later settlement-quote boundary  
**Last reviewed:** 2026-06-24  
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

The unit used for the Bill total and participant obligations.

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

The frozen amount one participant is expected to settle, expressed in Accounting Currency.

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

## 4. Exact-total invariant

Every valid Bill satisfies:

```text
creator_share_units
+ sum(payment_slot.obligation_units)
= bill.total_obligation_units
```

The client previews this invariant. The server independently enforces it before review and again before freezing the Bill.

## 5. Allocation strategies

### Equal

Divide the distributable amount equally among payable participants.

### Percentage

Allocate by percentages totaling exactly 100% under the accepted fixed-precision representation.

### Shares

Allocate in proportion to positive weights, such as `2 : 1 : 1`.

### Custom Amount

The creator enters each final participant obligation directly.

All strategies produce the same normalized result:

```text
AllocationResult
- strategy
- totalUnits
- creatorShareUnits
- participantObligations
- remainderUnits
- remainderAssignment
- metadata
```

The frozen participant obligation units are authoritative. Wallet and verification services do not recalculate the allocation strategy.

## 6. Remainder handling

Equal, Percentage, and Shares calculations may produce remainder units. Make Waves v1 allows explicit assignment to:

```text
creator
first normalized participant
selected participant
manual final allocation
```

The policy and final assignment are stored as allocation metadata and shown during creator review. Random or hidden remainder assignment is prohibited.

## 7. Creator share

The creator share records the creator's portion of the expense. It is not:

- a self-payment instruction;
- a fee;
- an application balance;
- a participant Payment Intent.

## 8. Make Waves v1 asset behavior

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

## 9. Input and display

- Amount inputs always show their unit.
- Excess precision is rejected rather than rounded.
- Server requests use canonical numeric strings or integer units.
- Locale controls grouping, decimal presentation, and currency placement only.
- Locale never changes asset identity, units, Payment Intents, receipts, or proof digests.

## 10. Freeze boundary

Before freezing, the creator reviews:

- Accounting Currency;
- Settlement Asset;
- total;
- creator share;
- Allocation Strategy;
- remainder policy;
- every participant obligation;
- network;
- recipient readiness where applicable.

At freeze time, the application stores the strategy, metadata, final units, currency, asset, scale, and Bill revision. Later editing cannot modify already-issued PaymentSlots.

## 11. Later fiat-denominated Bills

A later Bill may use JPY, USD, KRW, or EUR as Accounting Currency while settlement remains XRP or RLUSD.

```text
Bill: 30,000 JPY
A: 12,000 JPY
B: 10,000 JPY
C: 8,000 JPY
```

A Settlement Quote then defines each exact Settlement Amount. Fiat denomination is an accounting and display function; Group Pay still does not hold fiat or user funds.

## 12. Later Settlement Quotes

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
- a changed quote requires participant re-confirmation;
- quote failure never substitutes another asset or amount silently;
- Group Pay does not become an exchange, custodian, or bridge.

## 13. Later mixed-asset settlement

A future Bill may allow each PaymentSlot to select from approved assets.

```text
Accounting Currency: JPY
A: 12,000 JPY -> XRP
B: 10,000 JPY -> RLUSD
C: 8,000 JPY -> XRP
```

Bill progress remains denominated in JPY. XRP and RLUSD quantities are never added together.

Each slot stores its allowed assets, selected asset, active quote, final Settlement Amount, and verified receipt.

## 14. Later manual quote adjustment

A creator may later adjust a suggested Settlement Amount only when:

- the suggestion remains recorded;
- the final amount and difference are explicit;
- an adjustment reason is stored;
- the participant reviews the final value;
- prior wallet handoffs are invalidated.

The adjustment changes the settlement quote, not the underlying obligation, unless a separate Bill revision changes the obligation.

## 15. Proof and export

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

## 16. Required tests

- exact decimal parsing;
- excess-precision rejection;
- minimum and maximum allowed values;
- Equal allocation with and without remainder;
- Percentage total validation;
- Shares with uneven division;
- Custom under, exact, and over states;
- creator-share invariant;
- deterministic remainder assignment;
- XRP drops compatibility;
- RLUSD canonical decimal serialization;
- locale-independent stored values;
- frozen allocation immutability.
