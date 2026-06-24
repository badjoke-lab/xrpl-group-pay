import { describe, expect, it } from "vitest";

import {
  makeXamanPayload,
  makeXrplTransaction,
  TEST_AMOUNT_DROPS,
  TEST_DESTINATION,
  TEST_INVOICE_ID,
  TEST_SENDER,
  TEST_SOURCE_TAG,
} from "@/features/payment-verification/test-helpers";

import type { ResolvedPaymentSlot } from "./payment-slot";
import { verifyStoredSlotPayment } from "./stored-slot-verification";

function slot(
  overrides: Partial<ResolvedPaymentSlot> = {},
): ResolvedPaymentSlot {
  return {
    slotId: "slot-1",
    slotPublicId: "00000000-0000-4000-8000-000000000001",
    billId: "bill-1",
    billPublicId: "00000000-0000-4000-8000-000000000002",
    billTitle: "Dinner",
    network: "testnet",
    destinationAddress: TEST_DESTINATION,
    destinationTag: 9,
    participantLabel: "Alex",
    expectedPayerAddress: TEST_SENDER,
    expectedAmountDrops: TEST_AMOUNT_DROPS,
    invoiceId: TEST_INVOICE_ID,
    slotStatus: "unpaid",
    billStatus: "open",
    paidTransactionId: null,
    ...overrides,
  };
}

describe("verifyStoredSlotPayment", () => {
  it("verifies only after the Xaman template matches the frozen slot", async () => {
    const outcome = await verifyStoredSlotPayment(slot(), "payload-id", {
      getXamanPayload: async () => makeXamanPayload(),
      getXrplTransaction: async () => makeXrplTransaction(),
      sourceTag: TEST_SOURCE_TAG,
      now: () => new Date("2026-06-24T00:00:00.000Z"),
    });

    expect(outcome).toMatchObject({
      status: "verified",
      proof: {
        sender: TEST_SENDER,
        invoiceId: TEST_INVOICE_ID,
        verifiedAt: "2026-06-24T00:00:00.000Z",
      },
    });
  });

  it.each([
    ["expectedPayerAddress", "rWrongPayer"],
    ["destinationAddress", "rWrongDestination"],
    ["expectedAmountDrops", "1"],
    ["destinationTag", null],
    ["invoiceId", "C".repeat(64)],
  ] as const)(
    "rejects a Xaman payload that differs from slot field %s",
    async (field, value) => {
      let xrplCalled = false;
      const outcome = await verifyStoredSlotPayment(
        slot({ [field]: value }),
        "payload-id",
        {
          getXamanPayload: async () => makeXamanPayload(),
          getXrplTransaction: async () => {
            xrplCalled = true;
            return makeXrplTransaction();
          },
          sourceTag: TEST_SOURCE_TAG,
        },
      );

      expect(outcome).toMatchObject({
        status: "failed",
        reason: "SLOT_EXPECTATION_MISMATCH",
      });
      expect(xrplCalled).toBe(false);
    },
  );

  it("keeps unresolved Xaman payloads pending", async () => {
    const payload = makeXamanPayload();
    payload.meta.resolved = false;
    payload.meta.signed = false;
    payload.response.txid = null;

    const outcome = await verifyStoredSlotPayment(slot(), "payload-id", {
      getXamanPayload: async () => payload,
      getXrplTransaction: async () => makeXrplTransaction(),
      sourceTag: TEST_SOURCE_TAG,
    });

    expect(outcome).toMatchObject({
      status: "pending",
      reason: "XAMAN_NOT_RESOLVED",
    });
  });
});
