import { describe, expect, it } from "vitest";

import { translatePublic } from "./public-copy";

describe("translatePublic", () => {
  it("uses natural Japanese copy on the public creator surface", () => {
    expect(translatePublic("ja", "home.title")).toBe("割り勘を、");
    expect(translatePublic("ja", "home.titleAccent")).toBe("もっと簡単に。");
    expect(translatePublic("ja", "bill.page.title")).toBe("割り勘の内容を入力");
    expect(translatePublic("ja", "bill.form.review")).toBe("入力内容を確認する");
  });

  it("explains the actual RLUSD requirements", () => {
    const notice = translatePublic("ja", "bill.asset.rlusdNotice");
    expect(notice).toContain("トラストライン");
    expect(notice).toContain("支払額分のRLUSD");
    expect(notice).toContain("手数料用の少額のXRP");
  });

  it("keeps variable interpolation", () => {
    expect(
      translatePublic("ja", "home.cta.create", { network: "Mainnet" }),
    ).toBe("Mainnetで請求を作る");
  });

  it("falls back to the original catalog outside Japanese overrides", () => {
    expect(translatePublic("en", "bill.asset.rlusd")).toBe(
      "Official Ripple USD issued on XRPL {network}",
    );
  });
});
