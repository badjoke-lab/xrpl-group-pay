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

  return {
    ...record,
    slots: record.slots.map((slot) =>
      slot && typeof slot === "object" && !("proofToken" in slot)
        ? { ...(slot as Record<string, unknown>), proofToken: null }
        : slot,
    ),
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
