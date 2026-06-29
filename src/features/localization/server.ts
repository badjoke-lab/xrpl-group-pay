import "server-only";

import { cookies, headers } from "next/headers";

import type { Locale } from "./catalog";
import { resolveRequestLocale } from "./request-locale";

const LOCALE_COOKIE = "xgp_locale";

export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveRequestLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
}
