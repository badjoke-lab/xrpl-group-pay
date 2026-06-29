"use client";

import { Languages } from "lucide-react";

import { SUPPORTED_LOCALES, type Locale } from "@/features/localization/catalog";
import { useLocalization } from "@/features/localization/provider";

const LABEL_KEYS = {
  en: "language.english",
  ja: "language.japanese",
  ko: "language.korean",
} as const;

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLocalization();

  return (
    <label className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
      <Languages aria-hidden="true" className="size-4" />
      {!compact && <span>{t("language.label")}</span>}
      <select
        aria-label={t("language.label")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="min-h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand focus:ring-3 focus:ring-focus/20"
      >
        {SUPPORTED_LOCALES.map((item) => (
          <option key={item} value={item}>
            {t(LABEL_KEYS[item])}
          </option>
        ))}
      </select>
    </label>
  );
}
