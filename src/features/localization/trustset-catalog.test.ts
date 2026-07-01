import { describe, expect, it } from "vitest";

import { trustSetTranslate } from "./trustset-catalog";

describe("TrustSet localization", () => {
  it("provides distinct English, Japanese, and Korean critical copy", () => {
    expect(trustSetTranslate("en", "noticeTitle")).toBe(
      "This is not a payment",
    );
    expect(trustSetTranslate("ja", "noticeTitle")).toBe(
      "これは支払いではありません",
    );
    expect(trustSetTranslate("ko", "noticeTitle")).toBe(
      "이 작업은 결제가 아닙니다",
    );
  });

  it("explains that TrustSet does not transfer or fund the bill", () => {
    for (const locale of ["en", "ja", "ko"] as const) {
      const copy = trustSetTranslate(locale, "noticeBody");
      expect(copy.length).toBeGreaterThan(40);
      expect(copy).toContain("XRP");
    }
  });
});
