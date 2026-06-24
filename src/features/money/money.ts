import {
  MAX_MONEY_UNIT_DIGITS,
  moneyAmountSchema,
  moneyCodeSchema,
  moneyScaleSchema,
  moneyUnitsSchema,
  type MoneyAmount,
} from "./types";

export class MoneyAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyAmountError";
  }
}

function requireScale(scale: number) {
  const parsed = moneyScaleSchema.safeParse(scale);
  if (!parsed.success) {
    throw new MoneyAmountError("Money scale is outside the supported range.");
  }
  return parsed.data;
}

function requireCode(code: string) {
  const parsed = moneyCodeSchema.safeParse(code);
  if (!parsed.success) {
    throw new MoneyAmountError("Money code is invalid.");
  }
  return parsed.data;
}

function requireUnits(units: string) {
  const parsed = moneyUnitsSchema.safeParse(units);
  if (!parsed.success) {
    throw new MoneyAmountError("Money units are not a canonical unsigned integer.");
  }
  return parsed.data;
}

function removeLeadingZeros(value: string) {
  return value.replace(/^0+(?=\d)/, "");
}

export function decimalToUnits(value: string, scale: number): string {
  const normalizedScale = requireScale(scale);
  const text = value.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);

  if (!match) {
    throw new MoneyAmountError(
      "Use a plain non-negative decimal without separators or exponent notation.",
    );
  }

  const whole = match[1];
  const fraction = match[2] ?? "";
  if (fraction.length > normalizedScale) {
    throw new MoneyAmountError(
      `The amount supports at most ${normalizedScale} decimal places.`,
    );
  }

  const units = removeLeadingZeros(
    `${whole}${fraction.padEnd(normalizedScale, "0")}`,
  );
  const canonicalUnits = units === "" ? "0" : units;

  if (canonicalUnits.length > MAX_MONEY_UNIT_DIGITS) {
    throw new MoneyAmountError(
      `Money units must not exceed ${MAX_MONEY_UNIT_DIGITS} digits.`,
    );
  }

  return requireUnits(canonicalUnits);
}

export type FormatUnitsOptions = {
  trimTrailingZeros?: boolean;
};

export function unitsToDecimal(
  units: string,
  scale: number,
  options: FormatUnitsOptions = {},
): string {
  const canonicalUnits = requireUnits(units);
  const normalizedScale = requireScale(scale);

  if (normalizedScale === 0) return canonicalUnits;

  const padded = canonicalUnits.padStart(normalizedScale + 1, "0");
  const whole = padded.slice(0, -normalizedScale);
  let fraction = padded.slice(-normalizedScale);

  if (options.trimTrailingZeros !== false) {
    fraction = fraction.replace(/0+$/, "");
  }

  return fraction.length === 0 ? whole : `${whole}.${fraction}`;
}

export function parseMoneyAmount(
  code: string,
  decimalValue: string,
  scale: number,
): MoneyAmount {
  return moneyAmountSchema.parse({
    code: requireCode(code),
    units: decimalToUnits(decimalValue, scale),
    scale: requireScale(scale),
  });
}

export function formatMoneyAmount(
  amount: MoneyAmount,
  options?: FormatUnitsOptions,
): string {
  const parsed = moneyAmountSchema.parse(amount);
  return unitsToDecimal(parsed.units, parsed.scale, options);
}

function requireCompatibleAmounts(
  left: MoneyAmount,
  right: MoneyAmount,
): [MoneyAmount, MoneyAmount] {
  const parsedLeft = moneyAmountSchema.parse(left);
  const parsedRight = moneyAmountSchema.parse(right);

  if (
    parsedLeft.code !== parsedRight.code ||
    parsedLeft.scale !== parsedRight.scale
  ) {
    throw new MoneyAmountError(
      "Money amounts must use the same code and scale.",
    );
  }

  return [parsedLeft, parsedRight];
}

export function addMoneyAmounts(
  left: MoneyAmount,
  right: MoneyAmount,
): MoneyAmount {
  const [parsedLeft, parsedRight] = requireCompatibleAmounts(left, right);
  return moneyAmountSchema.parse({
    code: parsedLeft.code,
    units: (BigInt(parsedLeft.units) + BigInt(parsedRight.units)).toString(),
    scale: parsedLeft.scale,
  });
}

export function subtractMoneyAmounts(
  left: MoneyAmount,
  right: MoneyAmount,
): MoneyAmount {
  const [parsedLeft, parsedRight] = requireCompatibleAmounts(left, right);
  const result = BigInt(parsedLeft.units) - BigInt(parsedRight.units);

  if (result < 0n) {
    throw new MoneyAmountError("Money subtraction cannot produce a negative amount.");
  }

  return moneyAmountSchema.parse({
    code: parsedLeft.code,
    units: result.toString(),
    scale: parsedLeft.scale,
  });
}

export function compareMoneyAmounts(
  left: MoneyAmount,
  right: MoneyAmount,
): -1 | 0 | 1 {
  const [parsedLeft, parsedRight] = requireCompatibleAmounts(left, right);
  const leftUnits = BigInt(parsedLeft.units);
  const rightUnits = BigInt(parsedRight.units);

  if (leftUnits < rightUnits) return -1;
  if (leftUnits > rightUnits) return 1;
  return 0;
}
