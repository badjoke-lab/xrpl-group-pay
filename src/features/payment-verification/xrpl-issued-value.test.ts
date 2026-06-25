import { describe, expect, it } from "vitest";

import {
  XrplIssuedValueError,
  xrplIssuedValueToUnits,
} from "./xrpl-issued-value";

describe("xrplIssuedValueToUnits", () => {
  it.each([
    ["1.25", "1250000"],
    ["1.250000", "1250000"],
    ["125e-2", "1250000"],
    ["1.25E0", "1250000"],
    ["0", "0"],
  ])("converts %s without floating-point arithmetic", (value, units) => {
    expect(xrplIssuedValueToUnits(value, 6)).toBe(units);
  });

  it("rejects values that cannot be represented at the application scale", () => {
    expect(() => xrplIssuedValueToUnits("0.0000001", 6)).toThrow(
      XrplIssuedValueError,
    );
  });

  it.each(["-1", "1,000", "NaN", "01"])(
    "rejects unsupported string number %s",
    (value) => {
      expect(() => xrplIssuedValueToUnits(value, 6)).toThrow(
        XrplIssuedValueError,
      );
    },
  );
});
