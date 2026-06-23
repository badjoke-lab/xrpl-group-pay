# XRPL Group Pay — UI/UX Specification

**Status:** Draft for PR 1  
**Document class:** Public  
**Design concept:** Warm Settlement Utility

## 1. Product experience

The interface must feel like a modern shared-expense product, not a generic crypto wallet. It should communicate:

- Direct payment.
- Clear responsibility.
- Verifiable completion.
- Human group context.
- Calm financial safety.

Xaman is the signing wallet, not the Group Pay brand.

## 2. Brand direction

### Primary

Deep Plum represents product identity, headings, selected navigation, important financial values, and trusted links.

### Action

Coral represents the primary user action. It is used sparingly so that a payment or creation action is visually unambiguous.

### Status

- Emerald: verified success.
- Amber: pending attention or time-sensitive warning.
- Red: blocking error or dangerous mismatch.
- Neutral gray: unpaid, inactive, or secondary information.

## 3. User roles

### Payer

Needs a focused, low-navigation flow:

```text
Payment details
-> Final review
-> Xaman handoff
-> Waiting
-> Ledger verification
-> Verified result or actionable error
```

### Creator

Needs creation and management workflows:

```text
Create bill
-> Allocate shares
-> Review and publish
-> Share participant links
-> Monitor progress
-> View settlement proof
```

### Proof viewer

Needs a read-only, technical but understandable verification page.

## 4. Mobile experience

Mobile is the primary payer environment.

Rules:

- One primary action per step.
- Main action anchored near the bottom where appropriate.
- Amount is the strongest visual element.
- Destination is visible before handoff.
- Xaman handoff has recovery options.
- Browser return does not assume the transaction is already final.
- Loading, signing, submission, and validation are distinct states.
- No desktop sidebar on participant pages.

## 5. Desktop experience

Desktop is a creator workspace, not an enlarged phone.

Use:

- Left navigation.
- Main bill or participant table.
- Right summary panel.
- Bulk-friendly participant editing.
- Persistent bill totals and progress.
- Visible QR and export actions.
- More technical detail on proof pages.

## 6. Screen hierarchy

### Payer-critical screens

- C01 Payment details.
- C02 Final confirmation.
- C03 Xaman launch and recovery.
- C04 Awaiting signature.
- C05 Rejected or expired.
- C06 Ledger verification.
- C07 Verified payment.
- C08 Verification exception.

### Creator-critical screens

- B01 Bill basics.
- B02 Participants and amounts.
- B03 Review.
- B04 Created and shared.
- D01 Progress.
- D02 Settlement complete.
- E03 Desktop bill detail.
- E05 Transaction proof.

## 7. Payment page content order

1. Product identity.
2. Network badge.
3. Bill title.
4. “Your share”.
5. XRP amount.
6. Recipient label/address.
7. Direct-payment, Xaman-signing, and ledger-verification assurances.
8. Primary payment action.
9. “Opens securely in Xaman”.
10. Network-fee disclosure.

Do not lead with technical fields such as InvoiceID or Source Tag.

## 8. Final confirmation

Must show:

- Exact XRP amount.
- Full destination available by expansion or copy.
- Destination Tag if present.
- Network.
- Irreversibility warning for Mainnet.
- Clear transition to Xaman.

The CTA is `Continue to Xaman`, not `Payment complete`.

## 9. Verification states

### Awaiting signature

Copy: `Waiting for your approval in Xaman`

### Submitted, not yet validated

Copy: `Payment submitted` and `Verifying on the XRP Ledger`

### Verified

Copy: `Payment verified`

### Not found yet

Copy: `The transaction is not visible on the expected network yet.`

### Mismatch

Copy: `Payment requires review`

Do not present internal exception codes as the only user-facing explanation.

## 10. Xaman presentation

- Xaman logo appears only in handoff-related contexts.
- Group Pay primary colors remain dominant.
- Main CTA can say `Pay 4 XRP`.
- Supporting copy says `Opens securely in Xaman`.
- Do not style the entire application in Xaman blue.
- Do not imply Xaman is operated by Group Pay.

## 11. Network presentation

Testnet:

- Small persistent badge.
- Calm explanatory copy.
- No implication of real-value production usage.

Mainnet:

- Strong but non-alarming warning before creation and payment.
- “Real XRP” language.
- Network must remain visible on confirmation and verification screens.

## 12. Error design

Errors are grouped:

### Recoverable interaction

- Xaman did not open.
- Sign request expired.
- User rejected.
- Temporary network error.

Provide retry or return action.

### Verification exception

- Wrong sender.
- Wrong destination.
- Wrong amount.
- Wrong network.
- Wrong InvoiceID.
- Duplicate transaction.

Do not auto-retry by creating a modified transaction. Show the expected and observed difference only when safe.

### Invalid capability

Use a neutral page that does not reveal whether a bill exists.

## 13. Empty and loading states

Every list and summary area has:

- Skeleton state.
- Empty state.
- Partial data state.
- Failure state.

A spinner alone is insufficient for long ledger verification. Show the steps being performed.

## 14. Copy rules

- Use “payment” rather than “transfer execution”.
- Use “verified” only after ledger verification.
- Use “submitted” after Xaman submission but before validation.
- Use “recipient” for the destination account.
- Avoid “guaranteed”, “reversible”, and “protected funds”.
- State limitations directly.
- Display XRP with up to six decimal places without meaningless trailing zeros.
- Display addresses shortened by default with copy/full-view actions.

## 15. Language

Initial public UI language: English.

Architecture must support future Japanese localization:

- No text embedded in images.
- No concatenated sentence fragments.
- Labels have flexible width.
- Layout tolerates longer translated strings.

## 16. Visual anti-patterns

Do not use:

- Neon crypto gradients.
- Excessive blue wallet branding.
- Decorative charts without a user decision.
- Glassmorphism that reduces readability.
- Heavy shadows around every section.
- Multiple competing primary buttons.
- Tiny gray text.
- Status indicated by color alone.
- Confetti on every payment.
- Animation that delays access to proof.

## 17. Mockup baseline

The approved direction uses:

- Warm off-white background.
- White surfaces.
- Deep Plum brand color.
- Coral primary CTA.
- Moderate rounding.
- Minimal shadow.
- Large financial amount.
- Calm, restrained spacing.
- Mobile-first payer flow.
- Information-dense desktop creator workspace.
