import { describe, expect, it, vi } from "vitest";

import {
  BillReviewRequestError,
  requestBillReview,
} from "./review-bill-client";

const input = {
  title: "Dinner",
  destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  totalXrp: "3",
  creatorShareXrp: "1",
  participants: [
    {
      expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      amountXrp: "1",
    },
    {
      expectedPayerAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
      amountXrp: "1",
    },
  ],
};

const review = {
  network: "testnet",
  title: "Dinner",
  destinationAddress: input.destinationAddress,
  destinationTag: null,
  totalDrops: "3000000",
  creatorShareDrops: "1000000",
  allocatedDrops: "3000000",
  participants: input.participants.map((participant) => ({
    participantLabel: null,
    expectedPayerAddress: participant.expectedPayerAddress,
    expectedAmountDrops: "1000000",
  })),
};

function response(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("requestBillReview", () => {
  it("returns a validated review snapshot", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(review, 200));

    await expect(
      requestBillReview(input, fetcher as unknown as typeof fetch),
    ).resolves.toEqual(review);
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
