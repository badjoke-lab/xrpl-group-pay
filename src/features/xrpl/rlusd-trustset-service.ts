import type { MainnetAssetAccess } from "@/features/assets/mainnet-registry";
import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import type { XamanPaymentPayloadRequest } from "@/features/xaman/payment-request";
import type {
  XamanCreatePayloadResponse,
  XamanPayloadResponse,
} from "@/features/xaman/schemas";
import { normalizeXamanLifecycle } from "@/features/xaman/status";

import type {
  XrplReadinessClient,
  XrplTrustLine,
} from "./account-read-client";
import {
  buildRlusdTrustSetIntent,
  TRUSTSET_SET_NO_RIPPLE_FLAG,
} from "./rlusd-trustset";
import {
  loadRlusdTrustSetPreparationByPayload,
  loadRlusdTrustSetPreparationByToken,
  RlusdTrustSetNotFoundError,
  type RlusdTrustSetPreparation,
  storeRlusdTrustSetHandoff,
  updateRlusdTrustSetStatus,
} from "./rlusd-trustset-store";
import type { XrplSigningState } from "./one-shot-payment";

export type RlusdTrustSetLaunch = {
  publicId: string;
  status: RlusdTrustSetPreparation["status"];
  providerStatus: RlusdTrustSetPreparation["providerStatus"];
  network: RlusdTrustSetPreparation["network"];
  purpose: RlusdTrustSetPreparation["purpose"];
  account: string;
  assetId: string;
  currency: string;
  issuer: string;
  requiredAmountUnits: string;
  amountScale: number;
  trustLimitUnits: string;
  trustLimitValue: string;
  payloadId: string | null;
  deepLink: string | null;
  qrImageUrl: string | null;
  statusChannel: string | null;
  expiresAt: string | null;
  transactionId: string | null;
  failureCode: string | null;
};

export type RlusdTrustSetServiceDependencies = {
  mainnetAccess?: MainnetAssetAccess;
  reader: XrplReadinessClient;
  getSigningState(account: string): Promise<XrplSigningState>;
  createPayload(request: XamanPaymentPayloadRequest): Promise<XamanCreatePayloadResponse>;
  getPayload(payloadId: string): Promise<XamanPayloadResponse>;
  now?: () => Date;
};

export class RlusdTrustSetServiceError extends Error {
  constructor(
    readonly code:
      | "PREPARATION_ALREADY_READY"
      | "PREPARATION_NOT_REQUIRED"
      | "PROVIDER_RESPONSE_INVALID"
      | "PROVIDER_PAYLOAD_MISMATCH"
      | "TRUST_LINE_BLOCKED",
    message: string,
  ) {
    super(message);
    this.name = "RlusdTrustSetServiceError";
  }
}

function publicLaunch(
  preparation: RlusdTrustSetPreparation,
): RlusdTrustSetLaunch {
  return {
    publicId: preparation.publicId,
    status: preparation.status,
    providerStatus: preparation.providerStatus,
    network: preparation.network,
    purpose: preparation.purpose,
    account: preparation.account,
    assetId: preparation.assetId,
    currency: preparation.currency,
    issuer: preparation.issuer,
    requiredAmountUnits: preparation.requiredAmountUnits,
    amountScale: preparation.amountScale,
    trustLimitUnits: preparation.trustLimitUnits,
    trustLimitValue: preparation.trustLimitValue,
    payloadId: preparation.payloadId,
    deepLink: preparation.mobileUri ?? preparation.browserUri,
    qrImageUrl: preparation.qrImageUrl,
    statusChannel: preparation.statusChannel,
    expiresAt: preparation.expiresAt,
    transactionId: preparation.transactionId,
    failureCode: preparation.failureCode,
  };
}

export async function loadRlusdTrustSetLaunch(
  database: D1DatabaseLike,
  token: string,
) {
  return publicLaunch(
    await loadRlusdTrustSetPreparationByToken(database, token),
  );
}

function requireCreateResponse(response: XamanCreatePayloadResponse) {
  const deepLink = response.next.always;
  const qrImageUrl = response.refs.qr_png;
  const statusChannel = response.refs.websocket_status;
  if (!deepLink || !qrImageUrl || !statusChannel) {
    throw new RlusdTrustSetServiceError(
      "PROVIDER_RESPONSE_INVALID",
      "Xaman returned an incomplete TrustSet handoff.",
    );
  }
  return {
    payloadId: response.uuid,
    mobileUri: deepLink,
    browserUri: deepLink,
    qrImageUrl,
    statusChannel,
  };
}

function resumable(preparation: RlusdTrustSetPreparation) {
  return (
    ["awaiting_signature", "submitted", "verifying"].includes(
      preparation.status,
    ) &&
    preparation.payloadId !== null &&
    (preparation.mobileUri !== null || preparation.browserUri !== null) &&
    preparation.qrImageUrl !== null &&
    preparation.statusChannel !== null
  );
}

