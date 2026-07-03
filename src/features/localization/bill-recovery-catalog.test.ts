import { describe, expect, it } from "vitest";

import { billRecoveryTranslate } from "./bill-recovery-catalog";

const keys = [
  "title",
  "body",
  "copyTitle",
  "copyBody",
  "copyAction",
  "reviewTitle",
  "expected",
  "observed",
  "retryWarning",
  "acknowledgePrior",
  "acknowledgeRepeated",
  "authorize",
  "closeTitle",
  "closeBody",
  "acknowledgeStops",
  "acknowledgeRefunds",
  "confirmation",
  "closedTitle",
  "closedBody",
  "paidCount",
  "verifiedAmount",
  "unpaidAmount",
  "noRefund",
] as const;

describe("Bill recovery localization", () => {
  it.each(["en", "ja", "ko"] as const)(
    "provides all critical %s guidance",
    (locale) => {
      for (const key of keys) {
        expect(billRecoveryTranslate(locale, key).trim()).not.toBe("");
      }
    },
  );

  it("keeps the destructive typed confirmation stable in every language", () => {
    for (const locale of ["en", "ja", "ko"] as const) {
      expect(billRecoveryTranslate(locale, "confirmation")).toContain(
        "CLOSE_INCOMPLETE",
      );
    }
  });
});
