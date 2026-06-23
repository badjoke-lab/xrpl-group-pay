# XRPL Group Pay — Responsive Behavior

**Status:** Draft for PR 1  
**Document class:** Public

## 1. Supported viewport targets

```text
Minimum: 320px
Mobile default test: 390 × 844
Large mobile: 430 × 932
Tablet: 768 × 1024
Desktop: 1440 × 900
Wide desktop: 1600px and above
```

## 2. Breakpoint policy

```text
base: 0–639px
sm: 640px+
md: 768px+
lg: 1024px+
xl: 1280px+
2xl: 1536px+
```

The application is implemented mobile-first. A breakpoint is added because the information structure changes, not to force a device category.

## 3. Payer pages

### Mobile

- Single column.
- Maximum readable width with 20px page padding.
- Primary action near the bottom and optionally sticky when it does not obscure content.
- Amount centered or strongly emphasized.
- Technical details collapsed.
- Xaman fallback QR shown in a sheet or dedicated view.

### Tablet/Desktop

- Payment card centered with a maximum width around 520–600px.
- Supporting security explanation may appear beside the payment card.
- QR and deep-link options can be visible together.
- No creator dashboard navigation on participant capability routes.

## 4. Creator creation flow

### Mobile

- Step-based flow.
- One participant editor at a time or stacked participant rows.
- Sticky total and next action.
- Advanced recipient details collapsed when not required.

### Tablet

- Form and live summary can appear as two columns.
- Participant list uses denser rows.

### Desktop

- Left/main area for bill and participant editing.
- Right sticky summary.
- Inline validation and total reconciliation.
- Keyboard-efficient participant entry.

## 5. Creator management

### Mobile

- Top app bar.
- Bottom navigation only for creator workspace.
- Summary cards followed by participant list.
- Participant detail opens as a sheet or full-screen view.
- Table columns become labeled rows.

### Desktop

```text
Sidebar | Main participant/activity workspace | Summary/actions
```

- Sidebar remains visible.
- Participant list uses a table or structured list.
- Summary panel can remain sticky.
- Export, QR, and bill actions are grouped separately from payment state.

## 6. Table transformation

Desktop columns:

```text
Participant | Expected | Status | Sender | Transaction | Updated
```

Mobile row:

```text
Participant label      Status
Expected amount
Sender
Transaction
Updated
```

No horizontal scrolling for the primary participant list at 320px.

Technical proof tables may allow controlled horizontal scroll with a visible affordance.

## 7. Sticky behavior

Allowed:

- Mobile payer CTA.
- Mobile creation total/next action.
- Desktop bill summary.
- Desktop table header for long lists.

Requirements:

- Must not cover validation errors.
- Must respect safe-area insets.
- Must not trap keyboard focus.
- Must collapse when on-screen keyboard would obscure an input.

## 8. Navigation

Participant routes:

- Product mark.
- Network badge.
- No global creator navigation.

Creator mobile:

- Home.
- Bills.
- Future Groups.
- Settings.

Future items not available in the initial release must not appear as enabled controls.

Creator desktop:

- Sidebar navigation.
- Create bill CTA.
- Network and account/capability context.

## 9. Dialogs and sheets

Mobile:

- Prefer bottom sheet for QR, participant actions, and short confirmation.
- Use full page for payment confirmation and safety-critical actions.

Desktop:

- Dialog for compact actions.
- Side panel for participant or transaction detail.
- Full page for proof and complex creation.

Destructive or Mainnet payment confirmation must not be hidden inside a casual swipe-dismiss sheet.

## 10. Long content

Bill title:

- Maximum input length.
- Wrap to two lines in summaries.
- Full title available on detail page.

Participant label:

- Ellipsis in dense table.
- Full label in detail.

Addresses and hashes:

- Short form in summaries.
- Full form wraps anywhere.
- Copy button remains visible.

Large amounts:

- Scale down one step before wrapping.
- Never clip decimals or XRP unit.
- Use tabular numerals where supported.

## 11. Zoom and reflow

At 200% zoom:

- No loss of action.
- No overlapping panels.
- Desktop multi-column layouts may collapse.
- Proof data remains readable.
- Sticky regions do not consume most of the viewport.

At 400% zoom around 1280px:

- Core flow remains usable as a single-column layout where required by accessibility targets.

## 12. Orientation

Landscape mobile:

- Payment action remains visible.
- Avoid full-height decorative sections.
- Sheets allow internal scrolling.
- Safe-area handling supports notches.

## 13. Screenshot and visual regression matrix

Every UI PR tests:

```text
320 × 568
390 × 844
430 × 932
768 × 1024
1024 × 768
1440 × 900
```

Critical pages also test:

- Long English copy.
- Future Japanese localization fixture.
- Large amount.
- Maximum participant label.
- Error state.
- Loading state.
- Empty state.
