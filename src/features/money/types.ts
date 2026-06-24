import { z } from "zod";

export const MAX_MONEY_SCALE = 18;
export const MAX_MONEY_UNIT_DIGITS = 78;

export const moneyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z][A-Z0-9]{0,19}$/, "Use an uppercase money code.");

export const moneyUnitsSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)$/, "Money units must be a canonical unsigned integer.")
  .refine(
    (value) => value.length <= MAX_MONEY_UNIT_DIGITS,
    `Money units must not exceed ${MAX_MONEY_UNIT_DIGITS} digits.`,
  );

export const moneyScaleSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_MONEY_SCALE);

export const moneyAmountSchema = z
  .object({
    code: moneyCodeSchema,
    units: moneyUnitsSchema,
    scale: moneyScaleSchema,
  })
  .strict();

export type MoneyAmount = z.infer<typeof moneyAmountSchema>;
