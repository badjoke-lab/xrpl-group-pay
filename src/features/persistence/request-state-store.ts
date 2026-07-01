import { z } from "zod";

import type { PaymentIntent } from "@/features/payment-intents/types";
import {
  walletHandoffStatusSchema,
  type WalletHandoff,
  type WalletHandoffStatus,
} from "@/features/wallet-providers/types";

import type { D1DatabaseLike } from "./d1-types";
import {
  ActiveRequestError,
  RequestPersistenceError,
} from "./request-state-errors";
import {
  EXPIRE_ACTIVE_REQUEST,
  MARK_SLOT_WAITING,
  SELECT_ACTIVE_REQUEST,
  SELECT_REQUEST_BY_PROVIDER_ID,
  SELECT_REQUEST_HISTORY,
  STORE_REQUEST,
  UPDATE_REQUEST_STATE,
  UPDATE_SLOT_FROM_REQUEST,
} from "./request-state-sql";

const nullableUrlSchema = z.string().url().nullable();

const activeRowSchema = z.object({
  id: z.string().min(1),
  payment_slot_id: z.string().min(1),
  request_id: z.string().min(1),
  status: walletHandoffStatusSchema,
  expires_at: z.string().datetime(),
  transaction_id: z.string().regex(/^[A-F0-9]{64}$/).nullable(),
  mobile_uri: nullableUrlSchema,
  browser_uri: nullableUrlSchema,
  qr_image_url: nullableUrlSchema,
  status_channel: nullableUrlSchema,
  provider_metadata_json: z.string().nullable(),
});

const requestRowSchema = activeRowSchema.extend({
  slot_status: z.string().min(1),
});

const requestCountSchema = z.object({
  request_count: z.number().int().nonnegative(),
});

export type ProviderRequestState = {
  providerId: "xaman";
  requestId: string;
  status: WalletHandoffStatus;
  expiresAt: string;
  transactionId: string | null;
  mobileUri?: string | null;
  browserUri?: string | null;
  qrImageUrl?: string | null;
  statusChannel?: string | null;
  providerMetadata?: Record<string, unknown>;
};

export type ResumableProviderRequest = {
  recordId: string;
  slotId: string;
  requestId: string;
  status: WalletHandoffStatus;
  expiresAt: string;
  transactionId: string | null;
  mobileUri: string | null;
  browserUri: string | null;
  qrImageUrl: string | null;
  statusChannel: string | null;
  providerMetadata: Record<string, unknown>;
};

export type ProviderLifecycleObservation = {
  status: WalletHandoffStatus;
  transactionId: string | null;
};

