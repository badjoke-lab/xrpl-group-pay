import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export function parsePublicEnv(input: {
  NEXT_PUBLIC_APP_NETWORK?: string;
  NEXT_PUBLIC_APP_URL?: string;
}) {
  return publicEnvSchema.parse(input);
}

export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_APP_NETWORK: process.env.NEXT_PUBLIC_APP_NETWORK,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
