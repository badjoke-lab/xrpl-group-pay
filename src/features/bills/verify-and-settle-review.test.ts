import { describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike } from "@/features/persistence/d1-types";

import type { ResolvedPaymentSlot } from "./payment-slot";
import { verifyAndSettleStoredSlotPayment } from "./verify-and-settle-slot";

const slot: ResolvedPaymentSlot = {
  slotId: "slot-1",
  slotPublicId: "00000000-0000-4000-8000-000000000001",
  billId: "bill-1",
  billPublicId: "00000000-0000-4000-8000-000000000002",
  billTitle: "Dinner",
  network: "testnet",
  destinationAddress: "rDestination",
  destinationTag: null,
  participantLabel: "Alex",
  expectedPayerAddress: "rSender",
  expectedAmountDrops: "1000000",
  invoiceId: "A".repeat(64),
  slotStatus: "validating",
  billStatus: "open",
  paidTransactionId: null,
};

const database = {
  prepare() {
    throw new Error("Injected review persistence should be used.");
  },
  batch() {
    throw new Error("Injected review persistence should be used.");
  },
} as D1DatabaseLike;

const verification = {
  readProviderStatus: vi.fn(),
  getXrplTransaction: vi.fn(),
  sourceTag: 1,
};

describe("verifyAndSettleStoredSlotPayment review persistence", () => {
  it("records expected versus observed mismatch facts before returning review-required recovery", async () => {
    const recordReview = vi.fn().mockResolvedValue(undefined);
    const verifyPayment = vi.fn().mockResolvedValue({
      status: "failed",
      reason: "WRONG_DESTINATION",
      transactionId: "B".repeat(64),
      message: "The observed destination does not match the frozen recipient.",
    });

    const result = await verifyAndSettleStoredSlotPayment(
      database,
      slot,
      "request-id",
      {
        verification,
        verifyPayment,
        recordReview,
        settleXrp: vi.fn(),
        settleIssued: vi.fn(),
      },
    );

    expect(result).toMatchObject({
      status: "failed",
      recovery: {
        code: "WRONG_DESTINATION",
        disposition: "review_required",
        requiresReview: true,
        replacementRule: "blocked",
      },
    });
    expect(recordReview).toHaveBeenCalledWith(database, slot, {
      kind: "verification_mismatch",
      transactionId: "B".repeat(64),
      reasonCode: "WRONG_DESTINATION",
      message: "The observed destination does not match the frozen recipient.",
    });
  });

  it("does not persist a pending outcome as operator review", async () => {
    const recordReview = vi.fn();
    await verifyAndSettleStoredSlotPayment(database, slot, "request-id", {
      verification,
      verifyPayment: vi.fn().mockResolvedValue({
        status: "pending",
        reason: "TRANSACTION_NOT_VALIDATED",
        transactionId: "B".repeat(64),
        message: "Pending",
      }),
      recordReview,
      settleXrp: vi.fn(),
      settleIssued: vi.fn(),
    });
    expect(recordReview).not.toHaveBeenCalled();
  });
});
