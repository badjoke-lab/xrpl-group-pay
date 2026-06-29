import { describe, expect, it } from "vitest";

import { criticalTranslate } from "./critical-catalog";
import { progressTranslate } from "./progress-catalog";
import { proofTranslate } from "./proof-catalog";

describe("localized critical surfaces", () => {
  it("interpolates payer values without translating ledger identifiers", () => {
    expect(
      criticalTranslate("ja", "payer.state.verified.body", {
        amount: "0.000001",
        asset: "RLUSD",
      }),
    ).toContain("0.000001 RLUSD");
    expect(
      criticalTranslate("ko", "payer.confirm.title", { network: "Mainnet" }),
    ).toContain("Mainnet");
  });

  it("interpolates progress counts and Asset codes", () => {
    expect(
      progressTranslate("ja", "paidCount", { paid: 1, total: 2 }),
    ).toContain("1/2");
    expect(
      progressTranslate("ko", "exactPayment", { asset: "XRP" }),
    ).toContain("XRP");
  });

  it("keeps public proof transaction units intact", () => {
    expect(
      proofTranslate("ja", "delivered", { amount: "0.000001" }),
    ).toContain("0.000001 XRP");
    expect(proofTranslate("ko", "invoice")).toBe("InvoiceID");
  });
});
