import { describe, expect, it, vi } from "vitest";

import { BillInputError } from "@/features/bills/create-bill";
import { BILL_REVIEW_FIXTURE } from "@/test/fixtures/bill-review";

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

const normalizedInput = {
  title: input.title,
  destinationAddress: input.destinationAddress,
  settlementAssetId: "xrpl:testnet:xrp",
  totalAmount: "3",
  creatorShareAmount: "1",
  participants: input.participants.map((participant) => ({
    expectedPayerAddress: participant.expectedPayerAddress,
    amount: "1",
  })),
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
  return { reviewBill: vi.fn().mockReturnValue(BILL_REVIEW_FIXTURE) };
}

describe("POST /api/bills/review", () => {
  it("returns a no-store normalized Asset review without persistence", async () => {
    const deps = dependencies();
    const response = await handleReviewBillRequest(request(), deps);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual(BILL_REVIEW_FIXTURE);
    expect(deps.reviewBill).toHaveBeenCalledWith(normalizedInput);
  });

  it("accepts a canonical RLUSD review request", async () => {
    const deps = dependencies();
    const rlusd = {
      ...normalizedInput,
      settlementAssetId: "xrpl:testnet:rlusd",
    };
    const response = await handleReviewBillRequest(request(rlusd), deps);

    expect(response.status).toBe(200);
    expect(deps.reviewBill).toHaveBeenCalledWith(rlusd);
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
      throw new BillInputError(
        "Creator share and participant amounts must equal the bill total.",
      );
    });

    const response = await handleReviewBillRequest(request(), deps);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVALID_BILL_INPUT",
        message:
          "Creator share and participant amounts must equal the bill total.",
      },
    });
  });
});
