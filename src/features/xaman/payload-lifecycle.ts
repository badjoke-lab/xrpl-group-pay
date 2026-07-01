import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import {
  loadRequestByProviderId,
  synchronizeProviderRequest,
} from "@/features/persistence/request-state-store";

import type { XamanPayloadResponse } from "./schemas";
import {
  normalizeXamanLifecycle,
  normalizeXamanStatus,
} from "./status";

export class UnknownXamanPayloadError extends Error {
  constructor() {
    super("The Xaman payload is unavailable.");
    this.name = "UnknownXamanPayloadError";
  }
}

export async function synchronizeXamanPayload(
  database: D1DatabaseLike,
  payloadId: string,
  getPayload: (payloadId: string) => Promise<XamanPayloadResponse>,
  now = new Date(),
) {
  const existing = await loadRequestByProviderId(database, payloadId);
  if (!existing) throw new UnknownXamanPayloadError();

  const payload = await getPayload(payloadId);
  const lifecycle = normalizeXamanLifecycle(payload);
  const persisted = await synchronizeProviderRequest(
    database,
    payloadId,
    {
      status: lifecycle.status,
      transactionId: lifecycle.transactionId,
    },
    now,
  );
  if (!persisted) throw new UnknownXamanPayloadError();

  return {
    payload,
    lifecycle,
    publicStatus: normalizeXamanStatus(payload),
    persisted,
  };
}
