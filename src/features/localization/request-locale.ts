import { isLocale, type Locale } from "./catalog";

function supportedCandidate(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(primary) ? primary : null;
}

export function resolveRequestLocale(input: {
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  const cookie = supportedCandidate(input.cookie);
  if (cookie) return cookie;

  for (const entry of input.acceptLanguage?.split(",") ?? []) {
    const language = entry.split(";")[0]?.trim();
    const candidate = supportedCandidate(language);
    if (candidate) return candidate;
  }

  return "en";
}
