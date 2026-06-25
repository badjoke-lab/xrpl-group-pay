import { z } from "zod";

const networkSchema = z.enum(["testnet", "mainnet"]);
const releaseModeSchema = z.enum(["disabled", "internal", "limited", "public"]);

const rawBuildEnvSchema = z.object({
  APP_NETWORK: networkSchema.optional(),
  NEXT_PUBLIC_APP_NETWORK: networkSchema.default("testnet"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  ALLOW_MAINNET_BUILD: z.enum(["true", "false"]).default("false"),
  MAINNET_GATE_APPROVED: z.enum(["true", "false"]).default("false"),
  MAINNET_RELEASE_MODE: releaseModeSchema.default("disabled"),
  PAYMENTS_DATABASE_BINDING: z.string().trim().min(1).optional(),
});

export function parseBuildEnv(input) {
  const parsed = rawBuildEnvSchema.parse(input);
  const appNetwork = parsed.APP_NETWORK ?? parsed.NEXT_PUBLIC_APP_NETWORK;

  if (appNetwork !== parsed.NEXT_PUBLIC_APP_NETWORK) {
    throw new Error(
      "APP_NETWORK and NEXT_PUBLIC_APP_NETWORK must identify the same XRPL network.",
    );
  }

  if (appNetwork === "testnet") {
    if (parsed.PAYMENTS_DATABASE_BINDING === "PAYMENTS_DB_MAINNET") {
      throw new Error(
        "A Testnet build cannot target the Mainnet payment database binding.",
      );
    }
  } else {
    if (parsed.ALLOW_MAINNET_BUILD !== "true") {
      throw new Error(
        "Mainnet builds are blocked unless ALLOW_MAINNET_BUILD=true is set explicitly.",
      );
    }
    if (parsed.MAINNET_GATE_APPROVED !== "true") {
      throw new Error(
        "Mainnet builds are blocked until MAINNET_GATE_APPROVED=true is set explicitly.",
      );
    }
    if (parsed.MAINNET_RELEASE_MODE === "disabled") {
      throw new Error(
        "Mainnet builds are blocked while MAINNET_RELEASE_MODE=disabled.",
      );
    }
    if (parsed.PAYMENTS_DATABASE_BINDING !== "PAYMENTS_DB_MAINNET") {
      throw new Error(
        "Mainnet builds require PAYMENTS_DATABASE_BINDING=PAYMENTS_DB_MAINNET.",
      );
    }
    const publicUrl = new URL(parsed.NEXT_PUBLIC_APP_URL);
    if (
      publicUrl.protocol !== "https:" ||
      publicUrl.hostname === "localhost" ||
      publicUrl.hostname === "127.0.0.1"
    ) {
      throw new Error(
        "Mainnet builds require a non-local HTTPS NEXT_PUBLIC_APP_URL.",
      );
    }
  }

  return {
    appNetwork,
    publicAppNetwork: parsed.NEXT_PUBLIC_APP_NETWORK,
    publicAppUrl: parsed.NEXT_PUBLIC_APP_URL,
    allowMainnetBuild: parsed.ALLOW_MAINNET_BUILD === "true",
    mainnetGateApproved: parsed.MAINNET_GATE_APPROVED === "true",
    mainnetReleaseMode: parsed.MAINNET_RELEASE_MODE,
    paymentsDatabaseBinding:
      appNetwork === "mainnet" ? "PAYMENTS_DB_MAINNET" : "PAYMENTS_DB",
  };
}
