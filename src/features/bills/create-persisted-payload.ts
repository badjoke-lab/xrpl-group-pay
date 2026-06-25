import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import {
  persistRequestState,
  requireNoActiveRequest,
} from "@/features/persistence/request-state-store";
import type { XamanPaymentPayloadRequest } from "@/features/xaman/payment-request";
import type { XamanCreatePayloadResponse } from "@/features/xaman/schemas";

import {
  createStoredSlotPayload,
  type StoredSlotPayload,
} from "./create-slot-payload";
import { loadPaymentSlotByToken } from "./payment-slot";
import { buildStoredSlotPaymentIntent } from "./slot-payment-request";

export type PersistedPayloadDependencies = {
  sourceTag: number;
  createPayload(
    request: XamanPaymentPayloadRequest,
  ): Promise<XamanCreatePayloadResponse>;
  now?: () => Date;
};

export async function createPersistedSlotPayload(
  database: D1DatabaseLike,
  capability: string,
  dependencies: PersistedPayloadDependencies,
): Promise<StoredSlotPayload> {
  const now = dependencies.now?.() ?? new Date();
  const slot = await loadPaymentSlotByToken(database, capability);

  await requireNoActiveRequest(database, slot.slotId, now);

  const intent = buildStoredSlotPaymentIntent(
    slot,
    dependencies.sourceTag,
    now,
  );
  const payload = await createStoredSlotPayload(database, capability, {
    sourceTag: dependencies.sourceTag,
    createXamanPayload: dependencies.createPayload,
    now: () => now,
  });

  await persistRequestState(
    database,
    slot.slotId,
    intent,
    {
      providerId: "xaman",
      requestId: payload.payloadId,
      status: "available",
      expiresAt: intent.expiresAt,
      transactionId: null,
    },
    now,
  );

  return payload;
}
