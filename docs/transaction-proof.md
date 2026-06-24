# XRPL Group Pay — Public Transaction Proof

**Status:** Active  
**Document class:** Public  
**Initial network:** XRPL Testnet

## 1. Purpose

A public transaction proof is a read-only view of one XRP Payment that XRPL Group Pay previously verified against a validated ledger and recorded as a durable receipt.

The proof page exists so a payer, bill creator, or third-party viewer can inspect the immutable payment facts without receiving access to private bill or participant data.

## 2. Public identifier

Each verified receipt already has a canonical SHA-256 `proof_digest`. The Testnet proof URL places that digest in the URL fragment:

```text
/testnet/proof#token=<PROOF_DIGEST>
```

The fragment is not included in the initial page request, server access logs, or referrer path. The browser sends the digest to the no-store proof API only after the page loads.

The digest is a public proof identifier, not an authorization secret. It is derived from the normalized receipt facts:

- network;
- transaction ID;
- ledger index;
- sender;
- destination;
- amount in drops;
- delivered amount in drops;
- Source Tag;
- Destination Tag presence and value;
- InvoiceID.

Verification and recording timestamps are not part of the digest, so later re-verification remains idempotent.

## 3. Published fields

The proof API publishes only facts that are already public on the XRP Ledger or intentionally exposed as proof metadata:

- Testnet network;
- validated status;
- `tesSUCCESS` result;
- transaction ID;
- ledger index;
- sender address;
- destination address;
- requested and delivered XRP drops;
- Source Tag;
- optional Destination Tag;
- InvoiceID;
- verification timestamp;
- receipt-recording timestamp;
- proof digest.

## 4. Excluded fields

The proof API and page do not publish:

- bill title;
- participant label;
- creator or read-only bill capabilities;
- participant payment capability;
- expected payer data before the payment appeared on-ledger;
- Xaman payload UUID;
- internal Bill, PaymentSlot, or receipt IDs;
- operational diagnostics.

A proof viewer cannot edit the bill, alter a payment slot, or initiate a replacement payment.

## 5. Integrity checks

Before returning a proof, the server:

1. normalizes the supplied 256-bit identifier to uppercase;
2. retrieves one verified receipt through the unique proof-digest index;
3. validates every stored field against the public proof schema;
4. recomputes the SHA-256 digest from the immutable receipt facts;
5. rejects the proof if the stored digest and recomputed digest differ.

A malformed, missing, or unavailable proof uses a uniform response and reveals no private application data.

## 6. Caching and logging

Proof API responses use:

```text
Cache-Control: no-store
```

The application does not use third-party analytics on proof pages. Logs must not include the full proof URL or URL fragment.

## 7. Relationship to ledger verification

The public page reads the durable receipt created by the validated-ledger verification pipeline. Viewing a proof does not resubmit a transaction, move funds, or mutate bill state.

A proof receipt records what Group Pay verified at the stated time. The underlying XRP Ledger transaction remains independently public and immutable.
