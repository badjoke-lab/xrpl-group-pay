import { describe, expect, it } from "vitest";

import { digestVerifiedPayment } from "@/features/persistence/verified-payment-digest";

import {
  TEST_AMOUNT_DROPS,
  TEST_DESTINATION,
  TEST_INVOICE_ID,
  TEST_SENDER,
  TEST_SOURCE_TAG,
  TEST_TXID,
} from "./test-helpers";
import { verifiedPaymentFromXrpProof } from "./verified-payment";

const proof = {
  network: "testnet" as const,
  transactionId: TEST_TXID,
  ledgerIndex: 12345,
  sender: TEST_SENDER,
  destination: TEST_DESTINATION,
  amountDrops: TEST_AMOUNT_DROPS,
  deliveredAmountDrops: TEST_AMOUNT_DROPS,
  sourceTag: TEST_SOURCE_TAG,
  destinationTag: 9,
  invoiceId: TEST_INVOICE_ID,
  idempotencyKey: `testnet:${TEST_TXID}`,
  verifiedAt: "2026-06-24T00:00:00.000Z",
};

describe("VerifiedPayment", () => {
  it("converts the existing XRP proof without losing Asset identity", () => {
    expect(verifiedPaymentFromXrpProof(proof)).toMatchObject({
      contractVersion: "xrpl-group-pay:verified-payment:v1",
      receiptContract: "xrpl-xrp-payment-v1",
      asset: {
        id: "xrpl:testnet:xrp",
        assetType: "native",
        currency: "XRP",
        issuer: null,
      },
      requestedAmount: {
        code: "XRP",
        units: TEST_AMOUNT_DROPS,
        scale: 6,
      },
      deliveredAmount: {
        code: "XRP",
        units: TEST_AMOUNT_DROPS,
        scale: 6,
      },
    });
  });

  it("produces a stable versioned digest", async () => {
    const payment = verifiedPaymentFromXrpProof(proof);
    const first = await digestVerifiedPayment(payment);
    const second = await digestVerifiedPayment(payment);

    expect(first).toMatch(/^[A-F0-9]{64}$/);
    expect(second).toBe(first);
  });
});