type Decimal = { coefficient: bigint; scale: number };

function parseDecimal(value: string): Decimal {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(value);
  if (!match) {
    throw new RlusdTrustSetServiceError(
      "TRUST_LINE_BLOCKED",
      "XRPL returned an invalid trust-line decimal.",
    );
  }
  const fraction = match[3] ?? "";
  const exponent = Number(match[4] ?? "0");
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 100) {
    throw new RlusdTrustSetServiceError(
      "TRUST_LINE_BLOCKED",
      "XRPL returned an unsupported trust-line decimal.",
    );
  }
  const digits = `${match[2]}${fraction}`.replace(/^0+(?=\d)/, "");
  if (digits.length > 64) {
    throw new RlusdTrustSetServiceError(
      "TRUST_LINE_BLOCKED",
      "XRPL returned an oversized trust-line decimal.",
    );
  }
  return {
    coefficient: (match[1] === "-" ? -1n : 1n) * BigInt(digits || "0"),
    scale: fraction.length - exponent,
  };
}

function decimalToUnits(value: string, scale: number) {
  const parsed = parseDecimal(value);
  const power = scale - parsed.scale;
  if (power < 0) {
    const divisor = 10n ** BigInt(-power);
    if (parsed.coefficient % divisor !== 0n) {
      throw new RlusdTrustSetServiceError(
        "TRUST_LINE_BLOCKED",
        "XRPL trust-line precision is unsupported.",
      );
    }
    return parsed.coefficient / divisor;
  }
  if (power > 200) {
    throw new RlusdTrustSetServiceError(
      "TRUST_LINE_BLOCKED",
      "XRPL trust-line scale is unsupported.",
    );
  }
  return parsed.coefficient * 10n ** BigInt(power);
}

function matchingLine(
  lines: XrplTrustLine[],
  preparation: RlusdTrustSetPreparation,
) {
  return lines.find(
    (line) =>
      line.account === preparation.issuer &&
      line.currency === preparation.currency,
  );
}

async function verifyTrustLine(
  preparation: RlusdTrustSetPreparation,
  reader: XrplReadinessClient,
) {
  const [issuer, lines] = await Promise.all([
    reader.getAccountInfo(preparation.issuer),
    reader.getTrustLines(preparation.account, preparation.issuer),
  ]);
  if (!issuer) return { status: "blocked", code: "issuer_not_found" } as const;
  if (issuer.flags.globalFreeze) {
    return { status: "blocked", code: "issuer_global_freeze" } as const;
  }

  const line = matchingLine(lines, preparation);
  if (!line) return { status: "pending" } as const;
  if (
    line.freeze ||
    line.freeze_peer ||
    line.deep_freeze ||
    line.deep_freeze_peer
  ) {
    return { status: "blocked", code: "trust_line_frozen" } as const;
  }
  if (issuer.flags.requireAuthorization && !line.peer_authorized) {
    return { status: "blocked", code: "trust_line_not_authorized" } as const;
  }

  const limitUnits = decimalToUnits(line.limit, preparation.amountScale);
  if (limitUnits < BigInt(preparation.trustLimitUnits)) {
    return { status: "pending" } as const;
  }
  return { status: "ready" } as const;
}

function assertPayloadMatchesPreparation(
  payload: XamanPayloadResponse,
  preparation: RlusdTrustSetPreparation,
) {
  const request = payload.payload?.request_json;
  if (!request) {
    throw new RlusdTrustSetServiceError(
      "PROVIDER_PAYLOAD_MISMATCH",
      "Xaman did not return the TrustSet transaction template.",
    );
  }
  const limit = request.LimitAmount;
  if (!limit || typeof limit !== "object" || Array.isArray(limit)) {
    throw new RlusdTrustSetServiceError(
      "PROVIDER_PAYLOAD_MISMATCH",
      "The Xaman payload does not contain the expected RLUSD trust limit.",
    );
  }
  const amount = limit as Record<string, unknown>;
  const flags = request.Flags;
  const hasNoRipple =
    typeof flags === "number" &&
    (flags & TRUSTSET_SET_NO_RIPPLE_FLAG) === TRUSTSET_SET_NO_RIPPLE_FLAG;
  if (
    payload.payload?.tx_type !== "TrustSet" ||
    request.TransactionType !== "TrustSet" ||
    request.Account !== preparation.account ||
    amount.currency !== preparation.currency ||
    amount.issuer !== preparation.issuer ||
    amount.value !== preparation.trustLimitValue ||
    !hasNoRipple
  ) {
    throw new RlusdTrustSetServiceError(
      "PROVIDER_PAYLOAD_MISMATCH",
      "The Xaman payload does not match the frozen RLUSD TrustSet preparation.",
    );
  }
}

