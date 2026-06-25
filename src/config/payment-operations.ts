import { z } from "zod";

import type { DeploymentNetwork } from "./deployment-gate";

export const mainnetOperationsModeSchema = z.enum([
  "halted",
  "verify-only",
  "enabled",
]);

export type MainnetOperationsMode = z.infer<
  typeof mainnetOperationsModeSchema
>;
export type PaymentOperation = "create" | "verify";

export type PaymentOperationsState = {
  network: DeploymentNetwork;
  mode: MainnetOperationsMode | "testnet";
  creationEnabled: boolean;
  verificationEnabled: boolean;
  status: "operational" | "verification-only" | "halted";
};

const rawPaymentOperationsSchema = z.object({
  APP_NETWORK: z.enum(["testnet", "mainnet"]).optional(),
  NEXT_PUBLIC_APP_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  MAINNET_OPERATIONS_MODE: mainnetOperationsModeSchema.optional(),
});

export class PaymentOperationsConfigurationError extends Error {
  constructor() {
    super("Payment operations are not configured safely on this deployment.");
    this.name = "PaymentOperationsConfigurationError";
  }
}

export class PaymentOperationsHaltedError extends Error {
  readonly code = "PAYMENT_OPERATIONS_HALTED" as const;

  constructor(
    readonly operation: PaymentOperation,
    readonly mode: MainnetOperationsMode,
  ) {
    super(
      operation === "create" && mode === "verify-only"
        ? "New payment requests are temporarily paused while existing requests remain verifiable."
        : "Payment operations are temporarily paused on this deployment.",
    );
    this.name = "PaymentOperationsHaltedError";
  }
}

export function resolvePaymentOperations(
  input: Record<string, string | undefined>,
): PaymentOperationsState {
  const parsed = rawPaymentOperationsSchema.safeParse(input);
  if (!parsed.success) {
    throw new PaymentOperationsConfigurationError();
  }

  const network = parsed.data.APP_NETWORK ?? parsed.data.NEXT_PUBLIC_APP_NETWORK;
  if (network !== parsed.data.NEXT_PUBLIC_APP_NETWORK) {
    throw new PaymentOperationsConfigurationError();
  }

  if (network === "testnet") {
    return {
      network,
      mode: "testnet",
      creationEnabled: true,
      verificationEnabled: true,
      status: "operational",
    };
  }

  const mode = parsed.data.MAINNET_OPERATIONS_MODE ?? "halted";
  if (mode === "enabled") {
    return {
      network,
      mode,
      creationEnabled: true,
      verificationEnabled: true,
      status: "operational",
    };
  }
  if (mode === "verify-only") {
    return {
      network,
      mode,
      creationEnabled: false,
      verificationEnabled: true,
      status: "verification-only",
    };
  }
  return {
    network,
    mode,
    creationEnabled: false,
    verificationEnabled: false,
    status: "halted",
  };
}

export function assertPaymentOperationAllowed(
  input: Record<string, string | undefined>,
  operation: PaymentOperation,
): PaymentOperationsState {
  const state = resolvePaymentOperations(input);
  const enabled =
    operation === "create" ? state.creationEnabled : state.verificationEnabled;

  if (!enabled && state.network === "mainnet" && state.mode !== "testnet") {
    throw new PaymentOperationsHaltedError(operation, state.mode);
  }
  return state;
}
