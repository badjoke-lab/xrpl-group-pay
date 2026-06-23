# XRPL Group Pay — Threat Model

**Status:** Draft for PR 1  
**Document class:** Public  
**Method:** Asset, actor, trust-boundary, abuse-case, and mitigation analysis

## 1. Security objectives

1. Never mark an invalid transaction as paid.
2. Never cause the user to sign a different destination or amount than the reviewed bill.
3. Never expose a private key, seed, API secret, or management capability.
4. Never process one transaction as payment for multiple slots.
5. Preserve strict Testnet/Mainnet separation.
6. Minimize privacy leakage from shared URLs, logs, and on-chain fields.
7. Remain safely recoverable from duplicate notifications and temporary network failure.

## 2. Protected assets

- User XRP.
- User signing intent.
- Frozen destination and amount.
- Payment-slot InvoiceID.
- Make Waves or other configured Source Tag.
- Creator management capability.
- Participant capability.
- Xaman API credentials.
- Webhook verification secret.
- Database integrity.
- Transaction-verification result.
- Privacy of participant labels and bill metadata.
- Availability of payment and verification flows.

## 3. Actors

### Legitimate actors

- Bill creator.
- Expected payer.
- Proof viewer.
- Application operator.
- Xaman.
- XRPL node provider.
- Hosting and database provider.

### Threat actors

- Person who obtains a participant link.
- Person who obtains a management link.
- Malicious bill creator.
- Malicious payer.
- Webhook forger.
- Automated abuse client.
- Dependency or supply-chain attacker.
- Infrastructure attacker.
- Opportunistic observer of public XRPL data.

## 4. Trust boundaries

```text
Browser
  | HTTPS
Application server
  | API credentials / signed webhook
Xaman
  | signed transaction
XRPL network
  | validated ledger data
Application verification service
  | atomic database transition
Database
```

No response crossing a boundary is treated as final without validation appropriate to that boundary.

## 5. Threat register

| ID | Threat | Impact | Required mitigation |
|---|---|---|---|
| T01 | Shared participant URL is leaked | Unauthorized person views or attempts the payment | High-entropy token, minimal disclosed data, optional expected payer, ability to revoke unused slot |
| T02 | Creator management URL is leaked | Bill mutation or private progress disclosure | Separate high-entropy token, store hash, never log token, rotation/revocation support |
| T03 | Amount changed between review and signing | User signs wrong amount | Freeze slot, build payload from server state, show final confirmation, verify on-ledger amount |
| T04 | Destination changed | Funds sent to attacker | Freeze destination, server-side payload construction, show destination, on-ledger destination verification |
| T05 | Destination Tag omitted or changed | Funds miscredited | Freeze optional tag, show it, compare exact presence/value |
| T06 | Source Tag omitted or changed | Attribution and verification failure | Server-side configuration, include in template, compare validated transaction |
| T07 | InvoiceID collision | Wrong slot correlation | Cryptographically secure 256-bit values, unique database constraint |
| T08 | Fake transaction hash submitted | False paid state | Fetch from expected XRPL network, validate all transaction fields |
| T09 | Transaction not yet validated | Reorg or provisional result treated as final | Keep validating state until `validated=true` |
| T10 | Non-success result | Failed transaction treated as payment | Require metadata result `tesSUCCESS` |
| T11 | Partial Payment attack | Less value delivered than expected | Reject partial-payment flag and compare `delivered_amount` |
| T12 | Issued-currency payment | Wrong asset accepted | Require string drops for `Amount` and `delivered_amount` |
| T13 | Wrong sender | Another account takes a participant slot | Compare `Account` with expected payer; route mismatch to review |
| T14 | Wrong network | Testnet transaction satisfies Mainnet bill | Store network on every entity, query expected network only, compare Xaman network result |
| T15 | Same transaction reused | Multiple slots paid by one transaction | Unique `(network, tx_hash)` constraint |
| T16 | Duplicate webhook | State or metrics double counted | Idempotent handler and atomic state transition |
| T17 | Webhook forged | Attacker triggers false processing | Verify Xaman webhook signature; re-fetch payload independently |
| T18 | Payload result modified client-side | Browser claims payment | Ignore client claims as evidence; server re-fetches payload and ledger transaction |
| T19 | Race between webhook and page polling | Inconsistent state | One verification service, transactional compare-and-set |
| T20 | Bill changed after links issued | Signed conditions differ from displayed bill | Freeze payment-critical fields after publication |
| T21 | Capability tokens appear in logs | Long-lived unauthorized access | Path/query redaction, no third-party analytics on capability pages |
| T22 | Xaman secret exposed to client | API abuse | Server-only secrets, build-time client bundle checks |
| T23 | Raw webhook bodies retained | Unnecessary personal or security data | Verify in memory; retain minimal normalized event |
| T24 | Node returns temporary not-found | Valid payment marked failed | Retry with bounded backoff and explicit `not_yet_found` state |
| T25 | Node inconsistency or outage | Verification unavailable | Redundant endpoints, timeout, retry, no optimistic paid state |
| T26 | Automated payload creation | Rate-limit or cost abuse | Per-IP and per-capability limits, one active payload per slot, expiry |
| T27 | Malicious bill title or participant label | Stored XSS | Schema limits, escaping, no raw HTML |
| T28 | Very large amount or integer error | Incorrect XRP amount | Parse decimal safely to integer drops, no floating-point storage, upper limits |
| T29 | Dependency compromise | Credential theft or malicious transaction | Lockfile, trusted registry, audit, minimal dependencies, update review |
| T30 | Mainnet enabled by mistake | Real-value loss during testing | Explicit deployment gate, separate secrets and databases, prominent network UI |
| T31 | Public proof leaks labels | Privacy loss | Default pseudonymous proof, separate optional disclosure controls |
| T32 | Enumeration of public IDs | Bill discovery | Random identifiers, uniform invalid response, rate limiting |
| T33 | CSRF on creator actions | Unauthorized mutation | Same-site cookies where used, origin checks, explicit confirmation |
| T34 | Open redirect in Xaman return flow | Phishing | Allowlisted return origins and fixed server-generated paths |
| T35 | Stale or replayed Xaman payload | Old request accepted | Payload-to-slot binding, expiry, one active request, compare frozen revision |

