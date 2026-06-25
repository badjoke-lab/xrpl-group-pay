import { z } from "zod";

import type { PaymentIntent } from "@/features/payment-intents/types";

import type { D1DatabaseLike } from "./d1-types";
import {
  ActiveRequestError,
  RequestPersistenceError,
} from "./request-state-errors";
import {
  EXPIRE_ACTIVE_REQUEST,
  MARK_SLOT_WAITING,
  SELECT_ACTIVE_REQUEST,
  STORE_REQUEST,
} from "./request-state-sql";

const activeRowSchema = z.object({
  id: z.string().min(1),
  expires_at: z.string().datetime(),
});

export type ProviderRequestState = {
  providerId: "xaman";
  requestId: string;
  status:
    | "created"
    | "available"
    | "opened"
    | "rejected"
    | "expired"
    | "signed"
    | "submitted"
    | "failed";
  expiresAt: string;
  transactionId: string | null;
};

export async function requireNoActiveRequest(
  database: D1DatabaseLike,
  slotId: string,
  now: Date,
) {
  const row = await database
    .prepare(SELECT_ACTIVE_REQUEST)
    .bind(slotId)
    .first();
  const parsed = activeRowSchema.safeParse(row);
  if (!parsed.success) return;

  if (new Date(parsed.data.expires_at).getTime() <= now.getTime()) {
    await database
      .prepare(EXPIRE_ACTIVE_REQUEST)
      .bind(now.toISOString(), parsed.data.id)
      .run();
    return;
  }

  throw new ActiveRequestError();
}

export async function persistRequestState(
  database: D1DatabaseLike,
  slotId: string,
  intent: PaymentIntent,
  state: ProviderRequestState,
  now: Date,
  id = crypto.randomUUID(),
) {
  const statements = [
    database
      .prepare(STORE_REQUEST)
      .bind(
        id,
        slotId,
        state.providerId,
        state.requestId,
        intent.intentId,
        intent.revision,
        state.status,
        state.expiresAt,
        state.transactionId?.toUpperCase() ?? null,
        now.toISOString(),
      ),
    database.prepare(MARK_SLOT_WAITING).bind(now.toISOString(), slotId),
  ];

  try {
    const results = await database.batch(statements);
    if (
      results.length !== statements.length ||
      results.some((result) => !result.success) ||
      (results[1].meta?.changes ?? 0) !== 1
    ) {
      throw new RequestPersistenceError();
    }
  } catch (error) {
    if (error instanceof RequestPersistenceError) throw error;
    throw new RequestPersistenceError();
  }
}
