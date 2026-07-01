import { z } from "zod";

import {
  createCapabilityToken,
  hashCapabilityToken,
} from "@/features/bills/capabilities";
import type { XrplNetwork } from "@/features/assets/types";
import type { D1DatabaseLike } from "@/features/persistence/d1-types";

export const rlusdTrustSetStatusSchema = z.enum([
  "not_required",
  "required",
  "handoff_created",
  "awaiting_signature",
  "rejected",
  "expired",
  "submitted",
  "verifying",
  "ready",
  "failed",
]);

export type RlusdTrustSetStatus = z.infer<typeof rlusdTrustSetStatusSchema>;
export type RlusdTrustSetPurpose = "recipient" | "payer";

const rowSchema = z.object({
  id: z.string().min(1),
  public_id: z.string().uuid(),
  network: z.enum(["testnet", "mainnet"]),
  purpose: z.enum(["recipient", "payer"]),
  account_address: z.string().min(1),
  asset_id: z.string().min(1),
  currency_code: z.string().min(1),
  issuer: z.string().min(1),
  required_amount_units: z.string().regex(/^[1-9]\d*$/),
  amount_scale: z.number().int().min(0).max(18),
  trust_limit_units: z.string().regex(/^[1-9]\d*$/),
  trust_limit_value: z.string().min(1),
  status: rlusdTrustSetStatusSchema,
  xaman_payload_id: z.string().uuid().nullable(),
  mobile_uri: z.string().url().nullable(),
  browser_uri: z.string().url().nullable(),
  qr_image_url: z.string().url().nullable(),
  status_channel: z.string().url().nullable(),
  expires_at: z.string().datetime().nullable(),
  transaction_id: z.string().regex(/^[A-F0-9]{64}$/).nullable(),
  failure_code: z.string().max(100).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  verified_at: z.string().datetime().nullable(),
});

export type RlusdTrustSetPreparation = {
  id: string;
  publicId: string;
  network: XrplNetwork;
  purpose: RlusdTrustSetPurpose;
  account: string;
  assetId: string;
  currency: string;
  issuer: string;
  requiredAmountUnits: string;
  amountScale: number;
  trustLimitUnits: string;
  trustLimitValue: string;
  status: RlusdTrustSetStatus;
  payloadId: string | null;
  mobileUri: string | null;
  browserUri: string | null;
  qrImageUrl: string | null;
  statusChannel: string | null;
  expiresAt: string | null;
  transactionId: string | null;
  failureCode: string | null;
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
};

export class RlusdTrustSetStoreError extends Error {
  constructor(message = "The RLUSD preparation state could not be stored.") {
    super(message);
    this.name = "RlusdTrustSetStoreError";
  }
}

export class RlusdTrustSetNotFoundError extends Error {
  constructor() {
    super("The RLUSD preparation link is invalid or unavailable.");
    this.name = "RlusdTrustSetNotFoundError";
  }
}

function normalizeRow(row: unknown): RlusdTrustSetPreparation {
  const parsed = rowSchema.safeParse(row);
  if (!parsed.success) throw new RlusdTrustSetStoreError();
  const value = parsed.data;
  return {
    id: value.id,
    publicId: value.public_id,
    network: value.network,
    purpose: value.purpose,
    account: value.account_address,
    assetId: value.asset_id,
    currency: value.currency_code,
    issuer: value.issuer,
    requiredAmountUnits: value.required_amount_units,
    amountScale: value.amount_scale,
    trustLimitUnits: value.trust_limit_units,
    trustLimitValue: value.trust_limit_value,
    status: value.status,
    payloadId: value.xaman_payload_id,
    mobileUri: value.mobile_uri,
    browserUri: value.browser_uri,
    qrImageUrl: value.qr_image_url,
    statusChannel: value.status_channel,
    expiresAt: value.expires_at,
    transactionId: value.transaction_id,
    failureCode: value.failure_code,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
    verifiedAt: value.verified_at,
  };
}

const SELECT_FIELDS = [
  "id, public_id, network, purpose, account_address, asset_id,",
  "currency_code, issuer, required_amount_units, amount_scale,",
  "trust_limit_units, trust_limit_value, status, xaman_payload_id,",
  "mobile_uri, browser_uri, qr_image_url, status_channel, expires_at,",
  "transaction_id, failure_code, created_at, updated_at, verified_at",
].join(" ");

const INSERT_PREPARATION = `
  INSERT INTO rlusd_trustset_preparations (
    id, public_id, capability_hash, network, purpose, account_address,
    asset_id, currency_code, issuer, required_amount_units, amount_scale,
    trust_limit_units, trust_limit_value, status, created_at, updated_at
  ) VALUES (
    ?1, ?2, ?3, ?4, ?5, ?6,
    ?7, ?8, ?9, ?10, ?11,
    ?12, ?13, ?14, ?15, ?15
  )
`;

const SELECT_BY_CAPABILITY = `
  SELECT ${SELECT_FIELDS}
  FROM rlusd_trustset_preparations
  WHERE capability_hash = ?1
  LIMIT 1
`;

const SELECT_BY_PAYLOAD = `
  SELECT ${SELECT_FIELDS}
  FROM rlusd_trustset_preparations
  WHERE xaman_payload_id = ?1
  LIMIT 1
`;

const STORE_HANDOFF = `
  UPDATE rlusd_trustset_preparations
  SET status = 'awaiting_signature',
      xaman_payload_id = ?1,
      mobile_uri = ?2,
      browser_uri = ?3,
      qr_image_url = ?4,
      status_channel = ?5,
      expires_at = ?6,
      failure_code = NULL,
      updated_at = ?7
  WHERE id = ?8
    AND status IN ('required', 'rejected', 'expired', 'failed')
`;

