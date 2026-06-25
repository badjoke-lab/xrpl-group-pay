import { describe, expect, it, vi } from "vitest";

import { BILL_REVIEW_FIXTURE } from "@/test/fixtures/bill-review";

import {
  BillReviewRequestError,
  requestBillReview,
} from "./review-bill-client";

const input = {
  title: "Dinner",
  destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  settlementAssetId: "xrpl:testnet:xrp" as const,
  totalAmount: "3",
  creatorShareAmount: "1",
  participants: [
    {
      expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      amount: "1",
    },
    {
      expectedPayerAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
      amount: "1",
    },
  ],
};

function response(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("requestBillReview", () => {
  it("returns a validated Asset review snapshot", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(response(BILL_REVIEW_FIXTURE, 200));

    await expect(
      requestBillReview(input, fetcher as unknown as typeof fetch),
    ).resolves.toEqual(BILL_REVIEW_FIXTURE);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/bills/review",
      expect.objectContaining({
        body: JSON.stringify(input),
        cache: "no-store",
      }),
    );
  });

  it("rejects malformed success bodies and network failures", async () => {
    const malformed = vi.fn().mockResolvedValue(response({ ok: true }, 200));
    await expect(
      requestBillReview(input, malformed as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(BillReviewRequestError);

    const offline = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(
      requestBillReview(input, offline as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(BillReviewRequestError);
  });
});
