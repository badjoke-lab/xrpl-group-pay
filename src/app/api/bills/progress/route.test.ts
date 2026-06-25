import { describe, expect, it, vi } from "vitest";

import { getXrpAssetDescriptor } from "@/features/assets/registry";
import {
  BillProgressDatabaseError,
  BillProgressNotFoundError,
  type BillProgress,
} from "@/features/bills/progress";

import {
  handleBillProgressRequest,
  type BillProgressRouteDependencies,
} from "./route";

const TOKEN = "a".repeat(64);
const asset = getXrpAssetDescriptor("testnet");

const progress: BillProgress = {
  access: "admin",
  bill: {
    publicId: "00000000-0000-4000-8000-000000000001",
    title: "Dinner",
    network: "testnet",
    destinationAddress: "rDestination",
    destinationTag: null,
    asset,
    totalAmount: { code: "XRP", units: "10000000", scale: 6 },
    creatorShareAmount: { code: "XRP", units: "2000000", scale: 6 },
    totalDrops: "10000000",
    creatorShareDrops: "2000000",
    status: "partially_paid",
    revision: 1,
    frozenAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:05:00.000Z",
  },
  summary: {
    participantCount: 2,
    paidCount: 1,
    pendingCount: 1,
    reviewCount: 0,
    expectedExternalAmount: { code: "XRP", units: "8000000", scale: 6 },
    paidAmount: { code: "XRP", units: "3000000", scale: 6 },
    expectedExternalDrops: "8000000",
    paidDrops: "3000000",
  },
  slots: [
    {
      publicId: "00000000-0000-4000-8000-000000000002",
      participantLabel: "Alex",
      expectedPayerAddress: "rAlex",
      asset,
      expectedAmount: { code: "XRP", units: "3000000", scale: 6 },
      expectedAmountDrops: "3000000",
      invoiceId: "A".repeat(64),
      status: "paid",
      paidTransactionId: "B".repeat(64),
      paidLedgerIndex: 12345,
      paidAt: "2026-06-24T00:05:00.000Z",
      proofToken: "C".repeat(64),
      updatedAt: "2026-06-24T00:05:00.000Z",
    },
  ],
};

function request(
  body: unknown = { capabilityToken: TOKEN },
  headers: HeadersInit = { "Content-Type": "application/json" },
) {
  return new Request("http://localhost/api/bills/progress", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function dependencies(): BillProgressRouteDependencies & {
  loadProgress: ReturnType<typeof vi.fn>;
} {
  return {
    loadProgress: vi.fn().mockResolvedValue(progress),
  };
}

describe("POST /api/bills/progress", () => {
  it("returns a no-store capability-protected Asset progress snapshot", async () => {
    const deps = dependencies();
    const response = await handleBillProgressRequest(request(), deps);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual(progress);
    expect(deps.loadProgress).toHaveBeenCalledWith(TOKEN);
  });

  it("uses one not-found response for malformed JSON and capabilities", async () => {
    const deps = dependencies();
    const malformed = await handleBillProgressRequest(
      new Request("http://localhost/api/bills/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
      deps,
    );
    const invalid = await handleBillProgressRequest(
      request({ capabilityToken: "invalid" }),
      deps,
    );

    expect(malformed.status).toBe(404);
    expect(invalid.status).toBe(404);
    await expect(malformed.json()).resolves.toEqual(
      await invalid.clone().json(),
    );
    expect(deps.loadProgress).not.toHaveBeenCalled();
  });

  it("rejects unsupported and oversized requests", async () => {
    const unsupported = await handleBillProgressRequest(
      request({ capabilityToken: TOKEN }, { "Content-Type": "text/plain" }),
      dependencies(),
    );
    expect(unsupported.status).toBe(415);

    const oversized = await handleBillProgressRequest(
      new Request("http://localhost/api/bills/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "513",
        },
        body: "{}",
      }),
      dependencies(),
    );
    expect(oversized.status).toBe(413);
  });

  it("does not reveal whether a valid-shaped capability exists", async () => {
    const deps = dependencies();
    deps.loadProgress.mockRejectedValue(new BillProgressNotFoundError());

    const response = await handleBillProgressRequest(request(), deps);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "BILL_PROGRESS_NOT_FOUND" },
    });
  });

  it("keeps D1 failures retryable", async () => {
    const deps = dependencies();
    deps.loadProgress.mockRejectedValue(new BillProgressDatabaseError());

    const response = await handleBillProgressRequest(request(), deps);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "BILL_PROGRESS_UNAVAILABLE" },
    });
  });
});
