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
  if (payload.meta.expired) {
    return { status: "expired", txid: null };
  }

  if (payload.meta.cancelled || (payload.meta.resolved && !payload.meta.signed)) {
    return { status: "rejected", txid: null };
  }

  const txid = payload.response.txid ?? null;
  if (payload.meta.resolved && payload.meta.signed && txid) {
    return { status: "submitted", txid };
  }

  return { status: "waiting", txid: null };
}
