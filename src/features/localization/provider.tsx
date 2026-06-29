"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  type Locale,
  type MessageKey,
  translate,
} from "./catalog";

const LOCALE_COOKIE = "xgp_locale";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type LocalizationContextValue = {
  locale: Locale;
  setLocale(locale: Locale): void;
  t(key: MessageKey, variables?: Record<string, string | number>): string;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      if (nextLocale === locale) return;
      document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
      document.documentElement.lang = nextLocale;
      setLocaleState(nextLocale);
      router.refresh();
    },
    [locale, router],
  );

  const value = useMemo<LocalizationContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, variables) => translate(locale, key, variables),
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
  const value = useContext(LocalizationContext);
  if (!value) {
    throw new Error("LocalizationProvider is required.");
  }
  return value;
}

export { LOCALE_COOKIE };
