import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

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

export async function getPaymentsDatabase(): Promise<D1DatabaseLike> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const database = (env as unknown as Record<string, unknown>).PAYMENTS_DB;

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
