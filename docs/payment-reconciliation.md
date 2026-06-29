# Replacement Payment Reconciliation

**Status:** Active  
**Scope:** Wallet Handoff replacement safety boundary  
**Last reviewed:** 2026-06-29

## Purpose

A wallet flow can be interrupted after a payer signs or submits a Payment but before XRPL Group Pay verifies and records it. A replacement Wallet Handoff must not be created merely because the provider request appears expired, rejected, or unavailable.

Before replacing any prior Wallet Handoff, the application independently reviews validated XRPL history for the frozen expected payer and PaymentSlot InvoiceID.

## Trigger

Reconciliation runs only when a PaymentSlot already has at least one persisted Wallet Handoff and no active request remains. Initial handoff creation does not scan account history.

## Search boundary

The account history reader:

- uses the PaymentSlot network only;
- requires explicit Mainnet gate access for Mainnet reads;
- reads `account_tx` newest first;
- uses validated responses only;
- follows server pagination markers;
- limits each page to 200 transactions;
- reviews at most eight pages;
- fails closed when the complete bounded result cannot be obtained;
- filters candidates by exact expected payer and frozen InvoiceID before verification.

The InvoiceID filter is only candidate discovery. It is not payment proof.

## Independent verification

Every candidate is passed through the normal frozen Payment Intent verification contract. A candidate counts only when all applicable checks pass, including:

- expected network;
- validated `tesSUCCESS` Payment;
- exact sender and destination;
- exact XRP or official RLUSD Asset identity;
- exact requested and delivered amount;
- Source Tag and Destination Tag;
- frozen InvoiceID;
- no Partial Payment or unsupported path fields.

## Outcomes

### No exact validated match

A replacement Wallet Handoff may be created.

### Exactly one exact validated match

The existing transaction is settled idempotently through the normal receipt and PaymentSlot boundary. The replacement request is refused with `SLOT_ALREADY_PAID`.

### Multiple exact validated matches

No replacement request is created. The application atomically:

- records a public-safe reconciliation finding containing only transaction hashes, count, and reviewed ledger range;
- marks the PaymentSlot `needs_review`;
- marks the Bill `needs_review`;
- returns `PAYMENT_REQUIRES_REVIEW`.

### Unavailable or incomplete history

No replacement request is created. The application returns the retryable fail-closed result `PAYMENT_RECONCILIATION_UNAVAILABLE`.

## Privacy and safety

The durable finding must not contain capability tokens, payload identifiers, deep links, QR data, Xaman credentials, signed blobs, private keys, seeds, or mnemonics.

Reconciliation does not submit, refund, reverse, or otherwise move funds. It only reads validated public ledger history, verifies candidates, updates durable application state, and decides whether a replacement signing opportunity may be created.
