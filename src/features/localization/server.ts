import "server-only";

import { cookies, headers } from "next/headers";

import { resolveLocale, type Locale } from "./catalog";

const LOCALE_COOKIE = "xgp_locale";

export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
}
