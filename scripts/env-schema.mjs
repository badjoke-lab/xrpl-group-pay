import { z } from "zod";

const networkSchema = z.enum(["testnet", "mainnet"]);

const rawBuildEnvSchema = z.object({
  APP_NETWORK: networkSchema.optional(),
  NEXT_PUBLIC_APP_NETWORK: networkSchema.default("testnet"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  ALLOW_MAINNET_BUILD: z.enum(["true", "false"]).default("false"),
});

export function parseBuildEnv(input) {
  const parsed = rawBuildEnvSchema.parse(input);
  const appNetwork = parsed.APP_NETWORK ?? parsed.NEXT_PUBLIC_APP_NETWORK;

  if (appNetwork !== parsed.NEXT_PUBLIC_APP_NETWORK) {
    throw new Error(
      "APP_NETWORK and NEXT_PUBLIC_APP_NETWORK must identify the same XRPL network.",
    );
  }

  if (appNetwork === "mainnet" && parsed.ALLOW_MAINNET_BUILD !== "true") {
    throw new Error(
      "Mainnet builds are blocked unless ALLOW_MAINNET_BUILD=true is set explicitly.",
    );
  }

  return {
    appNetwork,
    publicAppNetwork: parsed.NEXT_PUBLIC_APP_NETWORK,
    publicAppUrl: parsed.NEXT_PUBLIC_APP_URL,
    allowMainnetBuild: parsed.ALLOW_MAINNET_BUILD === "true",
  };
}
