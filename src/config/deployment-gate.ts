import { z } from "zod";

export const deploymentNetworkSchema = z.enum(["testnet", "mainnet"]);
export const mainnetReleaseModeSchema = z.enum([
  "disabled",
  "internal",
  "limited",
  "public",
]);

const booleanTextSchema = z.enum(["true", "false"]).default("false");

const rawDeploymentEnvironmentSchema = z.object({
  APP_NETWORK: deploymentNetworkSchema.optional(),
  NEXT_PUBLIC_APP_NETWORK: deploymentNetworkSchema.default("testnet"),
  ALLOW_MAINNET_RUNTIME: booleanTextSchema,
  MAINNET_GATE_APPROVED: booleanTextSchema,
  MAINNET_RELEASE_MODE: mainnetReleaseModeSchema.default("disabled"),
  PAYMENTS_DATABASE_BINDING: z.string().trim().min(1).optional(),
});

export type DeploymentNetwork = z.infer<typeof deploymentNetworkSchema>;
export type MainnetReleaseMode = z.infer<typeof mainnetReleaseModeSchema>;

export type DeploymentTarget = {
  network: DeploymentNetwork;
  publicNetwork: DeploymentNetwork;
  databaseBinding: "PAYMENTS_DB" | "PAYMENTS_DB_MAINNET";
  mainnetReleaseMode: MainnetReleaseMode;
  mainnetRuntimeAllowed: boolean;
  mainnetGateApproved: boolean;
};

export class DeploymentGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeploymentGateError";
  }
}

export function resolveDeploymentTarget(
  input: Record<string, string | undefined>,
): DeploymentTarget {
  const parsed = rawDeploymentEnvironmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new DeploymentGateError("The deployment environment is invalid.");
  }

  const network = parsed.data.APP_NETWORK ?? parsed.data.NEXT_PUBLIC_APP_NETWORK;
  if (network !== parsed.data.NEXT_PUBLIC_APP_NETWORK) {
    throw new DeploymentGateError(
      "APP_NETWORK and NEXT_PUBLIC_APP_NETWORK must identify the same XRPL network.",
    );
  }

  const requestedBinding = parsed.data.PAYMENTS_DATABASE_BINDING;
  if (network === "testnet") {
    if (requestedBinding === "PAYMENTS_DB_MAINNET") {
      throw new DeploymentGateError(
        "A Testnet deployment cannot use the Mainnet payment database binding.",
      );
    }

    return {
      network,
      publicNetwork: parsed.data.NEXT_PUBLIC_APP_NETWORK,
      databaseBinding: "PAYMENTS_DB",
      mainnetReleaseMode: "disabled",
      mainnetRuntimeAllowed: false,
      mainnetGateApproved: false,
    };
  }

  const mainnetRuntimeAllowed = parsed.data.ALLOW_MAINNET_RUNTIME === "true";
  const mainnetGateApproved = parsed.data.MAINNET_GATE_APPROVED === "true";

  if (!mainnetRuntimeAllowed) {
    throw new DeploymentGateError(
      "Mainnet runtime is blocked unless ALLOW_MAINNET_RUNTIME=true is set explicitly.",
    );
  }
  if (!mainnetGateApproved) {
    throw new DeploymentGateError(
      "Mainnet runtime is blocked until MAINNET_GATE_APPROVED=true is set explicitly.",
    );
  }
  if (parsed.data.MAINNET_RELEASE_MODE === "disabled") {
    throw new DeploymentGateError(
      "Mainnet runtime is blocked while MAINNET_RELEASE_MODE=disabled.",
    );
  }
  if (requestedBinding !== "PAYMENTS_DB_MAINNET") {
    throw new DeploymentGateError(
      "Mainnet requires the dedicated PAYMENTS_DB_MAINNET binding.",
    );
  }

  return {
    network,
    publicNetwork: parsed.data.NEXT_PUBLIC_APP_NETWORK,
    databaseBinding: "PAYMENTS_DB_MAINNET",
    mainnetReleaseMode: parsed.data.MAINNET_RELEASE_MODE,
    mainnetRuntimeAllowed,
    mainnetGateApproved,
  };
}
