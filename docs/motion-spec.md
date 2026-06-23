# XRPL Group Pay — Motion Specification

**Status:** Draft for PR 1  
**Document class:** Public

## 1. Motion principles

Motion communicates:

- Cause and effect.
- State progression.
- Spatial relationship.
- Completion.
- Recoverable failure.

Motion must not:

- Make a financial action feel casual.
- Hide important information.
- Delay proof access.
- Suggest success before ledger verification.
- Compete with the amount or destination.

## 2. Duration tokens

```css
--duration-instant: 80ms;
--duration-fast: 160ms;
--duration-base: 220ms;
--duration-slow: 320ms;
--duration-success: 480ms;
```

## 3. Easing

```css
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-enter: cubic-bezier(0, 0, 0, 1);
--ease-exit: cubic-bezier(0.3, 0, 1, 1);
```

Avoid elastic and bounce easing for payment confirmation.

## 4. Button feedback

- Press scale: maximum 0.98.
- Duration: instant/fast.
- Loading replaces the action label but preserves button width.
- A loading button remains associated with explanatory status text.
- Disabled state does not animate.

## 5. Page transition

- Short fade and 4–8px translation.
- Duration: 160–220ms.
- Back navigation preserves spatial expectation.
- No long route transition after returning from Xaman.

## 6. Dialog and sheet

- Backdrop fade: 160ms.
- Sheet enter: 220ms.
- Sheet exit: 160ms.
- Focus moves into the surface after it is mounted.
- Reduced-motion mode removes translation.

## 7. Participant editing

Adding a participant:

- New row fades and expands.
- Total updates smoothly.
- Focus moves to the new participant label.

Removing a participant:

- Requires explicit action.
- Row collapses after confirmation where necessary.
- Total change is announced.

## 8. Payment progression

### Request created

Subtle step activation.

### Awaiting signature

Use a restrained progress indicator. Do not imply ledger activity.

### Submitted

Transition from wallet step to ledger step.

### Validating

Indeterminate progress plus explicit checks:

```text
Transaction received
Waiting for validated ledger
Checking payment details
```

### Verified

One-time check transition. No repeated confetti or looping success animation.

## 9. Progress updates

Bill progress:

- Width may animate over 220–320ms.
- Count and amount update immediately and remain readable.
- Newly paid participant row receives a brief subtle highlight.
- Screen-reader announcement states the change.

## 10. Error transition

- Error surface appears without shaking the whole page.
- Field errors use focus and visible text.
- Verification exception may use a brief attention fade, not a dramatic red flash.

## 11. Reduced motion

Respect `prefers-reduced-motion: reduce`.

In reduced mode:

- No scale transforms.
- No large translation.
- Progress changes are immediate or simple fades.
- Success icon appears without drawing animation.
- Spinners remain usable but avoid unnecessary rotation where a text status can replace them.

## 12. Prohibited motion

- Confetti on ordinary payment.
- Bounce on financial amount.
- Pulsing destination address.
- Full-screen looping background animation.
- Delayed access to transaction proof.
- Fake progress percentages without a real basis.
- Success animation before `validated=true`.
- Animation that makes Testnet appear equivalent to Mainnet value transfer.
