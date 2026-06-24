import {
  paymentVerificationApiOutcomeSchema,
  type PaymentVerificationApiOutcome,
} from "./types";

export class PaymentVerificationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentVerificationRequestError";
  }
}

function unavailable(message?: unknown): PaymentVerificationApiOutcome {
  return {
    status: "pending",
    reason: "VERIFICATION_UNAVAILABLE",
    transactionId: null,
    message:
      typeof message === "string"
        ? message
        : "The validated ledger or receipt storage is temporarily unavailable. Check again.",
  };
}

function expectedHttpStatus(outcome: PaymentVerificationApiOutcome) {
  if (outcome.status === "verified") return 200;
  if (outcome.status === "pending") return 202;
  return 422;
}

export async function requestPaymentVerification(
  paymentToken: string,
  payloadId: string,
  fetcher: typeof fetch = fetch,
): Promise<PaymentVerificationApiOutcome> {
  let response: Response;
  try {
    response = await fetcher("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentToken, payloadId }),
      cache: "no-store",
    });
  } catch {
    return unavailable();
  }

  const body: unknown = await response.json().catch(() => null);
  const parsed = paymentVerificationApiOutcomeSchema.safeParse(body);
  if (parsed.success && response.status === expectedHttpStatus(parsed.data)) {
    return parsed.data;
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
