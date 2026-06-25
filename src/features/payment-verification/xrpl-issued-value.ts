import { moneyScaleSchema, moneyUnitsSchema } from "@/features/money/types";

export class XrplIssuedValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XrplIssuedValueError";
  }
}

export function xrplIssuedValueToUnits(value: string, scale: number): string {
  const parsedScale = moneyScaleSchema.safeParse(scale);
  if (!parsedScale.success) {
    throw new XrplIssuedValueError("The application amount scale is invalid.");
  }

  const match = /^(0|[1-9]\d*)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(
    value.trim(),
  );
  if (!match) {
    throw new XrplIssuedValueError(
      "The XRPL issued value is not a supported non-negative string number.",
    );
  }

  const fraction = match[2] ?? "";
  const exponent = Number(match[3] ?? "0");
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) {
    throw new XrplIssuedValueError(
      "The XRPL issued value exponent is outside the supported range.",
    );
  }

  let digits = `${match[1]}${fraction}`.replace(/^0+(?=\d)/, "");
  const shift = parsedScale.data - (fraction.length - exponent);

  if (shift >= 0) {
    digits = `${digits}${"0".repeat(shift)}`;
  } else {
    const remove = -shift;
    if (remove > digits.length) {
      throw new XrplIssuedValueError(
        "The XRPL issued value cannot be represented at the application scale.",
      );
    }
    const discarded = digits.slice(digits.length - remove);
    if (!/^0+$/.test(discarded)) {
      throw new XrplIssuedValueError(
        "The XRPL issued value exceeds the application precision.",
      );
    }
    digits = digits.slice(0, digits.length - remove);
  }

  const canonical = digits.replace(/^0+(?=\d)/, "") || "0";
  const parsedUnits = moneyUnitsSchema.safeParse(canonical);
  if (!parsedUnits.success) {
    throw new XrplIssuedValueError(
      "The XRPL issued value is outside supported bounds.",
    );
  }
  return parsedUnits.data;
}
