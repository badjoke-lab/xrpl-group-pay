import type { WalletHandoffStatus } from "@/features/wallet-providers/types";

import type { XamanPayloadResponse } from "./schemas";

export type PaymentHandoffStatus =
  | "waiting"
  | "submitted"
  | "rejected"
  | "expired";

export type XamanLifecycleObservation = {
  status: WalletHandoffStatus;
  transactionId: string | null;
};

export function normalizeXamanLifecycle(
  payload: XamanPayloadResponse,
): XamanLifecycleObservation {
  const transactionId = payload.response.txid?.toUpperCase() ?? null;

  // Xaman allows a payload opened before expiry to resolve after its nominal
  // expiry time. A signed, resolved payload with a txid must therefore win.
  if (payload.meta.resolved && payload.meta.signed && transactionId) {
    return { status: "submitted", transactionId };
  }

  if (payload.meta.cancelled || (payload.meta.resolved && !payload.meta.signed)) {
    return { status: "rejected", transactionId: null };
  }

  if (payload.meta.expired) {
    return { status: "expired", transactionId: null };
  }

  if (payload.meta.signed) {
    return { status: "signed", transactionId };
  }

  if (payload.meta.opened_by_deeplink) {
    return { status: "opened", transactionId: null };
  }

  return { status: "available", transactionId: null };
}

export function normalizeXamanStatus(payload: XamanPayloadResponse): {
  status: PaymentHandoffStatus;
  txid: string | null;
} {
  const lifecycle = normalizeXamanLifecycle(payload);
  if (lifecycle.status === "submitted") {
    return { status: "submitted", txid: lifecycle.transactionId };
  }
  if (lifecycle.status === "rejected") {
    return { status: "rejected", txid: null };
  }
  if (lifecycle.status === "expired") {
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
      event.opened === true ||
      typeof event.signed === "boolean" ||
      typeof event.payload_uuidv4 === "string"
    );
  } catch {
    return false;
  }
}
