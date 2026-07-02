import { describe, expect, it, vi } from "vitest";

import { getXrpAssetDescriptor } from "@/features/assets/registry";

import {
  BillRecoveryRequestError,
  requestBillRecovery,
} from "./bill-recovery-client";

const TOKEN = "ab".repeat(32);
const SLOT_ID = "00000000-0000-4000-8000-000000000002";
const asset = getXrpAssetDescriptor("testnet");

const management = {
  progress: {
    access: "admin",
    bill: {
      publicId: "00000000-0000-4000-8000-000000000001",
      title: "Dinner",
      network: "testnet",
      paymentMode: "representative",
      recipientLabel: "Host",
      destinationAddress: "rDestination",
      destinationTag: null,
      asset,
      totalAmount: { code: "XRP", units: "10000000", scale: 6 },
      recipientFundedAmount: { code: "XRP", units: "2000000", scale: 6 },
      creatorShareAmount: { code: "XRP", units: "2000000", scale: 6 },
      totalDrops: "10000000",
      recipientFundedDrops: "2000000",
      creatorShareDrops: "2000000",
      status: "needs_review",
      closureState: "active",
      revision: 1,
      frozenAt: "2026-07-02T00:00:00.000Z",
      updatedAt: "2026-07-02T00:05:00.000Z",
    },
    summary: {
      participantCount: 2,
      paidCount: 1,
      remainingCount: 1,
      pendingCount: 0,
      reviewCount: 1,
      expectedExternalAmount: { code: "XRP", units: "8000000", scale: 6 },
      paidAmount: { code: "XRP", units: "3000000", scale: 6 },
      remainingAmount: { code: "XRP", units: "5000000", scale: 6 },
      expectedExternalDrops: "8000000",
      paidDrops: "3000000",
      remainingDrops: "5000000",
    },
    slots: [
      {
        publicId: SLOT_ID,
        participantLabel: "Alex",
        expectedPayerAddress: "rAlex",
        asset,
        expectedAmount: { code: "XRP", units: "5000000", scale: 6 },
        expectedAmountDrops: "5000000",
        invoiceId: "A".repeat(64),
        status: "needs_review",
        reviewReasonCode: "WRONG_DESTINATION",
        paidTransactionId: null,
        paidLedgerIndex: null,
        paidAt: null,
        proofToken: null,
        updatedAt: "2026-07-02T00:05:00.000Z",
      },
    ],
  },
  reviews: [
    {
      slotPublicId: SLOT_ID,
      status: "needs_review",
      reasonCode: "WRONG_DESTINATION",
      details: {
        kind: "verification_mismatch",
        transactionId: "B".repeat(64),
        reasonCode: "WRONG_DESTINATION",
        message: "Observed destination differs.",
        observedAt: "2026-07-02T00:05:00.000Z",
      },
      retryAuthorizedAt: null,
    },
  ],
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("requestBillRecovery", () => {
  it("returns a validated management snapshot", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(management));
    await expect(
      requestBillRecovery(
        { action: "load", adminToken: TOKEN },
        fetcher as unknown as typeof fetch,
      ),
    ).resolves.toEqual(management);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/bills/recovery",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({ action: "load", adminToken: TOKEN }),
      }),
    );
  });

  it("surfaces stable API error codes", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response(
        {
          error: {
            code: "RETRY_CONFIRMATION_REQUIRED",
            message: "Warnings must be acknowledged.",
          },
        },
        422,
      ),
    );

    await expect(
      requestBillRecovery(
        { action: "load", adminToken: TOKEN },
        fetcher as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({
      code: "RETRY_CONFIRMATION_REQUIRED",
      message: "Warnings must be acknowledged.",
    });
  });

  it("rejects malformed success bodies and network failures", async () => {
    const malformed = vi.fn().mockResolvedValue(response({ ok: true }));
    await expect(
      requestBillRecovery(
        { action: "load", adminToken: TOKEN },
        malformed as unknown as typeof fetch,
      ),
    ).rejects.toBeInstanceOf(BillRecoveryRequestError);

    const offline = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(
      requestBillRecovery(
        { action: "load", adminToken: TOKEN },
        offline as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({ code: "BILL_RECOVERY_UNAVAILABLE" });
  });
});
