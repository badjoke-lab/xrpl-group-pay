import { describe, expect, it } from "vitest";

import { createXrpPaymentIntent } from "@/features/payment-intents/xrp";

import {
  makeXrplTransaction,
  TEST_AMOUNT_DROPS,
  TEST_DESTINATION,
  TEST_INVOICE_ID,
  TEST_SENDER,
  TEST_SOURCE_TAG,
  TEST_TXID,
} from "./test-helpers";
import { dispatchPaymentVerification } from "./strategy";

describe("dispatchPaymentVerification", () => {
  it("routes a native XRP intent to the XRP strategy", () => {
    const intent = createXrpPaymentIntent({
      paymentSlotId: "slot-1",
      network: "testnet",
      amountDrops: TEST_AMOUNT_DROPS,
      destination: TEST_DESTINATION,
      destinationTag: 9,
      sourceTag: TEST_SOURCE_TAG,
      invoiceId: TEST_INVOICE_ID,
      expectedPayer: TEST_SENDER,
    });

    expect(
      dispatchPaymentVerification(intent, TEST_TXID, makeXrplTransaction()),
    ).toMatchObject({ status: "verified" });
  });
});
