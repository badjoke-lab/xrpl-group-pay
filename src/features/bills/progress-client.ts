import { getXrpAssetDescriptor } from "@/features/assets/registry";

import { billProgressSchema, type BillProgress } from "./progress";

export class BillProgressRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillProgressRequestError";
  }
}

function subtractUnits(expected: unknown, paid: unknown) {
  if (
    typeof expected !== "string" ||
    typeof paid !== "string" ||
    !/^\d+$/.test(expected) ||
    !/^\d+$/.test(paid)
  ) {
    return null;
  }
  const difference = BigInt(expected) - BigInt(paid);
  return difference >= 0n ? difference.toString() : null;
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

  const normalizedBill =
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
      : bill;

  const billRecord =
    normalizedBill && typeof normalizedBill === "object"
      ? (normalizedBill as Record<string, unknown>)
      : null;
  const creatorShareAmount = billRecord?.creatorShareAmount;
  const creatorShareDrops = billRecord?.creatorShareDrops;

  const compatibleBill = billRecord
    ? {
        ...billRecord,
        ...(!("paymentMode" in billRecord)
          ? { paymentMode: "representative" }
          : {}),
        ...(!("recipientLabel" in billRecord) ? { recipientLabel: null } : {}),
        ...(!("recipientFundedAmount" in billRecord) && creatorShareAmount
          ? { recipientFundedAmount: creatorShareAmount }
          : {}),
        ...(!("recipientFundedDrops" in billRecord)
          ? { recipientFundedDrops: creatorShareDrops ?? null }
          : {}),
        ...(!("closureState" in billRecord) ? { closureState: "active" } : {}),
      }
    : record.bill;

  const normalizedSummary =
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
      : summary;

  const summaryRecord =
    normalizedSummary && typeof normalizedSummary === "object"
      ? (normalizedSummary as Record<string, unknown>)
      : null;
  const expectedAmount = summaryRecord?.expectedExternalAmount as
    | { code?: unknown; units?: unknown; scale?: unknown }
    | undefined;
  const paidAmount = summaryRecord?.paidAmount as
    | { code?: unknown; units?: unknown; scale?: unknown }
    | undefined;
  const remainingUnits = subtractUnits(expectedAmount?.units, paidAmount?.units);
  const remainingDrops = subtractUnits(
    summaryRecord?.expectedExternalDrops,
    summaryRecord?.paidDrops,
  );

  const compatibleSummary = summaryRecord
    ? {
        ...summaryRecord,
        ...(!("remainingCount" in summaryRecord) &&
        typeof summaryRecord.participantCount === "number" &&
        typeof summaryRecord.paidCount === "number"
          ? {
              remainingCount:
                summaryRecord.participantCount - summaryRecord.paidCount,
            }
          : {}),
        ...(!("remainingAmount" in summaryRecord) &&
        expectedAmount &&
        paidAmount &&
        remainingUnits !== null
          ? {
              remainingAmount: {
                code: expectedAmount.code,
                units: remainingUnits,
                scale: expectedAmount.scale,
              },
            }
          : {}),
        ...(!("remainingDrops" in summaryRecord)
          ? { remainingDrops }
          : {}),
      }
    : record.summary;

  return {
    ...record,
    bill: compatibleBill,
    summary: compatibleSummary,
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
        ...(!("reviewReasonCode" in item)
          ? { reviewReasonCode: null }
          : {}),
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
