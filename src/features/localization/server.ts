import "server-only";

import { cookies, headers } from "next/headers";

import { resolveLocale, type Locale } from "./catalog";
import { LOCALE_COOKIE } from "./provider";

export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
}
