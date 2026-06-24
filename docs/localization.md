# XRPL Group Pay — Localization

**Status:** Active  
**Scope:** English, Japanese, and Korean interface contract for Make Waves v1  
**Last reviewed:** 2026-06-24  
**Document class:** Public

## 1. Language policy

English is the canonical source language.

Make Waves v1 supports:

```text
en — English
ja — Japanese
ko — Korean
```

A translation is complete only when the full critical flow is usable in that language. A translated landing page followed by English-only payment or error screens is not complete support.

## 2. Same Bill, different interface languages

Locale is a presentation preference, not a Bill attribute that restricts participants.

The same Bill may be used as follows:

```text
Creator: Japanese interface
Participant A: English interface
Participant B: Korean interface
Proof viewer: any supported interface
```

Locale changes must not create a new Bill, PaymentSlot, Payment Intent, receipt, or proof.

## 3. Translated content

The following system content is localized:

- navigation;
- form labels;
- buttons;
- help text;
- validation messages;
- warnings;
- network notices;
- asset explanations;
- wallet-handoff instructions;
- payment status;
- verification status;
- progress labels;
- proof field labels;
- Roadmap and Changelog interface labels;
- accessibility names and announcements.

## 4. Content that is not automatically translated

The following values remain exactly as entered or recorded:

- Bill title;
- participant label;
- user-entered notes where later supported;
- XRPL address;
- transaction hash;
- currency code;
- issuer address;
- Source Tag;
- Destination Tag;
- InvoiceID;
- ledger index;
- proof digest;
- Wallet Provider name;
- asset brand name.

The interface may add a localized label around these values, but must not alter the values themselves.

## 5. Locale routing

The preferred public structure is locale-aware routing such as:

```text
/en/...
/ja/...
/ko/...
```

Capability material remains protected according to its existing route design. Switching locale must preserve the capability without exposing it in logs, referrers, analytics, or a new unsafe URL location.

The implementation may use a different route shape if it preserves the same security and usability properties.

## 6. Locale resolution order

For a user opening a page, locale is selected in this order:

1. explicit user selection stored in a safe preference;
2. locale encoded in the current route or shared-link default;
3. supported browser language;
4. English fallback.

An unsupported locale falls back to English without changing financial or authorization state.

## 7. Bill default locale

A Bill may record a default locale for newly generated shared links.

Rules:

- the default does not prevent participant switching;
- the default is not part of the payment proof;
- changing the default does not change frozen payment conditions;
- a locale setting is never used to infer nationality, residence, or legal jurisdiction.

## 8. Message catalogs

Application code uses stable message keys rather than embedded prose.

Examples:

```text
bill.create.title
bill.asset.label
bill.split.equal
bill.split.percentage
bill.split.shares
bill.split.custom
payment.amount.label
payment.wallet.continue
payment.asset.issuerVerified
payment.feeAsset.notice
payment.status.validating
error.asset.trustLineMissing
error.payment.wrongIssuer
proof.deliveredAmount
roadmap.status.available
changelog.section.security
```

Rules:

- keys describe meaning, not English sentence fragments;
- complete sentences are translated as complete messages;
- messages are not assembled by concatenating translated fragments;
- variables use named placeholders;
- plural handling uses locale-aware message rules;
- missing keys fail tests and fall back safely to English in production;
- raw external-provider errors are mapped to stable message keys.

## 9. Financial formatting

Stored and API values remain canonical and locale-independent.

Display uses locale-aware formatting for:

- grouping separators;
- decimal separators;
- currency placement;
- dates and times;
- percentages.

Examples may render differently:

```text
English: 10,000 JPY
Japanese: 10,000円
Korean: JP¥10,000
```

The underlying amount remains the same integer-unit value.

Rules:

- locale formatting never enters receipt digests;
- asset symbols never replace exact asset identity;
- RLUSD remains visibly identified as RLUSD;
- a generic dollar sign alone is insufficient for RLUSD;
- XRP and RLUSD precision rules come from their domain definitions, not locale defaults;
- user input is normalized and validated before financial arithmetic.

## 10. Date and time formatting

Dates and times are stored in a canonical machine format and displayed with locale-aware formatting.

Critical expiry information must include enough context to avoid ambiguity. Relative time may be shown in addition to, not instead of, an exact accessible timestamp where safety requires it.

## 11. Layout requirements

The interface must tolerate:

- longer Japanese and Korean labels;
- different line-break behavior;
- mixed Latin, Japanese, Korean, numeric, and address content;
- currency symbol placement changes;
- address and issuer wrapping;
- large text and 200% zoom;
- mobile widths down to the supported minimum.

No text may be embedded in required images. Fixed-width controls must not clip translated safety information.

## 12. Accessibility

Localization includes:

- translated accessible names;
- translated error summaries;
- translated live-region announcements;
- correct document `lang` value;
- focus preservation on locale switch where practical;
- screen-reader reading order that remains stable across locales;
- pronunciation-independent display of addresses, hashes, and codes.

A locale switch must not move the user past a financial confirmation step.

## 13. Critical-flow coverage

English, Japanese, and Korean catalogs must cover:

- landing and network notice;
- Bill creation;
- asset selection;
- allocation strategy;
- participant editing;
- review and freeze;
- created and share state;
- payment details;
- participant final confirmation;
- wallet handoff;
- rejection and expiry;
- ledger verification;
- verified result;
- Bill progress;
- public proof;
- RLUSD readiness and issuer information;
- all blocking and recoverable errors;
- public Roadmap and Changelog navigation.

## 14. Translation review

English is written first and reviewed for clarity before translation.

Japanese and Korean translations must be reviewed for:

- financial meaning;
- non-custodial wording;
- network and asset distinction;
- wallet instructions;
- irreversible-payment warnings;
- error recoverability;
- unnatural machine-translation phrasing;
- truncation and wrapping.

Technical identifiers remain unchanged even when surrounding explanatory text is translated.

## 15. API and export behavior

API fields and machine-readable exports use stable English identifiers.

Example:

```json
{
  "accounting_currency": "JPY",
  "obligation_amount": "10000",
  "settlement_asset": "XRP",
  "delivered_amount": "27.14"
}
```

Localized presentation is produced by the client or human-readable export layer. JSON keys do not change by locale.

## 16. Search and metadata

Public non-capability pages may provide localized metadata and content. Sensitive capability routes must prioritize privacy and must not expose Bill or participant data through metadata generation.

Canonical and alternate-language links may be used for public pages when they do not contain capabilities or private context.

## 17. Testing requirements

Automated tests include:

- every canonical English key exists in Japanese and Korean;
- no unknown key is used by the application;
- locale fallback works;
- document `lang` changes correctly;
- capability state survives locale switching;
- financial API payloads are identical across locales;
- serialized Payment Intents and receipts are locale-independent;
- dates, percentages, XRP, RLUSD, JPY, USD, and KRW fixtures format correctly;
- long translations do not hide primary actions;
- error and live-region messages are localized.

Manual tests include:

- Android critical flow in all three languages;
- desktop creator flow in all three languages;
- TalkBack review for at least the payer critical flow;
- 200% zoom;
- long Bill title and participant labels;
- mixed-script values and long issuer addresses.

## 18. Completion gate

A language is supported only when:

- the critical flow contains no unintended fallback text;
- financial and safety meaning matches the English source;
- layout remains usable at supported widths;
- accessibility labels and announcements are translated;
- locale switching cannot alter or bypass frozen payment conditions;
- all catalog and browser tests pass.
