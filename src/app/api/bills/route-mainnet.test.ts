import { describe, expect, it, vi } from "vitest";

import { CREATED_BILL_FIXTURE } from "@/test/fixtures/bill-review";

import {
  handleCreateBillRequest,
  type BillRouteDependencies,
} from "./route";

const mainnetInput = {
  title: "Controlled Mainnet XRP acceptance",
  destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  settlementAssetId: "xrpl:mainnet:xrp",
  totalAmount: "0.000002",
  creatorShareAmount: "0",
  allocation: { strategy: "equal" },
  participants: [
    {
      participantId: "payer-1",
      expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    },
    {
      participantId: "payer-2",
      expectedPayerAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
    },
  ],
};

describe("POST /api/bills Mainnet contract", () => {
  it("preserves the explicit Mainnet Asset ID for deployment validation", async () => {
    const createBill = vi.fn().mockResolvedValue(CREATED_BILL_FIXTURE);
    const dependencies: BillRouteDependencies = { createBill };
    const response = await handleCreateBillRequest(
      new Request("https://xgp.badjoke-lab.com/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mainnetInput),
      }),
      dependencies,
    );

    expect(response.status).toBe(201);
    expect(createBill).toHaveBeenCalledWith(mainnetInput);
  });

  it("rejects an unregistered network or asset before domain execution", async () => {
    const createBill = vi.fn().mockResolvedValue(CREATED_BILL_FIXTURE);
    const response = await handleCreateBillRequest(
      new Request("https://xgp.badjoke-lab.com/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...mainnetInput,
          settlementAssetId: "xrpl:mainnet:unknown",
        }),
      }),
      { createBill },
    );

    expect(response.status).toBe(400);
    expect(createBill).not.toHaveBeenCalled();
  });
});
