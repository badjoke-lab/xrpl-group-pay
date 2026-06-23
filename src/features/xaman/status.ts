import type { XamanPayloadResponse } from "./schemas";

export type PaymentHandoffStatus =
  | "waiting"
  | "submitted"
  | "rejected"
  | "expired";

export function normalizeXamanStatus(payload: XamanPayloadResponse): {
  status: PaymentHandoffStatus;
  txid: string | null;
} {
  const txid = payload.response.txid ?? null;

  // Xaman allows a payload opened before expiry to resolve after its nominal
  // expiry time. A signed, resolved payload with a txid must therefore win
  // over the expired flag.
  if (payload.meta.resolved && payload.meta.signed && txid) {
    return { status: "submitted", txid };
  }

  if (payload.meta.cancelled || (payload.meta.resolved && !payload.meta.signed)) {
    return { status: "rejected", txid: null };
  }

  if (payload.meta.expired) {
    return { status: "expired", txid: null };
  }

  return { status: "waiting", txid: null };
}

export function shouldRefreshFromXamanWebsocket(message: unknown): boolean {
  if (typeof message !== "string") {
    return false;
  }

  try {
    const parsed: unknown = JSON.parse(message);
    if (!parsed || typeof parsed !== "object") {
      return false;
    }

    const event = parsed as Record<string, unknown>;
    return (
      event.expired === true ||
      typeof event.signed === "boolean" ||
      typeof event.payload_uuidv4 === "string"
    );
  } catch {
    return false;
  }
}
