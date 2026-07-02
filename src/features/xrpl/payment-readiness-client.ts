import type { PaymentReadinessResponse } from "@/app/api/payments/readiness/route";

export class PaymentReadinessRequestError extends Error {
  constructor(
    readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = "PaymentReadinessRequestError";
  }
}

export async function requestPaymentReadiness(paymentToken: string) {
  const response = await fetch("/api/payments/readiness", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentToken }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok && !body?.payer && !body?.recipient) {
    throw new PaymentReadinessRequestError(
      body?.error?.code ?? null,
      body?.error?.message ?? "Payment readiness could not be checked.",
    );
  }
  return body as PaymentReadinessResponse;
}
