import { getXrpAssetDescriptor } from "@/features/assets/registry";

import { billProgressSchema, type BillProgress } from "./progress";

export class BillProgressRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillProgressRequestError";
  }
}

function normalizeProgressBody(body: unknown) {
  if (!body || typeof body !== "object") return body;
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.slots)) return body;

  const bill =
    record.bill && typeof record.bill === "object"
      ? (record.bill as Record<string, unknown>)
      : null;
  const summary =
    record.summary && typeof record.summary === "object"
      ? (record.summary as Record<string, unknown>)
      : null;
  const asset = getXrpAssetDescriptor("testnet");

  return {
    ...record,
    bill:
      bill &&
      !("asset" in bill) &&
      typeof bill.totalDrops === "string" &&
      typeof bill.creatorShareDrops === "string"
        ? {
            ...bill,
            asset,
            totalAmount: { code: "XRP", units: bill.totalDrops, scale: 6 },
            creatorShareAmount: {
              code: "XRP",
              units: bill.creatorShareDrops,
              scale: 6,
            },
          }
        : record.bill,
    summary:
      summary &&
      !("paidAmount" in summary) &&
      typeof summary.expectedExternalDrops === "string" &&
      typeof summary.paidDrops === "string"
        ? {
            ...summary,
            expectedExternalAmount: {
              code: "XRP",
              units: summary.expectedExternalDrops,
              scale: 6,
            },
            paidAmount: {
              code: "XRP",
              units: summary.paidDrops,
              scale: 6,
            },
          }
        : record.summary,
    slots: record.slots.map((slot) => {
      if (!slot || typeof slot !== "object") return slot;
      const item = slot as Record<string, unknown>;
      return {
        ...item,
        ...(typeof item.expectedAmountDrops === "string" &&
        !("expectedAmount" in item)
          ? {
              asset,
              expectedAmount: {
                code: "XRP",
                units: item.expectedAmountDrops,
                scale: 6,
              },
            }
          : {}),
        ...(!("proofToken" in item) ? { proofToken: null } : {}),
      };
    }),
  };
}

export async function requestBillProgress(
  capabilityToken: string,
  fetcher: typeof fetch = fetch,
): Promise<BillProgress> {
  let response: Response;
  try {
    response = await fetcher("/api/bills/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capabilityToken }),
      cache: "no-store",
    });
  } catch {
    throw new BillProgressRequestError(
      "The bill progress is temporarily unavailable.",
    );
  }

  const body: unknown = await response.json().catch(() => null);
  const parsed = billProgressSchema.safeParse(normalizeProgressBody(body));
  if (response.status === 200 && parsed.success) {
    return parsed.data;
  }

  const message =
    body && typeof body === "object"
      ? (body as { error?: { message?: unknown } }).error?.message
      : undefined;
  throw new BillProgressRequestError(
    typeof message === "string"
      ? message
      : "The bill progress response was invalid.",
  );
}
