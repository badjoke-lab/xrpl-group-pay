import { describe, expect, it } from "vitest";

import { legacyRouteTarget } from "./legacy-route-redirect";

describe("legacyRouteTarget", () => {
  it("preserves locale queries and capability fragments", () => {
    expect(
      legacyRouteTarget("/payment", "?lang=ja", "#token=abc123"),
    ).toBe("/payment?lang=ja#token=abc123");
    expect(
      legacyRouteTarget("/bill/progress", "", "#token=progress123"),
    ).toBe("/bill/progress#token=progress123");
    expect(
      legacyRouteTarget("/proof", "?source=legacy", "#token=proof123"),
    ).toBe("/proof?source=legacy#token=proof123");
  });

  it("returns the canonical route when no query or fragment exists", () => {
    expect(legacyRouteTarget("/payment", "", "")).toBe("/payment");
  });
});