const UPDATE_STATUS = `
  UPDATE rlusd_trustset_preparations
  SET status = ?1,
      transaction_id = COALESCE(?2, transaction_id),
      failure_code = ?3,
      updated_at = ?4,
      verified_at = CASE WHEN ?1 = 'ready' THEN ?4 ELSE verified_at END
  WHERE id = ?5
    AND status = ?6
`;

export async function createRlusdTrustSetPreparation(
  database: D1DatabaseLike,
  input: {
    network: XrplNetwork;
    purpose: RlusdTrustSetPurpose;
    account: string;
    assetId: string;
    currency: string;
    issuer: string;
    requiredAmountUnits: string;
    amountScale: number;
    trustLimitUnits: string;
    trustLimitValue: string;
    status: "not_required" | "required";
  },
  options: {
    now?: Date;
    id?: string;
    publicId?: string;
    capabilityToken?: string;
  } = {},
) {
  const now = (options.now ?? new Date()).toISOString();
  const id = options.id ?? crypto.randomUUID();
  const publicId = options.publicId ?? crypto.randomUUID();
  const capabilityToken = options.capabilityToken ?? createCapabilityToken();
  const capabilityHash = await hashCapabilityToken(capabilityToken);

  try {
    const result = await database
      .prepare(INSERT_PREPARATION)
      .bind(
        id,
        publicId,
        capabilityHash,
        input.network,
        input.purpose,
        input.account,
        input.assetId,
        input.currency,
        input.issuer,
        input.requiredAmountUnits,
        input.amountScale,
        input.trustLimitUnits,
        input.trustLimitValue,
        input.status,
        now,
      )
      .run();
    if (!result.success || (result.meta?.changes ?? 0) !== 1) {
      throw new RlusdTrustSetStoreError();
    }
  } catch (error) {
    if (error instanceof RlusdTrustSetStoreError) throw error;
    throw new RlusdTrustSetStoreError();
  }

  return { publicId, capabilityToken };
}

export async function loadRlusdTrustSetPreparationByToken(
  database: D1DatabaseLike,
  token: string,
) {
  let hash: string;
  try {
    hash = await hashCapabilityToken(token);
  } catch {
    throw new RlusdTrustSetNotFoundError();
  }
  const row = await database.prepare(SELECT_BY_CAPABILITY).bind(hash).first();
  if (!row) throw new RlusdTrustSetNotFoundError();
  return normalizeRow(row);
}

export async function loadRlusdTrustSetPreparationByPayload(
  database: D1DatabaseLike,
  payloadId: string,
) {
  const row = await database.prepare(SELECT_BY_PAYLOAD).bind(payloadId).first();
  if (!row) throw new RlusdTrustSetNotFoundError();
  return normalizeRow(row);
}

export async function storeRlusdTrustSetHandoff(
  database: D1DatabaseLike,
  preparation: RlusdTrustSetPreparation,
  handoff: {
    payloadId: string;
    mobileUri: string | null;
    browserUri: string | null;
    qrImageUrl: string;
    statusChannel: string;
    expiresAt: string;
  },
  now = new Date(),
) {
  const result = await database
    .prepare(STORE_HANDOFF)
    .bind(
      handoff.payloadId,
      handoff.mobileUri,
      handoff.browserUri,
      handoff.qrImageUrl,
      handoff.statusChannel,
      handoff.expiresAt,
      now.toISOString(),
      preparation.id,
    )
    .run();
  if (!result.success || (result.meta?.changes ?? 0) !== 1) {
    throw new RlusdTrustSetStoreError();
  }
}

const rank: Record<RlusdTrustSetStatus, number> = {
  not_required: 9,
  required: 0,
  handoff_created: 1,
  awaiting_signature: 2,
  rejected: 3,
  expired: 3,
  submitted: 4,
  verifying: 5,
  ready: 9,
  failed: 3,
};

function canTransition(
  current: RlusdTrustSetStatus,
  next: RlusdTrustSetStatus,
) {
  if (current === next) return true;
  if (current === "ready" || current === "not_required") return false;
  if (next === "submitted" || next === "verifying" || next === "ready") {
    return rank[next] >= rank[current];
  }
  if (["rejected", "expired", "failed"].includes(current)) {
    return next === "awaiting_signature";
  }
  return rank[next] >= rank[current];
}

export async function updateRlusdTrustSetStatus(
  database: D1DatabaseLike,
  preparation: RlusdTrustSetPreparation,
  next: RlusdTrustSetStatus,
  options: {
    transactionId?: string | null;
    failureCode?: string | null;
    now?: Date;
  } = {},
) {
  if (!canTransition(preparation.status, next)) return preparation;
  const timestamp = (options.now ?? new Date()).toISOString();
  const transactionId = options.transactionId?.toUpperCase() ?? null;
  const result = await database
    .prepare(UPDATE_STATUS)
    .bind(
      next,
      transactionId,
      options.failureCode ?? null,
      timestamp,
      preparation.id,
      preparation.status,
    )
    .run();

  if (!result.success) throw new RlusdTrustSetStoreError();
  if ((result.meta?.changes ?? 0) !== 1) {
    if (!preparation.payloadId) throw new RlusdTrustSetStoreError();
    return loadRlusdTrustSetPreparationByPayload(
      database,
      preparation.payloadId,
    );
  }

  return {
    ...preparation,
    status: next,
    transactionId: transactionId ?? preparation.transactionId,
    failureCode: options.failureCode ?? null,
    updatedAt: timestamp,
    verifiedAt: next === "ready" ? timestamp : preparation.verifiedAt,
  };
}
