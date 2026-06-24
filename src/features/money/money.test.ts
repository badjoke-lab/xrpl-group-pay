import { describe, expect, it } from "vitest";

import {
  addMoneyAmounts,
  compareMoneyAmounts,
  decimalToUnits,
  formatMoneyAmount,
  MoneyAmountError,
  parseMoneyAmount,
  subtractMoneyAmounts,
  unitsToDecimal,
} from "./money";


describe("fixed-precision money", () => {
  it("parses XRP decimals into exact integer units", () => {
    expect(parseMoneyAmount("XRP", "1.25", 6)).toEqual({
      code: "XRP",
      units: "1250000",
      scale: 6,
    });
    expect(decimalToUnits("0001.250000", 6)).toBe("1250000");
    expect(decimalToUnits("0.000001", 6)).toBe("1");
  });

  it("formats integer units without changing their value", () => {
    expect(unitsToDecimal("1250000", 6)).toBe("1.25");
    expect(
      unitsToDecimal("1250000", 6, { trimTrailingZeros: false }),
    ).toBe("1.250000");
    expect(formatMoneyAmount({ code: "JPY", units: "100", scale: 0 })).toBe(
      "100",
    );
  });

  it.each(["1e-6", "1,000", "-1", "+1", ".5", "1.", ""]) (
    "rejects non-canonical decimal input %s",
    (value) => {
      expect(() => decimalToUnits(value, 6)).toThrow(MoneyAmountError);
    },
  );

  it("rejects excess precision instead of rounding", () => {
    expect(() => decimalToUnits("1.0000001", 6)).toThrow(
      "The amount supports at most 6 decimal places.",
    );
  });

  it("adds, subtracts, and compares compatible amounts", () => {
    const left = { code: "XRP", units: "1250000", scale: 6 } as const;
    const right = { code: "XRP", units: "750000", scale: 6 } as const;

    expect(addMoneyAmounts(left, right).units).toBe("2000000");
    expect(subtractMoneyAmounts(left, right).units).toBe("500000");
    expect(compareMoneyAmounts(left, right)).toBe(1);
  });

  it("rejects incompatible and negative arithmetic", () => {
    const xrp = { code: "XRP", units: "1", scale: 6 } as const;
    const rlusd = { code: "RLUSD", units: "1", scale: 6 } as const;

    expect(() => addMoneyAmounts(xrp, rlusd)).toThrow(MoneyAmountError);
    expect(() => subtractMoneyAmounts(xrp, { ...xrp, units: "2" })).toThrow(
      MoneyAmountError,
    );
  });

  it("bounds canonical integer size", () => {
    expect(() => decimalToUnits("1".repeat(79), 0)).toThrow(
      "Money units must not exceed 78 digits.",
    );
  });
});
