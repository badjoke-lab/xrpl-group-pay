import "server-only";

import { z } from "zod";

const sourceTagSchema = z
  .string()
  .regex(/^\d+$/)
  .transform((value) => Number(value))
  .refine(
    (value) => Number.isInteger(value) && value >= 0 && value <= 4_294_967_295,
  );

export class SourceTagConfigurationError extends Error {
  constructor() {
    super("The XRPL Source Tag is not configured on this deployment.");
    this.name = "SourceTagConfigurationError";
  }
}

export function getConfiguredSourceTag(
  input: Record<string, string | undefined> = process.env,
): number {
  const parsed = sourceTagSchema.safeParse(input.XRPL_SOURCE_TAG);
  if (!parsed.success) throw new SourceTagConfigurationError();
  return parsed.data;
}
