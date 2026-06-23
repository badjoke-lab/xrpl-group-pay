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

function unavailable(message?: unknown): PaymentVerificationOutcome {
  return {
    status: "pending",
    reason: "VERIFICATION_UNAVAILABLE",
    transactionId: null,
    message:
      typeof message === "string"
        ? message
        : "The validated ledger is temporarily unavailable. Check again.",
  };
}

export async function requestPaymentVerification(
  payloadId: string,
  fetcher: typeof fetch = fetch,
): Promise<PaymentVerificationOutcome> {
  let response: Response;
  try {
    response = await fetcher("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payloadId }),
      cache: "no-store",
    });
  } catch {
    return unavailable();
  }

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

  if (response.status >= 500) {
    return unavailable(message);
  }

  throw new PaymentVerificationRequestError(
    typeof message === "string"
      ? message
      : "The verification response was invalid.",
  );
}
