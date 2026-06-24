import { describe, expect, it, vi } from "vitest";

import { BillDatabaseError, BillInputError } from "@/features/bills/create-bill";
import type { CreatedBill } from "@/features/bills/types";

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

const created: CreatedBill = {
  bill: {
    publicId: "00000000-0000-4000-8000-000000000001",
    title: "Dinner",
    network: "testnet",
    destinationAddress: validInput.destinationAddress,
    destinationTag: null,
    totalDrops: "3000000",
    creatorShareDrops: "1000000",
    status: "open",
    revision: 1,
    frozenAt: "2026-06-24T00:00:00.000Z",
    createdAt: "2026-06-24T00:00:00.000Z",
  },
  capabilities: {
    publicToken: "1".repeat(64),
    adminToken: "2".repeat(64),
  },
  slots: [
    {
      publicId: "00000000-0000-4000-8000-000000000002",
      participantLabel: null,
      expectedPayerAddress: validInput.participants[0].expectedPayerAddress,
      expectedAmountDrops: "1000000",
      invoiceId: "A".repeat(64),
      status: "unpaid",
      paymentToken: "3".repeat(64),
    },
    {
      publicId: "00000000-0000-4000-8000-000000000003",
      participantLabel: null,
      expectedPayerAddress: validInput.participants[1].expectedPayerAddress,
      expectedAmountDrops: "1000000",
      invoiceId: "B".repeat(64),
      status: "unpaid",
      paymentToken: "4".repeat(64),
    },
  ],
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
  return { createBill: vi.fn().mockResolvedValue(created) };
}

describe("POST /api/bills", () => {
  it("creates a frozen bill and returns capabilities once", async () => {
    const deps = dependencies();
    const response = await handleCreateBillRequest(request(), deps);

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual(created);
    expect(deps.createBill).toHaveBeenCalledWith(validInput);
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
