import { describe, expect, it } from "vitest";

import { assetDescriptorSchema } from "@/features/assets/types";
import { paymentIntentSchema } from "@/features/payment-intents/types";
import { createXrpPaymentIntent } from "@/features/payment-intents/xrp";

import {
  buildXrpPaymentTransaction,
  XrplPaymentBuildError,
} from "./payment-builder";

const DESTINATION = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const PAYER = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const INVOICE_ID = "AB".repeat(32);

function xrpIntent() {
  return createXrpPaymentIntent({
    paymentSlotId: "slot-1",
    network: "testnet",
    amountDrops: "4000001",
    destination: DESTINATION,
    destinationTag: 9,
    sourceTag: 123456,
    invoiceId: INVOICE_ID,
    expectedPayer: PAYER,
    now: new Date("2026-06-24T00:00:00.000Z"),
  });
}

describe("buildXrpPaymentTransaction", () => {
  it("builds only the frozen unsigned XRP Payment fields", () => {
    expect(buildXrpPaymentTransaction(xrpIntent())).toEqual({
      TransactionType: "Payment",
      Destination: DESTINATION,
      Amount: "4000001",
      SourceTag: 123456,
      InvoiceID: INVOICE_ID,
      DestinationTag: 9,
    });
  });

  it("omits DestinationTag only when the intent explicitly has none", () => {
    const intent = { ...xrpIntent(), destinationTag: null };
    expect(buildXrpPaymentTransaction(intent)).not.toHaveProperty(
      "DestinationTag",
    );
  });

  it("rejects an issued-asset Payment Intent", () => {
    const issuedAsset = assetDescriptorSchema.parse({
      id: "xrpl:testnet:test-usd",
      paymentRail: "xrpl",
      network: "testnet",
      assetType: "issued",
      currency: "USD",
      issuer: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
      precision: 6,
      symbol: "USD",
      verificationStrategy: "xrpl-issued-asset-v1",
      receiptContract: "xrpl-issued-payment-v1",
    });
    const issuedIntent = paymentIntentSchema.parse({
      ...xrpIntent(),
      asset: issuedAsset,
      amount: { code: "USD", units: "4000001", scale: 6 },
    });

    expect(() => buildXrpPaymentTransaction(issuedIntent)).toThrow(
      XrplPaymentBuildError,
    );
  });
});
