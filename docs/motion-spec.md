# XRPL Group Pay — Motion Specification

**Status:** Active  
**Scope:** Make Waves v1 motion behavior  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Principles

Motion communicates cause and effect, state progression, spatial relationship, completion, and recoverable failure.

Motion must not:

- make a financial action feel casual;
- hide asset, amount, issuer, destination, or warning information;
- delay proof access;
- imply success before ledger verification;
- make Testnet look like Mainnet value transfer;
- disguise a changed quote or amount;
- compete with the primary settlement value.

## 2. Timing

```css
--duration-instant: 80ms;
--duration-fast: 160ms;
--duration-base: 220ms;
--duration-slow: 320ms;
--duration-success: 480ms;

--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-enter: cubic-bezier(0, 0, 0, 1);
--ease-exit: cubic-bezier(0.3, 0, 1, 1);
```

Avoid elastic or bounce easing for payment, asset, quote, and Mainnet confirmation.

## 3. Buttons and page transition

Button press scale is at most 0.98. Loading preserves width and remains paired with explanatory status text.

Page transitions use a short fade and 4–8px movement. Returning from a Wallet Provider does not trigger a long or decorative transition.

Locale switching uses no animation that implies navigation to another Bill or changes focus unexpectedly.

## 4. Dialogs and sheets

Backdrops fade around 160ms. Sheets enter around 220ms and exit around 160ms. Focus moves into the mounted surface. Reduced-motion mode removes translation.

Mainnet confirmation is not placed in a casual swipe-only sheet.

## 5. Participant and allocation editing

Adding a participant fades and expands the row, then moves focus to the first field. Removing a participant requires an explicit action and announces the total change.

Changing Equal, Percentage, Shares, or Custom allocation may animate the summary subtly, but final values update immediately and remain readable.

Remainder reassignment is announced and never hidden behind animation.

## 6. Asset and readiness changes

Switching XRP and RLUSD may update units and supporting information with a short fade. The interface must not animate through intermediate financial values.

RLUSD readiness uses restrained checking motion. Ready, blocked, and unavailable states include text and do not rely on motion.

## 7. Wallet Handoff and verification

### Handoff created

Activate the wallet step without implying payment.

### Awaiting wallet

Use restrained progress and clear text.

### Submitted

Move from wallet step to ledger-verification step.

### Validating

Show explicit checks such as:

```text
Transaction received
Waiting for validated ledger
Checking destination and asset
Checking amount and identifiers
```

### Verified

Use one short check transition. No repeated confetti or looping success animation.

## 8. Bill progress

Progress width may animate 220–320ms. Counts and amounts update immediately. A newly paid row may receive a brief subtle highlight and screen-reader announcement.

XRP and RLUSD remain separately labeled during any transition.

## 9. Future quote updates

A new or refreshed Settlement Quote must not make an amount appear to change without explanation.

Show the previous state, updated value, expiry, and required participant re-confirmation before enabling a new Wallet Handoff.

Manual adjustment uses no celebratory or minimizing animation.

## 10. Error transition

Errors appear without shaking the whole page. Field errors use focus and visible text. Verification mismatch may use a brief attention fade, not a dramatic flash.

## 11. Reduced motion

Respect `prefers-reduced-motion: reduce`.

- no scale transforms;
- no large translation;
- progress changes immediately or with a simple fade;
- success icon appears without drawing animation;
- text status may replace continuous rotation;
- locale, asset, and allocation changes remain fully understandable.

## 12. Prohibited motion

- confetti on ordinary settlement;
- bounce on financial values;
- pulsing destination or issuer;
- full-screen looping backgrounds;
- delayed proof access;
- fake progress percentages;
- success before `validated=true`;
- animation that hides an asset or quote change;
- motion-only indication of network, issuer, readiness, or status.
