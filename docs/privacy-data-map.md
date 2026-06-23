# XRPL Group Pay — Privacy Data Map

**Status:** Draft for PR 1  
**Document class:** Public  
**Principle:** Collect the minimum data required to coordinate and verify payments.

## 1. Privacy principles

1. No private keys or seeds.
2. No personal information in XRPL Memos.
3. No requirement for real names.
4. Participant labels are optional and may be pseudonyms.
5. Capability tokens are treated as secrets.
6. Public XRPL data is not represented as private.
7. Logs contain operational facts, not payment-page secrets.
8. Retention is limited and documented.
9. Payment and management pages avoid third-party tracking scripts.

## 2. Data classification

### Public

Already public on the XRP Ledger or intentionally published in a proof:

- Transaction hash.
- Ledger index.
- Sender XRPL address.
- Destination XRPL address.
- XRP amount.
- Source Tag.
- Destination Tag, when present.
- InvoiceID.
- Transaction result.
- Validation status.

### Private application data

- Bill title.
- Participant label.
- Bill state.
- Payment-slot state.
- Expected payer address before it appears on-ledger.
- Capability-protected progress data.
- Internal entity IDs.
- Xaman payload identifier.
- Operational timestamps.

### Restricted

- Xaman API key and secret.
- Webhook verification secret.
- Management capability.
- Participant capability.
- Secret environment configuration.
- Raw authorization headers.
- Temporary diagnostic payloads containing sensitive operational data.

The application never intentionally collects seeds or private keys. If such content is submitted to an input unexpectedly, it must not be stored and must trigger a security review.

## 3. Data inventory

| Data | Source | Purpose | Classification | Stored |
|---|---|---|---|---|
| Bill title | Creator | Identify bill off-chain | Private | Yes |
| Total drops | Creator | Validate allocation | Private, later inferable | Yes |
| Destination address | Creator | Build and verify Payment | Public after payment | Yes |
| Destination Tag | Creator | Route recipient credit | Public after payment | Yes when supplied |
| Creator share | Creator | Reconcile total | Private | Yes |
| Participant label | Creator | Human-readable coordination | Private | Optional |
| Expected payer address | Creator or future wallet claim | Verify sender | Private before payment, public after | Yes |
| Expected drops | Creator | Build and verify Payment | Private before payment | Yes |
| InvoiceID | Application | Slot correlation | Public after payment | Yes |
| Source Tag | Deployment config | Attribution | Public | Yes/reference |
| Xaman payload UUID | Xaman | Track sign request | Private | Yes |
| Payload status | Xaman | Drive state | Private | Yes |
| Transaction hash | Xaman/XRPL | Verification and proof | Public | Yes |
| Validated transaction facts | XRPL | Payment proof | Public | Yes |
| Capability token | Application | Authorization | Restricted | Hash only where practical |
| IP address | Network infrastructure | Security/rate limit | Private | Avoid persistent application storage |
| User agent | Browser | Compatibility/security | Private | Minimized |
| Logs | Application | Reliability/security | Private | Yes, redacted |

## 4. On-chain disclosure

XRPL transactions are public by design. A successful Payment can expose:

- Sender address.
- Destination address.
- Amount.
- Tags.
- InvoiceID.
- Time and ledger location.

The application must tell users before Mainnet signing that this information cannot be removed from the ledger.

InvoiceID must remain opaque. It must not encode:

- Bill title.
- Participant name.
- Email.
- Phone number.
- Event name.
- Detailed purchase description.

## 5. Capability URLs

Capability URLs provide access without requiring an account.

Controls:

- Cryptographic randomness.
- Hash at rest.
- Role separation.
- No capability in logs.
- No third-party analytics.
- No capability included in screenshots by default.
- Revocation for unused payment links.
- Rotation for management access.
- `Referrer-Policy: no-referrer`.

## 6. Proposed retention schedule

This schedule is an initial product policy and may be revised before Mainnet release.

| Data | Proposed retention |
|---|---|
| Abandoned draft bill | 30 days after last activity |
| Expired unused Xaman payload | 30 days after expiry |
| Normalized webhook event | 30 days after resolution |
| Raw webhook body | Not retained after verification, except short-lived secure diagnostics |
| Application logs | 14 days |
| Rate-limit identifiers | Maximum 24 hours unless investigating abuse |
| Active bill | Until final state |
| Settled/expired/cancelled bill data | 365 days after final state |
| Management and participant capability hashes | Delete or invalidate when retention period ends |
| Public transaction facts required for proof | Up to 365 days in application; remain public on XRPL independently |
| Security incident evidence | As required for the incident, access restricted and documented |

Before deletion, the application may offer a user-initiated export.

## 7. Deletion behavior

Deleting application data cannot delete XRPL transaction data.

Application deletion may remove:

- Bill title.
- Participant labels.
- Capability hashes.
- Expected but unused payer addresses.
- Off-chain progress records no longer required.
- Xaman payload references.
- Application proof page.

The privacy notice must distinguish application deletion from ledger immutability.

## 8. Logging and monitoring

Do not log:

- Capability tokens.
- Xaman secret.
- Authorization headers.
- Complete management URLs.
- Seed/private-key-like input.
- Participant labels.
- Raw signed blobs by default.

Logs should use:

- Request correlation IDs.
- Internal non-secret entity IDs.
- Error codes.
- Network.
- Operation name.
- Truncated transaction hash where necessary.

## 9. Third parties

Expected categories:

- Hosting provider.
- Database provider.
- Xaman.
- XRPL node provider.
- Error-monitoring provider, only if configured with strict redaction.

A third-party processor must not receive capability tokens or unrestricted page contents merely for analytics.

## 10. User-facing notices

Before creating a bill:

- Recipient address must be correct.
- Payment records are public on XRPL.
- The application does not hold funds.
- Off-chain bill data is stored for coordination.

Before paying:

- Amount, destination, Destination Tag, and network.
- Xaman will request the signature.
- A validated Mainnet payment cannot be removed from XRPL.
- Group Pay verifies but cannot reverse the payment.

## 11. Data-subject operations

Where applicable, the product should support:

- Export of application-held bill data.
- Deletion of capability-protected off-chain data.
- Correction before bill freezing.
- Contact route for privacy requests.
- Clear explanation of on-chain data limitations.

## 12. Mainnet privacy gate

Mainnet release requires:

- Published privacy notice.
- Approved retention schedule.
- Capability-token redaction test.
- No third-party analytics on sensitive routes.
- Verified database access controls.
- Data deletion test.
- On-chain disclosure warning reviewed in the UI.
