import { describe, expect, it } from "vitest";

import {
  makeXrplTransaction,
  TEST_AMOUNT_DROPS,
  TEST_DESTINATION,
  TEST_INVOICE_ID,
  TEST_SENDER,
  TEST_SOURCE_TAG,
  TEST_TXID,
} from "@/features/payment-verification/test-helpers";
import { verifyStoredSlotPayment } from "./stored-slot-verification";

describe("stored verification dispatch", () => {
  it("verifies a submitted request", async () => {
    const outcome = await verifyStoredSlotPayment(
      {
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
      },
      "request-id",
      {
        readProviderStatus: async () => ({
          providerId: "xaman",
          requestId: "request-id",
          status: "submitted",
          transactionId: TEST_TXID,
        }),
        getXrplTransaction: async () => makeXrplTransaction(),
        sourceTag: TEST_SOURCE_TAG,
      },
    );
    expect(outcome.status).toBe("verified");
  });
});
