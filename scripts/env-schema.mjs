import { z } from "zod";

const networkSchema = z.enum(["testnet", "mainnet"]);
const releaseModeSchema = z.enum(["disabled", "internal", "limited", "public"]);
const operationsModeSchema = z.enum(["halted", "verify-only", "enabled"]);
const uint32TextSchema = z
  .string()
  .regex(/^\d+$/)
  .refine((value) => Number(value) <= 4_294_967_295);

const rawBuildEnvSchema = z.object({
  APP_NETWORK: networkSchema.optional(),
  NEXT_PUBLIC_APP_NETWORK: networkSchema.default("testnet"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  ALLOW_MAINNET_BUILD: z.enum(["true", "false"]).default("false"),
  MAINNET_GATE_APPROVED: z.enum(["true", "false"]).default("false"),
  MAINNET_SOURCE_TAG_APPROVED: z.enum(["true", "false"]).default("false"),
  MAINNET_RELEASE_MODE: releaseModeSchema.default("disabled"),
  MAINNET_OPERATIONS_MODE: operationsModeSchema.optional(),
  PAYMENTS_DATABASE_BINDING: z.string().trim().min(1).optional(),
  XRPL_MAINNET_SOURCE_TAG: uint32TextSchema.optional(),
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
    if (parsed.MAINNET_OPERATIONS_MODE === undefined) {
      throw new Error(
        "Mainnet builds require an explicit MAINNET_OPERATIONS_MODE.",
      );
    }
    if (parsed.PAYMENTS_DATABASE_BINDING !== "PAYMENTS_DB_MAINNET") {
      throw new Error(
        "Mainnet builds require PAYMENTS_DATABASE_BINDING=PAYMENTS_DB_MAINNET.",
      );
    }
    if (parsed.MAINNET_SOURCE_TAG_APPROVED !== "true") {
      throw new Error(
        "Mainnet builds require MAINNET_SOURCE_TAG_APPROVED=true.",
      );
    }
    if (parsed.XRPL_MAINNET_SOURCE_TAG === undefined) {
      throw new Error(
        "Mainnet builds require an explicit XRPL_MAINNET_SOURCE_TAG UInt32 value.",
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
    mainnetSourceTagApproved:
      parsed.MAINNET_SOURCE_TAG_APPROVED === "true",
    mainnetReleaseMode: parsed.MAINNET_RELEASE_MODE,
    mainnetOperationsMode: parsed.MAINNET_OPERATIONS_MODE ?? "halted",
    xrplSourceTag:
      appNetwork === "mainnet" && parsed.XRPL_MAINNET_SOURCE_TAG !== undefined
        ? Number(parsed.XRPL_MAINNET_SOURCE_TAG)
        : null,
    paymentsDatabaseBinding:
      appNetwork === "mainnet" ? "PAYMENTS_DB_MAINNET" : "PAYMENTS_DB",
  };
}
