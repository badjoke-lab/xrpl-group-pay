# XRPL Group Pay — Accessibility Specification

**Status:** Draft for PR 1  
**Document class:** Public  
**Target:** WCAG 2.2 AA for supported user flows

## 1. General objective

A user must be able to create, review, sign, verify, and inspect a group payment without relying on precise pointer movement, color perception, animation, or visual layout alone.

## 2. Semantic structure

- One clear `h1` per page.
- Logical heading order.
- Native buttons for actions.
- Native links for navigation.
- Form controls associated with labels.
- Tables used only for actual tabular data.
- Status lists use appropriate list or progress semantics.
- Dialogs have accessible names and focus management.

## 3. Keyboard

All creator desktop actions must support keyboard operation.

Requirements:

- Visible focus ring.
- Logical tab order.
- No keyboard trap.
- Escape closes non-destructive dialogs.
- Enter does not accidentally submit an incomplete financial form.
- Destructive actions require explicit focused confirmation.
- Copy actions are keyboard accessible.

## 4. Touch targets

- Primary mobile actions: minimum 48×48 CSS px.
- Other interactive controls: target at least 44×44 where practical.
- Controls smaller than 44px require sufficient spacing and must still meet WCAG 2.2 minimum requirements.
- Adjacent participant actions must not be easy to confuse.

## 5. Color and contrast

- Normal text meets AA contrast.
- Large text meets AA contrast.
- Focus indicators are visible against both background and surface.
- Status is never represented by color alone.
- Testnet/Mainnet distinction uses text, not color alone.
- Disabled state remains readable.

Color contrast is validated against final rendered tokens before implementation approval.

## 6. Forms

Every field includes:

- Persistent label.
- Optional help text.
- Programmatically associated error.
- Required/optional indication.
- Correct input mode.
- Autocomplete only when appropriate.

Amount field:

- Decimal input mode.
- Visible XRP unit.
- Error for more than six decimals.
- No silent rounding.

Address field:

- Monospace value.
- Full value review.
- Copy control.
- Specific invalid-address error.

Destination Tag:

- Numeric input mode.
- UInt32 validation.
- Explanation that it may be required by the recipient.

## 7. Error handling

On failed submit:

- Focus moves to an error summary or first invalid field.
- Error summary links to affected fields.
- Existing values remain.
- Error message explains correction.
- No reliance on toast alone.

Verification errors:

- `aria-live` announcement.
- Plain-language status.
- Technical detail available separately.
- Retry does not erase evidence of the previous attempt.

## 8. Dynamic status announcements

Use polite live regions for:

- Xaman request created.
- Signature rejected or expired.
- Transaction submitted.
- Waiting for validation.
- Payment verified.
- Participant progress update.

Use assertive announcements only for blocking safety issues.

## 9. Progress

Bill progress includes:

- Text count.
- Amount count.
- Programmatic progress value.
- Clear settled label.

A circular visual alone is insufficient.

## 10. Motion

- Respect reduced-motion preference.
- No motion required to understand a state.
- No flashing content.
- Loading state includes text.
- Timed payload expiry is communicated before expiration where possible.

## 11. Zoom and text resize

- Usable at 200% zoom.
- No clipped main actions.
- No horizontal scroll for ordinary text at supported reflow targets.
- Addresses may wrap.
- Fixed headers and footers do not cover focused content.

## 12. Screen-reader payment review

The final confirmation reading order must announce:

1. Bill title.
2. Amount and XRP unit.
3. Mainnet or Testnet.
4. Destination address.
5. Destination Tag if present.
6. Irreversibility notice.
7. Continue-to-Xaman action.

## 13. QR alternative

A QR code is never the only path.

Provide:

- Deep link.
- Copyable link where safe.
- Text instruction.
- Accessible name for QR image.
- Clear distinction between payment URL and creator-management URL.

## 14. Testing

Automated:

- axe or equivalent.
- Semantic linting.
- Focus-visible checks.
- Color-token contrast check where possible.

Manual:

- Keyboard-only desktop flow.
- TalkBack on Android.
- VoiceOver/Safari before broad iOS claims.
- 200% browser zoom.
- Reduced motion.
- High-contrast or forced-colors review.
- Long localized strings.

## 15. Accessibility acceptance gate

A critical payment path cannot ship with:

- Unlabeled financial input.
- Unreachable primary action.
- Missing focus state.
- Color-only status.
- Unannounced verification completion.
- QR-only wallet handoff.
- Error that cannot be corrected without re-entering the entire bill.
