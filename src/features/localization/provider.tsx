"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";

import {
  type Locale,
  type MessageKey,
} from "./catalog";
import { translatePublic } from "./public-copy";

const LOCALE_COOKIE = "xgp_locale";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type LocalizationContextValue = {
  locale: Locale;
  setLocale(locale: Locale): void;
  t(key: MessageKey, variables?: Record<string, string | number>): string;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);
const ENGLISH_FALLBACK: LocalizationContextValue = {
  locale: "en",
  setLocale: () => undefined,
  t: (key, variables) => translatePublic("en", key, variables),
};

export function LocalizationProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const locale = initialLocale;

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      if (nextLocale === locale) return;
      document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;

      // Server-rendered page copy also depends on this cookie. A full navigation is
      // required so the public shell and client form never remain in different
      // languages behind an intermediary cache.
      window.location.reload();
    },
    [locale],
  );

  const value = useMemo<LocalizationContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, variables) => translatePublic(locale, key, variables),
    }),
    [locale, setLocale],
  );

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  return useContext(LocalizationContext) ?? ENGLISH_FALLBACK;
}

export { LOCALE_COOKIE };
