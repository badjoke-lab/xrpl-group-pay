# XRPL Group Pay — Make Waves submission package

**Status:** Public Mainnet deployment verified; final media and metrics pending

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

## Verified release evidence

- Public URL: `https://xgp.badjoke-lab.com`
- Approved public deployment commit: `2ff0c192276ebcbbdde1e98a02cb7bbe7ba6253c`
- Public deployment workflow: `https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/28460115824`
- Public release timestamp: `2026-06-30T16:33:11.279Z`
- XRP acceptance transaction: `7D4E2C90147C91112655516B96418BF5EB645E233A454F0CD5C23BC3F699EEEB`
- XRP validated ledger: `105236543`
- XRP receipt: `mainnet:7D4E2C90147C91112655516B96418BF5EB645E233A454F0CD5C23BC3F699EEEB`
- Official RLUSD acceptance transaction: `E68697F19F84E295654BF0EC920150FFD029A979E7B9A49D967995B3F4C10A27`
- Official RLUSD validated ledger: `105267303`
- Official RLUSD receipt: `mainnet:E68697F19F84E295654BF0EC920150FFD029A979E7B9A49D967995B3F4C10A27`
- Mainnet release evidence: `7/7 accepted`
- Mainnet acceptance controls: `14/14 passed`
- Mainnet gate checks: `10/10 passed`
- Open release findings: `0`

The public deployment report is committed at `evidence/mainnet-public-deployment-2026-06-30.json`. Receipt proof digests remain in the accepted release-evidence record and should be shown only where needed.

## Remaining final values

The final submission still needs:

- distinct successful signer count for the approved Source Tag range;
- verified transaction count for that range;
- XRP delivered volume;
- official RLUSD delivered volume;
- final pitch video and deck links.

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