export async function synchronizeRlusdTrustSetPayload(
  database: D1DatabaseLike,
  payloadId: string,
  dependencies: Pick<
    RlusdTrustSetServiceDependencies,
    "reader" | "getPayload" | "now"
  >,
) {
  const now = dependencies.now?.() ?? new Date();
  let preparation = await loadRlusdTrustSetPreparationByPayload(
    database,
    payloadId,
  );
  const payload = await dependencies.getPayload(payloadId);

  try {
    assertPayloadMatchesPreparation(payload, preparation);
  } catch (error) {
    if (error instanceof RlusdTrustSetServiceError) {
      preparation = await updateRlusdTrustSetStatus(
        database,
        preparation,
        "failed",
        {
          providerStatus: "failed",
          failureCode: error.code,
          now,
        },
      );
    }
    throw error;
  }

  const lifecycle = normalizeXamanLifecycle(payload);
  if (["available", "opened", "signed", "created"].includes(lifecycle.status)) {
    preparation = await updateRlusdTrustSetStatus(
      database,
      preparation,
      "awaiting_signature",
      { providerStatus: lifecycle.status, now },
    );
    return publicLaunch(preparation);
  }
  if (lifecycle.status === "rejected" || lifecycle.status === "expired") {
    preparation = await updateRlusdTrustSetStatus(
      database,
      preparation,
      lifecycle.status,
      { providerStatus: lifecycle.status, now },
    );
    return publicLaunch(preparation);
  }
  if (lifecycle.status !== "submitted" || !lifecycle.transactionId) {
    preparation = await updateRlusdTrustSetStatus(
      database,
      preparation,
      "failed",
      {
        providerStatus: "failed",
        failureCode: "PROVIDER_RESPONSE_INVALID",
        now,
      },
    );
    return publicLaunch(preparation);
  }

  preparation = await updateRlusdTrustSetStatus(
    database,
    preparation,
    "submitted",
    {
      providerStatus: "submitted",
      transactionId: lifecycle.transactionId,
      now,
    },
  );

  try {
    const verification = await verifyTrustLine(preparation, dependencies.reader);
    if (verification.status === "ready") {
      preparation = await updateRlusdTrustSetStatus(
        database,
        preparation,
        "ready",
        { now },
      );
    } else if (verification.status === "blocked") {
      preparation = await updateRlusdTrustSetStatus(
        database,
        preparation,
        "failed",
        { failureCode: verification.code, now },
      );
    } else {
      preparation = await updateRlusdTrustSetStatus(
        database,
        preparation,
        "verifying",
        { now },
      );
    }
  } catch {
    preparation = await updateRlusdTrustSetStatus(
      database,
      preparation,
      "verifying",
      { now },
    );
  }

  return publicLaunch(preparation);
}

export async function createOrResumeRlusdTrustSetHandoff(
  database: D1DatabaseLike,
  token: string,
  dependencies: RlusdTrustSetServiceDependencies,
) {
  let preparation = await loadRlusdTrustSetPreparationByToken(database, token);
  if (preparation.status === "not_required") return publicLaunch(preparation);
  if (preparation.status === "ready") return publicLaunch(preparation);

  if (resumable(preparation) && preparation.payloadId) {
    try {
      return await synchronizeRlusdTrustSetPayload(
        database,
        preparation.payloadId,
        dependencies,
      );
    } catch (error) {
      if (
        error instanceof RlusdTrustSetNotFoundError ||
        error instanceof RlusdTrustSetServiceError
      ) {
        throw error;
      }
      return publicLaunch(preparation);
    }
  }

  const asset = getRlusdAssetDescriptor(preparation.network);
  if (
    asset.id !== preparation.assetId ||
    asset.currency !== preparation.currency ||
    asset.issuer !== preparation.issuer ||
    asset.precision !== preparation.amountScale
  ) {
    throw new RlusdTrustSetServiceError(
      "PROVIDER_PAYLOAD_MISMATCH",
      "The stored RLUSD preparation no longer matches the canonical Asset registry.",
    );
  }

  const signingState = await dependencies.getSigningState(preparation.account);
  const intent = buildRlusdTrustSetIntent({
    preparationId: preparation.publicId,
    network: preparation.network,
    account: preparation.account,
    requiredAmountUnits: preparation.requiredAmountUnits,
    limitUnits: preparation.trustLimitUnits,
    signingState,
    mainnetAccess: dependencies.mainnetAccess,
  });
  const response = await dependencies.createPayload(
    intent.payload as unknown as XamanPaymentPayloadRequest,
  );
  const handoff = requireCreateResponse(response);
  await storeRlusdTrustSetHandoff(
    database,
    preparation,
    {
      ...handoff,
      expiresAt: new Date(
        (dependencies.now?.() ?? new Date()).getTime() + 5 * 60_000,
      ).toISOString(),
    },
    dependencies.now?.() ?? new Date(),
  );

  preparation = await loadRlusdTrustSetPreparationByPayload(
    database,
    handoff.payloadId,
  );
  return publicLaunch(preparation);
}
