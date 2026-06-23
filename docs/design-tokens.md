# XRPL Group Pay — Design Tokens

**Status:** Draft for PR 1  
**Document class:** Public

## 1. Color tokens

```css
:root {
  --color-background: #F7F4F1;
  --color-surface: #FFFFFF;
  --color-surface-subtle: #F2ECEF;
  --color-text: #171821;
  --color-text-muted: #6F6B73;
  --color-border: #E7E0DC;

  --color-brand: #4B1D5A;
  --color-brand-hover: #3B1747;
  --color-brand-subtle: #EFE5F1;

  --color-action: #F36F5A;
  --color-action-hover: #DB5C49;
  --color-action-subtle: #FDE9E5;

  --color-success: #168A62;
  --color-success-subtle: #E5F5EF;
  --color-warning: #D58A22;
  --color-warning-subtle: #FFF2DD;
  --color-danger: #C84545;
  --color-danger-subtle: #FBE8E8;

  --color-focus: #7A3D8C;
}
```

## 2. Semantic usage

- `brand`: identity, headings, selected navigation, key amounts.
- `action`: one primary action per view.
- `success`: validated and completed only.
- `warning`: pending attention, expiry, Mainnet caution.
- `danger`: blocking errors and mismatches.
- `muted`: descriptive and secondary text.

Do not use success green for “submitted” or “signed”. Those states are not yet verified.

## 3. Typography

Preferred:

```text
Heading: Manrope
Body: Inter or Geist Sans
Monospace: Geist Mono
```

Fallback:

```css
--font-heading: "Manrope", "Inter", system-ui, sans-serif;
--font-body: "Inter", "Geist", system-ui, sans-serif;
--font-mono: "Geist Mono", ui-monospace, monospace;
```

## 4. Type scale

| Token | Size / line height | Use |
|---|---|---|
| display-amount | 48/52 mobile, 56/60 desktop | Primary XRP amount |
| display | 40/44 | Hero |
| h1 | 32/38 | Page title |
| h2 | 24/30 | Section title |
| h3 | 20/26 | Card/panel heading |
| body-lg | 18/28 | Important explanation |
| body | 16/24 | Default |
| body-sm | 14/20 | Secondary |
| label | 13/18, medium weight | Field/status label |
| caption | 12/17 | Technical support |

Minimum ordinary body text is 14px. Primary financial and safety information must not use caption size.

## 5. Font weights

```text
Regular 400
Medium 500
Semibold 600
Bold 700
```

Avoid ultra-light weights.

## 6. Spacing scale

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

Mobile page padding: 20px.  
Desktop main content padding: 32px.  
Wide desktop maximum content width: 1440px where appropriate.

## 7. Radius

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-pill: 999px;
```

- Input and button: 12px.
- Major panel: 16–20px.
- Badge: pill.
- Do not apply a large radius to every textual section.

## 8. Borders

```css
--border-default: 1px solid var(--color-border);
--border-strong: 1px solid #D6CDD0;
```

Use borders and spacing before adding shadows.

## 9. Shadows

```css
--shadow-sm: 0 1px 2px rgb(23 24 33 / 0.05);
--shadow-md: 0 8px 24px rgb(75 29 90 / 0.08);
```

`shadow-md` is reserved for floating dialogs, sheets, and important raised surfaces.

## 10. Buttons

### Primary

- Coral background.
- White text.
- Minimum height 52px mobile.
- Full width on focused payer screens.
- Clear pressed, focus, loading, and disabled states.

### Secondary

- White or subtle brand surface.
- Deep Plum text.
- Border.

### Destructive

- Danger color.
- Requires explicit label.
- Never placed where it can be mistaken for payment confirmation.

### Text action

- Deep Plum.
- Underline on hover where appropriate.
- Not used for primary payment.

## 11. Inputs

- Minimum height 48px.
- Visible label above field.
- Help and error text below.
- Focus ring not removed.
- Amount field shows XRP suffix separately from editable text.
- Address field uses monospace for the address value.
- Destination Tag accepts digits only and validates UInt32 range.

## 12. Status components

| State | Token | Icon |
|---|---|---|
| Unpaid | neutral | minus or empty circle |
| Awaiting signature | brand | wallet/clock |
| Validating | brand | progress/spinner |
| Paid | success | check |
| Needs review | warning | alert |
| Failed | danger | x/alert |
| Expired | neutral/warning | clock |
| Cancelled | neutral | slash |

All statuses include text, not color alone.

## 13. Progress

- Track: warm border/subtle surface.
- Fill: Deep Plum.
- Settled: success.
- Animated width only when motion is allowed.
- Include numeric value and textual count.

## 14. Address and transaction identifiers

- Default shortened form: `rABC…9XYZ`.
- Full value available by copy and expansion.
- Monospace.
- Avoid line overflow.
- Use `overflow-wrap: anywhere` for full display.
- Copy confirmation is announced accessibly.

## 15. Iconography

Preferred style:

- Simple line icons.
- Consistent stroke width.
- Lucide-compatible visual language.
- Custom Group Pay mark for brand identity.

Avoid repeated XRP or Xaman logos as decoration.
