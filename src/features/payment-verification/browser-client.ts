import type { PaymentVerificationOutcome } from "./types";

export class PaymentVerificationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentVerificationRequestError";
  }
}

function isOutcome(value: unknown): value is PaymentVerificationOutcome {
  if (!value || typeof value !== "object") {
    return false;
  }

  const status = (value as Record<string, unknown>).status;
  return status === "verified" || status === "pending" || status === "failed";
}

export async function requestPaymentVerification(
  payloadId: string,
  fetcher: typeof fetch = fetch,
): Promise<PaymentVerificationOutcome> {
  const response = await fetcher("/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payloadId }),
    cache: "no-store",
  });

  const body: unknown = await response.json().catch(() => null);
  if (
    (response.status === 200 ||
      response.status === 202 ||
      response.status === 422) &&
    isOutcome(body)
  ) {
    return body;
  }

  const message =
    body && typeof body === "object"
      ? (body as { error?: { message?: unknown } }).error?.message
      : undefined;

  throw new PaymentVerificationRequestError(
    typeof message === "string"
      ? message
      : "The validated ledger could not be checked.",
  );
}
