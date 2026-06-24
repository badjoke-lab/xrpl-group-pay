import { describe, expect, it, vi } from "vitest";

import { BillInputError } from "@/features/bills/create-bill";
import type { BillReview } from "@/features/bills/types";

import {
  handleReviewBillRequest,
  type BillReviewRouteDependencies,
} from "./route";

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

const review: BillReview = {
  network: "testnet",
  title: "Dinner",
  destinationAddress: input.destinationAddress,
  destinationTag: null,
  totalDrops: "3000000",
  creatorShareDrops: "1000000",
  allocatedDrops: "3000000",
  participants: [
    {
      participantLabel: null,
      expectedPayerAddress: input.participants[0].expectedPayerAddress,
      expectedAmountDrops: "1000000",
    },
    {
      participantLabel: null,
      expectedPayerAddress: input.participants[1].expectedPayerAddress,
      expectedAmountDrops: "1000000",
    },
  ],
};

function request(body: unknown = input) {
  return new Request("http://localhost/api/bills/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dependencies(): BillReviewRouteDependencies & {
  reviewBill: ReturnType<typeof vi.fn>;
} {
  return { reviewBill: vi.fn().mockReturnValue(review) };
}

describe("POST /api/bills/review", () => {
  it("returns a no-store normalized review without persistence", async () => {
    const deps = dependencies();
    const response = await handleReviewBillRequest(request(), deps);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual(review);
    expect(deps.reviewBill).toHaveBeenCalledWith(input);
  });

  it("rejects malformed and oversized input before review", async () => {
    const deps = dependencies();
    const malformed = await handleReviewBillRequest(
      new Request("http://localhost/api/bills/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
      deps,
    );
    expect(malformed.status).toBe(400);

    const oversized = await handleReviewBillRequest(
      new Request("http://localhost/api/bills/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "32769",
        },
        body: "{}",
      }),
      deps,
    );
    expect(oversized.status).toBe(413);
    expect(deps.reviewBill).not.toHaveBeenCalled();
  });

  it("returns the exact domain validation message", async () => {
    const deps = dependencies();
    deps.reviewBill.mockImplementation(() => {
      throw new BillInputError("Creator share and participant amounts must equal the bill total.");
    });

    const response = await handleReviewBillRequest(request(), deps);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVALID_BILL_INPUT",
        message: "Creator share and participant amounts must equal the bill total.",
      },
    });
  });
});
