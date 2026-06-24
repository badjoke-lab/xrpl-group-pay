import {
  billReviewSchema,
  type BillReview,
  type CreateBillInput,
} from "./types";

export class BillReviewRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillReviewRequestError";
  }
}

export async function requestBillReview(
  input: CreateBillInput,
  fetcher: typeof fetch = fetch,
): Promise<BillReview> {
  let response: Response;
  try {
    response = await fetcher("/api/bills/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    throw new BillReviewRequestError(
      "The bill review is temporarily unavailable.",
    );
  }

  const body: unknown = await response.json().catch(() => null);
  const parsed = billReviewSchema.safeParse(body);
  if (response.status === 200 && parsed.success) return parsed.data;

  const message =
    body && typeof body === "object"
      ? (body as { error?: { message?: unknown } }).error?.message
      : undefined;
  throw new BillReviewRequestError(
    typeof message === "string"
      ? message
      : "The bill review response was invalid.",
  );
}
