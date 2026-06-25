import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { resolveDeploymentTarget } from "@/config/deployment-gate";

import type { D1DatabaseLike } from "./d1-types";

export class PaymentsDatabaseUnavailableError extends Error {
  constructor() {
    super("Verified payment storage is not configured on this deployment.");
    this.name = "PaymentsDatabaseUnavailableError";
  }
}

function isD1Database(value: unknown): value is D1DatabaseLike {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<D1DatabaseLike>;
  return (
    typeof candidate.prepare === "function" &&
    typeof candidate.batch === "function"
  );
}

function deploymentInput(
  bindings: Record<string, unknown>,
  processEnvironment: Record<string, string | undefined>,
) {
  const input = { ...processEnvironment };
  for (const key of [
    "APP_NETWORK",
    "NEXT_PUBLIC_APP_NETWORK",
    "ALLOW_MAINNET_RUNTIME",
    "MAINNET_GATE_APPROVED",
    "MAINNET_SOURCE_TAG_APPROVED",
    "MAINNET_RELEASE_MODE",
    "MAINNET_OPERATIONS_MODE",
    "PAYMENTS_DATABASE_BINDING",
    "XRPL_MAINNET_SOURCE_TAG",
  ]) {
    if (typeof bindings[key] === "string") {
      input[key] = bindings[key] as string;
    }
  }
  return input;
}

export function getPaymentsDatabaseFromBindings(
  bindings: Record<string, unknown>,
  processEnvironment: Record<string, string | undefined> = process.env,
): D1DatabaseLike {
  try {
    const target = resolveDeploymentTarget(
      deploymentInput(bindings, processEnvironment),
    );
    const database = bindings[target.databaseBinding];
    if (!isD1Database(database)) {
      throw new PaymentsDatabaseUnavailableError();
    }
    return database;
  } catch (error) {
    if (error instanceof PaymentsDatabaseUnavailableError) {
      throw error;
    }
    throw new PaymentsDatabaseUnavailableError();
  }
}

export async function getPaymentsDatabase(): Promise<D1DatabaseLike> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return getPaymentsDatabaseFromBindings(
      env as unknown as Record<string, unknown>,
    );
  } catch (error) {
    if (error instanceof PaymentsDatabaseUnavailableError) {
      throw error;
    }
    throw new PaymentsDatabaseUnavailableError();
  }
}
