import { describe, expect, it } from "vitest";

import { CATALOGS, SUPPORTED_LOCALES, translate } from "./catalog";
import { resolveRequestLocale } from "./request-locale";

describe("localization catalogs", () => {
  it("uses the same keys for every supported locale", () => {
    const keys = Object.keys(CATALOGS.en).sort();
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(CATALOGS[locale]).sort()).toEqual(keys);
      expect(Object.values(CATALOGS[locale]).every(Boolean)).toBe(true);
    }
  });

  it("interpolates display variables", () => {
    expect(translate("ja", "home.description", { network: "Mainnet" })).toContain(
      "Mainnet",
    );
    expect(
      translate("ko", "bill.participant.number", { number: 3 }),
    ).toContain("3");
  });
});

describe("locale preference resolution", () => {
  it("prefers an explicit supported preference", () => {
    expect(
      resolveRequestLocale({
        cookie: "ko",
        acceptLanguage: "ja-JP,ja;q=0.9,en;q=0.8",
      }),
    ).toBe("ko");
  });

  it("skips unsupported browser languages", () => {
    expect(
      resolveRequestLocale({
        acceptLanguage: "fr-FR,ja-JP;q=0.9,en;q=0.8",
      }),
    ).toBe("ja");
  });

  it("falls back to English", () => {
    expect(
      resolveRequestLocale({
        cookie: "invalid",
        acceptLanguage: "fr-FR,de-DE;q=0.9",
      }),
    ).toBe("en");
  });
});
