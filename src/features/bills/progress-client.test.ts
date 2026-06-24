import { describe, expect, it, vi } from "vitest";

import {
  BillProgressRequestError,
  requestBillProgress,
} from "./progress-client";

const TOKEN = "ab".repeat(32);
const progress = {
  access: "public",
  bill: {
    publicId: "00000000-0000-4000-8000-000000000001",
    title: "Dinner",
    network: "testnet",
    destinationAddress: "rDestination",
    destinationTag: null,
    totalDrops: "10000000",
    creatorShareDrops: "2000000",
    status: "open",
    revision: 1,
    frozenAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:00:00.000Z",
  },
  summary: {
    participantCount: 2,
    paidCount: 0,
    pendingCount: 2,
    reviewCount: 0,
    expectedExternalDrops: "8000000",
    paidDrops: "0",
  },
  slots: [],
};

function response(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("requestBillProgress", () => {
  it("returns a validated progress snapshot", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(progress, 200));

    await expect(
      requestBillProgress(TOKEN, fetcher as unknown as typeof fetch),
    ).resolves.toEqual(progress);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/bills/progress",
      expect.objectContaining({
        body: JSON.stringify({ capabilityToken: TOKEN }),
        cache: "no-store",
      }),
    );
  });

  it("surfaces API errors without accepting malformed success bodies", async () => {
    const missing = vi
      .fn()
      .mockResolvedValue(
        response(
          { error: { message: "The bill progress link is invalid." } },
          404,
        ),
      );
    await expect(
      requestBillProgress(TOKEN, missing as unknown as typeof fetch),
    ).rejects.toThrow("The bill progress link is invalid.");

    const malformed = vi.fn().mockResolvedValue(response({ ok: true }, 200));
    await expect(
      requestBillProgress(TOKEN, malformed as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(BillProgressRequestError);
  });

  it("turns network failures into retryable request errors", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(
      requestBillProgress(TOKEN, fetcher as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(BillProgressRequestError);
  });
});
