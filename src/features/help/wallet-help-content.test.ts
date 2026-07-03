import { describe, expect, it } from "vitest";

import type { Locale } from "@/features/localization/catalog";

import {
  getWalletHelpContent,
  WALLET_TROUBLESHOOTING_IDS,
} from "./wallet-help-content";

const locales: Locale[] = ["en", "ja", "ko"];

describe("wallet help content", () => {
  it.each(locales)("covers every troubleshooting topic in %s", (locale) => {
    const content = getWalletHelpContent(locale);
    expect(content.items.map((item) => item.id)).toEqual(
      WALLET_TROUBLESHOOTING_IDS,
    );
    expect(content.quickStartSteps.length).toBeGreaterThanOrEqual(5);
    expect(content.savedWalletSteps.length).toBeGreaterThanOrEqual(5);
    expect(content.localOnlyBullets.length).toBeGreaterThanOrEqual(5);
    for (const item of content.items) {
      expect(item.title).toBeTruthy();
      expect(item.symptom).toBeTruthy();
      expect(item.cause).toBeTruthy();
      expect(item.action.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps direct-entry fallback and unsupported transfer warnings explicit", () => {
    const en = getWalletHelpContent("en");
    const storage = en.items.find((item) => item.id === "saved-wallet-storage");
    const manual = en.items.find(
      (item) => item.id === "exchange-manual-transfer",
    );
    const mismatch = en.items.find(
      (item) => item.id === "payer-wallet-mismatch",
    );

    expect(storage?.action.join(" ")).toContain("direct address entry");
    expect(manual?.warning).toContain("not supported");
    expect(mismatch?.warning).toContain("will not settle");
  });

  it("keeps local storage and data exclusions explicit in every locale", () => {
    for (const locale of locales) {
      const content = getWalletHelpContent(locale);
      const combined = content.localOnlyBullets.join(" ").toLowerCase();
      expect(combined).toContain("indexeddb");
      expect(combined).toContain("d1");
      expect(combined).toContain("capabilit");
      expect(combined).toContain("invoiceid");
    }
  });
});