function parseMetadata(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function resumableRequest(
  row: z.infer<typeof activeRowSchema>,
): ResumableProviderRequest {
  return {
    recordId: row.id,
    slotId: row.payment_slot_id,
    requestId: row.request_id,
    status: row.status,
    expiresAt: row.expires_at,
    transactionId: row.transaction_id,
    mobileUri: row.mobile_uri,
    browserUri: row.browser_uri,
    qrImageUrl: row.qr_image_url,
    statusChannel: row.status_channel,
    providerMetadata: parseMetadata(row.provider_metadata_json),
  };
}

function slotStatusForHandoff(status: WalletHandoffStatus) {
  switch (status) {
    case "created":
    case "available":
    case "opened":
    case "signed":
      return "awaiting_signature";
    case "submitted":
      return "submitted";
    case "rejected":
      return "rejected";
    case "expired":
      return "expired";
    case "failed":
      return "verification_failed";
  }
}

const activeRank: Partial<Record<WalletHandoffStatus, number>> = {
  created: 0,
  available: 1,
  opened: 2,
  signed: 3,
  submitted: 4,
};

function shouldApplyLifecycleTransition(
  current: WalletHandoffStatus,
  next: WalletHandoffStatus,
  transactionId: string | null,
) {
  if (current === next) return true;

  if (next === "submitted" && transactionId) return true;
  if (current === "submitted") return false;

  const currentRank = activeRank[current];
  const nextRank = activeRank[next];
  if (currentRank !== undefined && nextRank !== undefined) {
    return nextRank >= currentRank;
  }

  if (currentRank === undefined) return false;
  return nextRank === undefined;
}

export async function loadActiveRequest(
  database: D1DatabaseLike,
  slotId: string,
  now: Date,
): Promise<ResumableProviderRequest | null> {
  const row = await database
    .prepare(SELECT_ACTIVE_REQUEST)
    .bind(slotId)
    .first();
  const parsed = activeRowSchema.safeParse(row);
  if (!parsed.success) return null;

  const request = resumableRequest(parsed.data);
  const isUnsignedActive = ["created", "available", "opened"].includes(
    request.status,
  );
  if (
    isUnsignedActive &&
    new Date(request.expiresAt).getTime() <= now.getTime()
  ) {
    const timestamp = now.toISOString();
    const results = await database.batch([
      database
        .prepare(EXPIRE_ACTIVE_REQUEST)
        .bind(timestamp, request.recordId),
      database
        .prepare(UPDATE_SLOT_FROM_REQUEST)
        .bind(
          "expired",
          timestamp,
          slotId,
          request.recordId,
          "expired",
        ),
    ]);
    if (!results[0]?.success) throw new RequestPersistenceError();
    return null;
  }

  return request;
}

export async function requireNoActiveRequest(
  database: D1DatabaseLike,
  slotId: string,
  now: Date,
) {
  if (await loadActiveRequest(database, slotId, now)) {
    throw new ActiveRequestError();
  }
}

export async function loadRequestByProviderId(
  database: D1DatabaseLike,
  requestId: string,
): Promise<(ResumableProviderRequest & { slotStatus: string }) | null> {
  const row = await database
    .prepare(SELECT_REQUEST_BY_PROVIDER_ID)
    .bind("xaman", requestId)
    .first();
  const parsed = requestRowSchema.safeParse(row);
  if (!parsed.success) return null;
  return {
    ...resumableRequest(parsed.data),
    slotStatus: parsed.data.slot_status,
  };
}

async function synchronizeProviderRequestAttempt(
  database: D1DatabaseLike,
  requestId: string,
  observation: ProviderLifecycleObservation,
  now: Date,
  attempt: number,
): Promise<ResumableProviderRequest | null> {
  const existing = await loadRequestByProviderId(database, requestId);
  if (!existing) return null;

  const transactionId = observation.transactionId?.toUpperCase() ?? null;
  if (
    !shouldApplyLifecycleTransition(
      existing.status,
      observation.status,
      transactionId,
    )
  ) {
    return existing;
  }

  const timestamp = now.toISOString();
  const results = await database.batch([
    database
      .prepare(UPDATE_REQUEST_STATE)
      .bind(
        observation.status,
        transactionId,
        timestamp,
        existing.recordId,
        existing.status,
      ),
    database
      .prepare(UPDATE_SLOT_FROM_REQUEST)
      .bind(
        slotStatusForHandoff(observation.status),
        timestamp,
        existing.slotId,
        existing.recordId,
        observation.status,
      ),
  ]);

  if (!results[0]?.success) throw new RequestPersistenceError();
  if ((results[0].meta?.changes ?? 0) !== 1) {
    if (attempt >= 1) throw new RequestPersistenceError();
    return synchronizeProviderRequestAttempt(
      database,
      requestId,
      observation,
      now,
      attempt + 1,
    );
  }

  return {
    ...existing,
    status: observation.status,
    transactionId: transactionId ?? existing.transactionId,
  };
}

export function synchronizeProviderRequest(
  database: D1DatabaseLike,
  requestId: string,
  observation: ProviderLifecycleObservation,
  now = new Date(),
): Promise<ResumableProviderRequest | null> {
  return synchronizeProviderRequestAttempt(
    database,
    requestId,
    observation,
    now,
    0,
  );
}

export async function hasPriorRequest(
  database: D1DatabaseLike,
  slotId: string,
): Promise<boolean> {
  const row = await database
    .prepare(SELECT_REQUEST_HISTORY)
    .bind(slotId)
    .first();
  const parsed = requestCountSchema.safeParse(row);
  if (!parsed.success) throw new RequestPersistenceError();
  return parsed.data.request_count > 0;
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
        intent.network,
        intent.asset.id,
        intent.asset.assetType,
        intent.asset.currency,
        intent.asset.issuer,
        state.status,
        state.expiresAt,
        state.transactionId?.toUpperCase() ?? null,
        state.mobileUri ?? null,
        state.browserUri ?? null,
        state.qrImageUrl ?? null,
        state.statusChannel ?? null,
        JSON.stringify(state.providerMetadata ?? {}),
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

export function providerRequestStateFromHandoff(
  handoff: WalletHandoff,
): ProviderRequestState {
  return {
    providerId: handoff.providerId,
    requestId: handoff.requestId,
    status: handoff.status,
    expiresAt: handoff.expiresAt,
    transactionId: handoff.transactionId,
    mobileUri: handoff.mobileUri,
    browserUri: handoff.browserUri,
    qrImageUrl: handoff.qrImageUrl,
    statusChannel: handoff.statusChannel,
    providerMetadata: handoff.providerMetadata,
  };
}
