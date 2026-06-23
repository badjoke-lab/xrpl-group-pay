# XRPL Group Pay — Screen Inventory

**Status:** Draft for PR 1  
**Document class:** Public

## 1. Priority

- **P0:** Required for the first end-to-end MVP.
- **P1:** Required before completed v1/Mainnet release.
- **P2:** Later enhancement.

## 2. Common and entry

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| A01 | Landing | New user | P1 | Default, network notice |
| A02 | Network warning | Creator/payer | P1 Mainnet | Testnet, Mainnet confirmation |

## 3. Bill creation

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| B01 | Bill basics | Creator | P0 | Empty, valid, validation error |
| B02 | Participants and amounts | Creator | P0 | Under-allocated, exact, over-allocated |
| B03 | Review bill | Creator | P0 | Testnet review, Mainnet warning |
| B04 | Bill created and share | Creator | P0 | Individual links, copy success |
| B05 | QR display | Creator/payer | P1 | Individual QR, unavailable |

## 4. Participant payment

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| C01 | Payment details | Payer | P0 | Unpaid, expired, already paid |
| C02 | Final confirmation | Payer | P0 | Testnet, Mainnet |
| C03 | Open Xaman | Payer | P0 | Deep link, QR, app unavailable |
| C04 | Awaiting signature | Payer | P0 | Pending, opened |
| C05 | Rejected or expired | Payer | P0 | Rejected, payload expired, retry |
| C06 | Ledger verification | Payer | P0 | Not found yet, unvalidated, checking |
| C07 | Payment verified | Payer | P0 | Verified, bill now settled |
| C08 | Verification exception | Payer/creator | P0 | Mismatch, failure, duplicate, review |

## 5. Bill management

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| D01 | Mobile bill progress | Creator/viewer | P0 | Open, partial, validating |
| D02 | Settlement complete | Creator/viewer | P0 | Settled, export ready |
| D03 | Cancel bill | Creator | P1 | Eligible, blocked by payment |
| D04 | Expired bill | Creator/viewer | P1 | Extend, close, late-payment policy |

## 6. Desktop

| ID | Screen | Actor | Priority | Key states |
|---|---|---|---|---|
| E01 | Dashboard | Creator | P1 | Empty, active bills |
| E02 | Bill list | Creator | P1 | Search, filter, empty |
| E03 | Bill detail | Creator | P0 | Open, partial, settled, review |
| E04 | Desktop bill creation | Creator | P1 | Editing, validation |
| E05 | Transaction proof | Creator/viewer | P0 | Verified, failed, unavailable |
| E06 | Settings | Creator | P2 | Language, network, deletion |

## 7. High-fidelity mock set

### Mobile

- M01 — B01 Bill basics.
- M02 — B02 Participants and amounts.
- M03 — B03/B04 Review and share.
- M04 — C01 Payment details.
- M05 — C02 Final confirmation.
- M06 — C03/C04 Xaman launch and waiting.
- M07 — C06 Ledger verification.
- M08 — C07 Payment verified.
- M09 — D01/D02 Progress and settlement.

### Desktop

- P01 — E01 Dashboard.
- P02 — E03 Bill detail.
- P03 — E04 Bill creation.
- P04 — E05 Transaction proof.

### State sheet

- S01 — Empty, loading, rejected, expired, mismatch, invalid URL, network error, and cancelled states.

## 8. Required fixture content

Every critical screen is reviewed with:

- Short and maximum-length bill title.
- Empty and maximum-length participant label.
- Small and large XRP amount.
- Destination Tag present and absent.
- Testnet and Mainnet.
- Full and shortened addresses.
- Long transaction hash.
- English and long-translation fixture.
- Loading and error state.

## 9. Screen completion checklist

A screen is complete when:

- Actor and authorization are defined.
- Entry and exit routes are defined.
- Loading, empty, success, and failure behavior is defined.
- Mobile and desktop behavior is defined where applicable.
- Accessibility name and focus behavior are defined.
- Analytics or logging does not leak capability tokens.
- Testnet/Mainnet presentation is correct.
- Screenshot fixture exists for visual regression if critical.
