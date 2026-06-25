import { describe, expect, it, vi } from "vitest";

import { BillDatabaseError, BillInputError } from "@/features/bills/create-bill";
import { CREATED_BILL_FIXTURE } from "@/test/fixtures/bill-review";

import {
  handleCreateBillRequest,
  type BillRouteDependencies,
} from "./route";

const validInput = {
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
  title: validInput.title,
  destinationAddress: validInput.destinationAddress,
  settlementAssetId: "xrpl:testnet:xrp",
  totalAmount: "3",
  creatorShareAmount: "1",
  participants: validInput.participants.map((participant) => ({
    expectedPayerAddress: participant.expectedPayerAddress,
    amount: "1",
  })),
};

function request(body: unknown = validInput) {
  return new Request("http://localhost/api/bills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dependencies(): BillRouteDependencies & {
  createBill: ReturnType<typeof vi.fn>;
} {
  return { createBill: vi.fn().mockResolvedValue(CREATED_BILL_FIXTURE) };
}

describe("POST /api/bills", () => {
  it("normalizes legacy XRP input before creating a frozen Bill", async () => {
    const deps = dependencies();
    const response = await handleCreateBillRequest(request(), deps);

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual(CREATED_BILL_FIXTURE);
    expect(deps.createBill).toHaveBeenCalledWith(normalizedInput);
  });

  it("accepts the canonical RLUSD creation contract", async () => {
    const deps = dependencies();
    const input = {
      ...normalizedInput,
      settlementAssetId: "xrpl:testnet:rlusd",
      totalAmount: "3.25",
      creatorShareAmount: "1.25",
    };
    const response = await handleCreateBillRequest(request(input), deps);

    expect(response.status).toBe(201);
    expect(deps.createBill).toHaveBeenCalledWith(input);
  });

  it("rejects malformed, invalid, and oversized input before creation", async () => {
    const deps = dependencies();
    const malformed = await handleCreateBillRequest(
      new Request("http://localhost/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
      deps,
    );
    expect(malformed.status).toBe(400);

    const invalid = await handleCreateBillRequest(request({ title: "" }), deps);
    expect(invalid.status).toBe(400);

    const oversized = await handleCreateBillRequest(
      new Request("http://localhost/api/bills", {
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
    expect(deps.createBill).not.toHaveBeenCalled();
  });

  it("maps domain validation and storage failures", async () => {
    const invalidDeps = dependencies();
    invalidDeps.createBill.mockRejectedValue(
      new BillInputError("Amounts do not add up."),
    );
    const invalid = await handleCreateBillRequest(request(), invalidDeps);
    expect(invalid.status).toBe(400);

    const failedDeps = dependencies();
    failedDeps.createBill.mockRejectedValue(new BillDatabaseError());
    const failed = await handleCreateBillRequest(request(), failedDeps);
    expect(failed.status).toBe(503);
    await expect(failed.json()).resolves.toMatchObject({
      error: { code: "BILL_STORAGE_UNAVAILABLE" },
    });
  });
});
