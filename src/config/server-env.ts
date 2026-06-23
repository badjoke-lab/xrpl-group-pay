import "server-only";

import { z } from "zod";

const XAMAN_API_BASE_URL = "https://xumm.app/api/v1/platform" as const;

const uint32Text = z
  .string()
  .regex(/^\d+$/, "XRPL_SOURCE_TAG must be an unsigned integer.")
  .transform((value) => Number(value))
  .refine(
    (value) => Number.isInteger(value) && value >= 0 && value <= 4_294_967_295,
    "XRPL_SOURCE_TAG must be a UInt32 value.",
  );

const xamanEnvironmentSchema = z.object({
  XAMAN_API_KEY: z.string().trim().min(1).max(256),
  XAMAN_API_SECRET: z.string().trim().min(1).max(256),
  XAMAN_API_BASE_URL: z.literal(XAMAN_API_BASE_URL).default(XAMAN_API_BASE_URL),
  XRPL_SOURCE_TAG: uint32Text,
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  APP_NETWORK: z.literal("testnet").default("testnet"),
});

export type XamanEnvironment = z.infer<typeof xamanEnvironmentSchema>;

export class XamanConfigurationError extends Error {
  constructor() {
    super("Xaman Testnet payment creation is not configured on this deployment.");
    this.name = "XamanConfigurationError";
  }
}

export function getXamanEnvironment(
  input: NodeJS.ProcessEnv = process.env,
): XamanEnvironment {
  const parsed = xamanEnvironmentSchema.safeParse(input);

  if (!parsed.success) {
    throw new XamanConfigurationError();
  }

  return parsed.data;
}
