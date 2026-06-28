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
  MAINNET_RELEASE_MODE: z
    .enum(["disabled", "internal", "limited", "public"])
    .default("disabled"),
  MAINNET_OPERATIONS_MODE: mainnetOperationsModeSchema.optional(),
  MAINNET_ACCEPTANCE_EXPIRES_AT: z.string().datetime().optional(),
});

const MAX_INTERNAL_WINDOW_MILLISECONDS = 30 * 60 * 1000;

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

function haltedMainnetState(): PaymentOperationsState {
  return {
    network: "mainnet",
    mode: "halted",
    creationEnabled: false,
    verificationEnabled: false,
    status: "halted",
  };
}

export function resolvePaymentOperations(
  input: Record<string, string | undefined>,
  now = new Date(),
): PaymentOperationsState {
  const parsed = rawPaymentOperationsSchema.safeParse(input);
  if (!parsed.success || !Number.isFinite(now.getTime())) {
    throw new PaymentOperationsConfigurationError();
  }

  const network = parsed.data.APP_NETWORK ?? parsed.data.NEXT_PUBLIC_APP_NETWORK;
  if (network !== parsed.data.NEXT_PUBLIC_APP_NETWORK) {
    throw new PaymentOperationsConfigurationError();
  }

  const expiresAt = parsed.data.MAINNET_ACCEPTANCE_EXPIRES_AT;
  if (network === "testnet") {
    if (expiresAt !== undefined) {
      throw new PaymentOperationsConfigurationError();
    }
    return {
      network,
      mode: "testnet",
      creationEnabled: true,
      verificationEnabled: true,
      status: "operational",
    };
  }

  const mode = parsed.data.MAINNET_OPERATIONS_MODE ?? "halted";
  const controlledInternal =
    parsed.data.MAINNET_RELEASE_MODE === "internal" && mode !== "halted";

  if (!controlledInternal) {
    if (expiresAt !== undefined) {
      throw new PaymentOperationsConfigurationError();
    }
  } else {
    if (!expiresAt) {
      throw new PaymentOperationsConfigurationError();
    }
    const deadline = new Date(expiresAt).getTime();
    const current = now.getTime();
    if (!Number.isFinite(deadline)) {
      throw new PaymentOperationsConfigurationError();
    }
    if (deadline <= current) {
      return haltedMainnetState();
    }
    if (deadline - current > MAX_INTERNAL_WINDOW_MILLISECONDS) {
      throw new PaymentOperationsConfigurationError();
    }
  }

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
  return haltedMainnetState();
}

export function assertPaymentOperationAllowed(
  input: Record<string, string | undefined>,
  operation: PaymentOperation,
  now = new Date(),
): PaymentOperationsState {
  const state = resolvePaymentOperations(input, now);
  const enabled =
    operation === "create" ? state.creationEnabled : state.verificationEnabled;

  if (!enabled && state.network === "mainnet" && state.mode !== "testnet") {
    throw new PaymentOperationsHaltedError(operation, state.mode);
  }
  return state;
}
