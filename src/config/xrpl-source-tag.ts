import { z } from "zod";

import type { XrplNetwork } from "@/features/assets/types";

const uint32TextSchema = z
  .string()
  .regex(/^\d+$/, "Source Tag must be an unsigned integer.")
  .transform((value) => Number(value))
  .refine(
    (value) => Number.isInteger(value) && value >= 0 && value <= 4_294_967_295,
    "Source Tag must be a UInt32 value.",
  );

export class XrplSourceTagConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XrplSourceTagConfigurationError";
  }
}

function parseSourceTag(value: string | undefined, variableName: string) {
  const parsed = uint32TextSchema.safeParse(value);
  if (!parsed.success) {
    throw new XrplSourceTagConfigurationError(
      `${variableName} must be configured as a UInt32 value.`,
    );
  }
  return parsed.data;
}

export function resolveXrplSourceTag(
  input: Record<string, string | undefined>,
  network: XrplNetwork,
): number {
  if (network === "testnet") {
    const value = input.XRPL_TESTNET_SOURCE_TAG ?? input.XRPL_SOURCE_TAG;
    return parseSourceTag(
      value,
      input.XRPL_TESTNET_SOURCE_TAG === undefined
        ? "XRPL_SOURCE_TAG"
        : "XRPL_TESTNET_SOURCE_TAG",
    );
  }

  if (input.MAINNET_GATE_APPROVED !== "true") {
    throw new XrplSourceTagConfigurationError(
      "Mainnet Source Tag resolution requires MAINNET_GATE_APPROVED=true.",
    );
  }
  if (input.MAINNET_SOURCE_TAG_APPROVED !== "true") {
    throw new XrplSourceTagConfigurationError(
      "Mainnet Source Tag resolution requires MAINNET_SOURCE_TAG_APPROVED=true.",
    );
  }

  return parseSourceTag(
    input.XRPL_MAINNET_SOURCE_TAG,
    "XRPL_MAINNET_SOURCE_TAG",
  );
}
