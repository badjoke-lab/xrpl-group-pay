# Mainnet RLUSD Wallet Handoff reuse incident

## Status

- Date: 2026-06-29
- Severity: release blocker
- Network: XRPL Mainnet
- Asset: official RLUSD
- Production operations after the ceremony: halted
- `live-mainnet-rlusd-acceptance`: not accepted

## What happened

During the controlled Mainnet RLUSD acceptance ceremony, the payer approved a Xaman Payment request. The wallet flow was interrupted after approval, and the same displayed Wallet Handoff was opened and approved again before application verification completed.

XRPL Mainnet validated two distinct Payments for the same frozen PaymentSlot identity:

| Field | Value |
| --- | --- |
| Sender | `rsMuUUdLC1wxrJ2DvQnTrnKGRhVxoLrhEj` |
| Destination | `rECPk8UQrbFcqAhPfy1g8UN5RyCrb42GTp` |
| Amount per transaction | `0.000001 RLUSD` |
| Source Tag | `2171267705` |
| InvoiceID | `D429E653672B7D22FD3E7F7C15CD761EDE629F668FD34EC28C37971FA0A020A7` |
| Transaction 1 | `1C951892CFDF31425F45D82A85E440872949063AB0C359F628C9C02E5CC64535` |
| Ledger 1 | `105245517` |
| Transaction 2 | `B84758C4EBA767584F9371B9B1C974490C0B81664443A8F1B224088D4E0A2A4B` |
| Ledger 2 | `105245533` |

Both transactions were shown by the wallet as successful and validated. No private capability, payload identifier, API credential, signed blob, seed, or mnemonic is recorded here.

## Impact

The durable settlement path prevents two different transactions from being recorded as payment for one PaymentSlot. That invariant protects application state but cannot reverse or prevent a second on-ledger transfer that the wallet has already signed and submitted.

The payer therefore transferred `0.000002 RLUSD` while the frozen slot expected `0.000001 RLUSD`.

## Root cause boundary

The immediate interruption may have been a connectivity failure or wallet process termination; the available evidence does not distinguish them. The application-level defect is independent of that trigger:

- the Xaman transaction template did not pin `Account`;
- it did not pin the payer's current `Sequence`;
- it did not pin `LastLedgerSequence`;
- reopening the same Wallet Handoff could therefore produce another independently valid Payment with the same InvoiceID.

XRPL does not make `InvoiceID` unique. Application receipt deduplication after submission is too late to stop the second transfer.

## Required remediation

1. Read the expected payer's `Sequence` from one validated-ledger `account_info` response.
2. Include the exact expected payer as `Account` in the Xaman transaction.
3. Include that one `Sequence` so repeated signatures compete for the same sequence and at most one can validate.
4. Include a bounded `LastLedgerSequence` so a stale request fails closed.
5. Fail handoff creation when validated signing state is unavailable or belongs to another account.
6. Add pre-replacement reconciliation for a validated transaction matching the PaymentSlot InvoiceID.
7. Repeat the controlled Mainnet RLUSD ceremony only after the one-shot invariant and reconciliation path are reviewed and deployed.

## Release decision

The observed transactions are incident evidence, not successful release evidence. Mainnet remains blocked and halted until remediation and a fresh acceptance ceremony are complete.
