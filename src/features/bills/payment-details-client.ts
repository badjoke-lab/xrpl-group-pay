import {
  paymentDetailsSchema,
  type PaymentDetails,
} from "./payment-details";

export class PaymentDetailsRequestError extends Error {
  constructor(
    message: string,
    readonly code: string | null = null,
  ) {
    super(message);
    this.name = "PaymentDetailsRequestError";
  }
}

export async function requestPaymentDetails(
  paymentToken: string,
  fetcher: typeof fetch = fetch,
): Promise<PaymentDetails> {
  let response: Response;
  try {
    response = await fetcher("/api/payments/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentToken }),
      cache: "no-store",
    });
  } catch {
    throw new PaymentDetailsRequestError(
      "The frozen payment details are temporarily unavailable.",
    );
  }

  const body: unknown = await response.json().catch(() => null);
  const parsed = paymentDetailsSchema.safeParse(body);
  if (response.status === 200 && parsed.success) return parsed.data;

  const error =
    body && typeof body === "object"
      ? (body as { error?: { code?: unknown; message?: unknown } }).error
      : undefined;
  throw new PaymentDetailsRequestError(
    typeof error?.message === "string"
      ? error.message
      : "The frozen payment details response was invalid.",
    typeof error?.code === "string" ? error.code : null,
  );
}