## 6. Payment verification algorithm

```text
1. Load payment slot, bill, frozen revision, and expected network.
2. Load normalized Xaman payload result from the server.
3. Require resolved and signed.
4. Extract transaction hash and reported network.
5. Fetch transaction from the expected XRPL endpoint.
6. If not found, remain pending until retry budget or explicit expiry.
7. Require validated.
8. Require Payment and tesSUCCESS.
9. Compare sender, destination, optional Destination Tag, Source Tag, InvoiceID.
10. Require XRP drops and exact expected Amount.
11. Require exact delivered_amount.
12. Reject partial-payment and unsupported path fields.
13. Begin database transaction.
14. Insert unique transaction observation.
15. Compare-and-set slot to paid.
16. Recompute bill state.
17. Commit.
```

## 7. Capability design requirements

- At least 128 bits of random entropy.
- URL-safe encoding.
- Hash at rest for management and participant capabilities.
- Constant-time comparison where applicable.
- Rotation and revocation for creator capability.
- No capability in Referer headers to third-party content.
- `Referrer-Policy: no-referrer`.
- No external scripts on payment, management, and proof pages unless reviewed.

## 8. Input limits

Initial proposed limits:

- Bill title: 1–100 Unicode characters.
- Participant label: 0–60 Unicode characters.
- Participants per bill: 2–50.
- XRP precision: maximum 6 decimal places.
- Amount: positive integer drops, bounded by a configurable maximum.
- Destination Tag: UInt32.
- Source Tag: UInt32.
- XRPL addresses: validated by the XRPL library and network-independent syntax checks.
- No user-provided HTML.
- No user-provided Memo content.

## 9. Logging policy

Allowed:

- Internal request ID.
- Route name without capability token.
- Normalized error code.
- Network.
- Non-secret entity IDs.
- Truncated transaction hash where operationally useful.

Forbidden:

- Xaman API secret.
- Full capability token.
- Seed or private key.
- Signed transaction blob unless an approved diagnostic mode is active.
- Raw authorization header.
- Full webhook body after normalization.
- Participant label in infrastructure logs.

## 10. Security release gates

### Testnet gate

- All mismatch fixtures rejected.
- Duplicate webhook test passes.
- Wrong-network test passes.
- Capability leakage review passes.
- Xaman secrets absent from client bundle.

### Mainnet gate

- Testnet gate passed.
- Separate Mainnet secrets and database.
- Mainnet amount limit.
- Prominent network and real-value warning.
- Dependency audit clean or risk accepted in writing.
- Incident and rollback procedure documented.
- Controlled small-value transaction test passed.

## 11. Residual risks

- A user can still approve a malicious or mistaken bill created by another person.
- A public XRPL transaction exposes addresses and amounts.
- A bill label can become identifying when combined with off-chain knowledge.
- The operator cannot reverse a validated payment.
- Xaman, node providers, or hosting providers may be unavailable.
- Strict technical verification cannot prove that the underlying real-world expense was legitimate.

These risks must be disclosed rather than represented as eliminated.
