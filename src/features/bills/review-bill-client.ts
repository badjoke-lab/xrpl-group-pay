import { getXrpAssetDescriptor } from "@/features/assets/registry";

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

function normalizeReviewBody(body: unknown) {
  if (!body || typeof body !== "object") return body;
  const record = body as Record<string, unknown>;
  if ("asset" in record) return body;
  if (
    record.network !== "testnet" ||
    typeof record.totalDrops !== "string" ||
    typeof record.creatorShareDrops !== "string" ||
    typeof record.allocatedDrops !== "string" ||
    !Array.isArray(record.participants)
  ) {
    return body;
  }

  const asset = getXrpAssetDescriptor("testnet");
  return {
    ...record,
    asset,
    totalAmount: { code: "XRP", units: record.totalDrops, scale: 6 },
    creatorShareAmount: {
      code: "XRP",
      units: record.creatorShareDrops,
      scale: 6,
    },
    allocatedAmount: {
      code: "XRP",
      units: record.allocatedDrops,
      scale: 6,
    },
    participants: record.participants.map((participant) => {
      if (!participant || typeof participant !== "object") return participant;
      const item = participant as Record<string, unknown>;
      return typeof item.expectedAmountDrops === "string"
        ? {
            ...item,
            expectedAmount: {
              code: "XRP",
              units: item.expectedAmountDrops,
              scale: 6,
            },
          }
        : participant;
    }),
  };
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
  const parsed = billReviewSchema.safeParse(normalizeReviewBody(body));
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
