import "server-only";

import { z } from "zod";

import { resolveXrplSourceTag } from "./xrpl-source-tag";

const XAMAN_API_BASE_URL = "https://xumm.app/api/v1/platform" as const;

const rawXamanEnvironmentSchema = z.object({
  XAMAN_API_KEY: z.string().trim().min(1).max(256),
  XAMAN_API_SECRET: z.string().trim().min(1).max(256),
  XAMAN_API_BASE_URL: z.literal(XAMAN_API_BASE_URL).default(XAMAN_API_BASE_URL),
  XRPL_SOURCE_TAG: z.string().optional(),
  XRPL_TESTNET_SOURCE_TAG: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  APP_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
});

export type XamanEnvironment = {
  XAMAN_API_KEY: string;
  XAMAN_API_SECRET: string;
  XAMAN_API_BASE_URL: typeof XAMAN_API_BASE_URL;
  XRPL_SOURCE_TAG: number;
  NEXT_PUBLIC_APP_URL: string;
  APP_NETWORK: "testnet" | "mainnet";
};

export class XamanConfigurationError extends Error {
  constructor() {
    super("Xaman payment creation is not configured on this deployment.");
    this.name = "XamanConfigurationError";
  }
}

export function getXamanEnvironment(
  input: NodeJS.ProcessEnv = process.env,
): XamanEnvironment {
  const parsed = rawXamanEnvironmentSchema.safeParse(input);

  if (!parsed.success) {
    throw new XamanConfigurationError();
  }

  try {
    return {
      XAMAN_API_KEY: parsed.data.XAMAN_API_KEY,
      XAMAN_API_SECRET: parsed.data.XAMAN_API_SECRET,
      XAMAN_API_BASE_URL: parsed.data.XAMAN_API_BASE_URL,
      XRPL_SOURCE_TAG: resolveXrplSourceTag(input, parsed.data.APP_NETWORK),
      NEXT_PUBLIC_APP_URL: parsed.data.NEXT_PUBLIC_APP_URL,
      APP_NETWORK: parsed.data.APP_NETWORK,
    };
  } catch {
    throw new XamanConfigurationError();
  }
}
