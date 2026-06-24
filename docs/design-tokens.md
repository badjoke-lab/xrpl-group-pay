# XRPL Group Pay — Design Tokens

**Status:** Active  
**Scope:** Make Waves v1 visual system  
**Last reviewed:** 2026-06-24  
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

- `brand`: product identity, headings, selected navigation, key settlement values.
- `action`: one primary action per view.
- `success`: validated and completed only.
- `warning`: readiness, pending attention, expiry, or Mainnet caution.
- `danger`: blocking mismatch or unsafe configuration.
- `muted`: descriptive and secondary content.

XRP, RLUSD, wallets, and future rails do not receive separate application themes. Asset identity is communicated by text, badges, and details, not a wholesale color change.

## 3. Typography

Preferred:

```text
Heading: Manrope
Body: Inter or Geist Sans
Monospace: Geist Mono
```

Fallbacks use system fonts with Japanese and Korean glyph coverage.

## 4. Type scale

| Token | Size / line height | Use |
|---|---|---|
| display-amount | 48/52 mobile, 56/60 desktop | Primary Settlement Amount |
| display | 40/44 | Hero |
| h1 | 32/38 | Page title |
| h2 | 24/30 | Section title |
| h3 | 20/26 | Card or panel heading |
| body-lg | 18/28 | Important explanation |
| body | 16/24 | Default |
| body-sm | 14/20 | Secondary |
| label | 13/18, medium | Field or status label |
| caption | 12/17 | Technical support only |

Financial, asset, issuer, network, and safety information never uses caption size as its only presentation.

## 5. Spacing and radius

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

--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-pill: 999px;
```

Mobile page padding is normally 20px. Inputs and buttons use 12px radius. Major panels use 16–20px. Avoid applying large rounding to every text section.

## 6. Borders and shadows

```css
--border-default: 1px solid var(--color-border);
--border-strong: 1px solid #D6CDD0;
--shadow-sm: 0 1px 2px rgb(23 24 33 / 0.05);
--shadow-md: 0 8px 24px rgb(75 29 90 / 0.08);
```

Prefer borders and spacing. Medium shadow is reserved for sheets, dialogs, and important raised surfaces.

## 7. Buttons

Primary actions use Coral, white text, visible focus, and at least 52px mobile height. Secondary actions use white or subtle brand surfaces. Destructive actions use explicit danger text and cannot be confused with payment confirmation.

A Wallet Provider action may include the provider name without adopting its full brand color system.

## 8. Inputs

- minimum height 48px;
- visible label above the field;
- help and error below;
- focus ring retained;
- amount field shows a separate dynamic unit suffix;
- address and issuer fields use monospace values;
- percentage and share controls expose their units;
- no silent rounding;
- Destination Tag validates UInt32.

## 9. Asset and provider badges

Badges may identify:

- XRP;
- official RLUSD;
- Testnet or Mainnet;
- Xaman or another provider;
- official issuer verified;
- readiness blocked.

Badges include text. Verification and blocking states never rely on color or icon alone.

## 10. Status components

| State | Token | Suggested icon |
|---|---|---|
| Unpaid | neutral | empty circle |
| Awaiting wallet | brand | wallet or clock |
| Validating | brand | progress |
| Paid | success | check |
| Needs review | warning | alert |
| Failed | danger | x or alert |
| Expired | neutral/warning | clock |
| Cancelled | neutral | slash |
| Readiness ready | success | check |
| Readiness blocked | danger/warning | alert |

## 11. Progress

Progress uses a subtle track, Deep Plum fill, and success only when settled. It includes numeric amount, currency or asset, participant count, and text status.

## 12. Identifiers

Addresses, issuers, transaction identifiers, and proof digests use monospace and wrap anywhere. Short forms are summaries only; full values remain available by copy or expansion.

## 13. Localization

Tokens must support Latin, Japanese, and Korean text without changing semantic size hierarchy. Controls may grow vertically for translated labels. Fixed line heights do not clip glyphs.

## 14. Iconography

Use a consistent simple line-icon language. A custom Group Pay mark represents product identity. Avoid repeating XRP, RLUSD, or wallet logos as decoration.
