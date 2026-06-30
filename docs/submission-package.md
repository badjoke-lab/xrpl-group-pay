# XRPL Group Pay — Make Waves submission package

**Status:** Mainnet acceptance approved; public operating deployment evidence pending

## Three-minute pitch structure

1. **Problem** — group expenses become manual calculations, copied addresses, screenshots, and uncertain payment status.
2. **Product** — one Bill, one Settlement Asset, exact participant obligations, separate private payment links.
3. **Signing** — each participant reviews the frozen payment and signs in their own Xaman wallet.
4. **Settlement** — funds move directly from payer to recipient; Group Pay never holds funds or private keys.
5. **Verification** — the server independently verifies the validated XRPL transaction before marking a slot paid.
6. **Safety** — one-shot Sequence binding and validated-ledger reconciliation prevent unsafe replacement handoffs.
7. **Why XRPL** — direct settlement, XRP and official RLUSD, validated public data, Source Tag attribution, and transaction correlation fields.
8. **Close** — Split the cost. Settle directly.

## Recommended eight-slide deck

1. Product title and live URL.
2. Shared-expense coordination problem.
3. Creator-to-participant product flow.
4. Non-custodial boundary.
5. Validated-ledger verification contract.
6. Duplicate-transfer and interrupted-wallet protections.
7. Why XRPL.
8. Final release evidence, metrics, repository, and next steps.

## Final evidence placeholders

Replace only after the fresh Mainnet RLUSD ceremony and final release audit pass:

- approved release commit;
- production deployment version;
- accepted XRP transaction hash;
- accepted RLUSD transaction hash;
- validated ledger indexes;
- receipt identifiers and proof digests;
- distinct successful signer count;
- verified transaction count;
- XRP delivered volume;
- RLUSD delivered volume;
- public release timestamp.

## Source Tag metrics boundary

Count only validated successful XRPL Mainnet `Payment` transactions carrying Source Tag `2171267705` within the final approved measurement range.

Report separately:

- distinct successful signer addresses;
- transaction count;
- XRP delivered volume in drops and XRP;
- official RLUSD delivered volume in fixed-precision scale-6 units and RLUSD.

Do not add XRP and RLUSD quantities together. Do not count Testnet, failed, unvalidated, missing-tag, synthetic, wash, or Sybil activity.

## Privacy rules for screenshots and recordings

Never expose:

- seeds, mnemonics, private keys, or signed blobs;
- Xaman credentials;
- bearer or capability tokens;
- payload UUIDs, deep links, QR contents, or websocket URLs;
- private participant labels or unnecessary Bill metadata;
- terminal output containing private request material.

Public transaction hashes, ledger indexes, Source Tag, verified InvoiceIDs, receipt identifiers, and proof digests may be shown only after independent verification and evidence acceptance.
