# XRPL Group Pay — Public Transaction Proof

**Status:** Active  
**Scope:** Current XRP proof with approved issued-asset receipt extension  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Purpose

A public transaction proof is a read-only view of one payment that XRPL Group Pay verified against a validated ledger and recorded as a durable versioned receipt.

The proof lets a payer, creator, or third party inspect public settlement facts without receiving private Bill or participant data.

## 2. Receipt Contracts

Make Waves v1 uses:

```text
xrpl-xrp-payment-v1
xrpl-issued-payment-v1
```

The existing XRP contract and digest inputs remain unchanged. RLUSD and future approved XRPL issued assets use the issued-payment contract.

## 3. Public identifier

A proof URL uses the canonical receipt digest as a URL-fragment identifier. The browser sends it to a no-store proof API after page load.

The digest is a public proof identifier, not creator or participant authorization.

## 4. XRP proof facts

The current XRP digest continues to cover:

- network;
- transaction identifier;
- ledger index;
- sender and destination;
- requested and delivered drops;
- Source Tag;
- optional Destination Tag;
- InvoiceID.

Observation timestamps remain outside the digest.

## 5. Issued-asset proof facts

The issued-payment contract covers:

- Receipt Contract identifier;
- network;
- transaction identifier;
- ledger index;
- sender and destination;
- asset type;
- exact currency;
- exact issuer;
- requested decimal value;
- delivered decimal value;
- Source Tag;
- optional Destination Tag;
- InvoiceID.

The issuer is displayed in full because a ticker alone cannot identify RLUSD.

## 6. Published fields

A proof may publish only reviewed ledger facts and proof metadata:

- network and validated status;
- transaction result;
- transaction identifier and ledger index;
- sender and destination;
- asset identity;
- requested and delivered amount;
- tags and InvoiceID;
- Receipt Contract;
- proof digest.

## 7. Excluded fields

The proof does not publish:

- Bill title;
- participant label;
- private shared links;
- expected payer information that was not required to interpret public ledger facts;
- Wallet Provider request ID;
- internal entity IDs;
- operational diagnostics;
- future quote details unless a separate reviewed settlement-proof contract includes them.

A proof viewer cannot modify a Bill or create another payment.

## 8. Integrity checks

Before returning a proof, the server:

1. normalizes the supplied identifier;
2. loads one receipt through the unique proof-digest index;
3. selects the stored Receipt Contract;
4. validates all stored fields against that contract;
5. recomputes the digest from immutable receipt facts;
6. rejects a mismatch or unsupported contract.

Malformed, missing, and unavailable proofs use a uniform privacy-preserving response.

## 9. Caching and logging

Proof responses use `Cache-Control: no-store`. Proof pages do not use third-party analytics. Operational records do not include the full proof fragment.

## 10. Localization

Proof labels may be shown in English, Japanese, or Korean. Addresses, transaction identifiers, currency codes, issuer values, tags, InvoiceID, ledger index, and digest remain unchanged.

Changing locale does not change proof content or integrity.

## 11. Future accounting proof

A later fiat-denominated or mixed-asset flow may also show Accounting Currency, obligation amount, quote reference, suggested Settlement Amount, and final Settlement Amount.

Those fields require a separate reviewed contract and do not change existing XRP or issued-payment receipt semantics.
