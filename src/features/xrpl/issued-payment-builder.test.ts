import { describe, expect, it } from "vitest";

import {
  RLUSD_CURRENCY_HEX,
  RLUSD_ISSUERS,
} from "@/features/assets/rlusd";
import { createRlusdPaymentIntent } from "@/features/payment-intents/rlusd";

import { buildIssuedPaymentTransaction } from "./issued-payment-builder";
import { buildXrplPaymentTransaction } from "./transaction-builder";

const DESTINATION = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const PAYER = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const INVOICE_ID = "AB".repeat(32);

function intent() {
  return createRlusdPaymentIntent({
    paymentSlotId: "slot-rlusd-1",
    network: "testnet",
    amountUnits: "1250000",
    destination: DESTINATION,
    destinationTag: 9,
    sourceTag: 123456,
    invoiceId: INVOICE_ID,
    expectedPayer: PAYER,
  });
}

describe("buildIssuedPaymentTransaction", () => {
  it("builds an exact RLUSD Amount object", () => {
    expect(buildIssuedPaymentTransaction(intent())).toEqual({
      TransactionType: "Payment",
      Destination: DESTINATION,
      Amount: {
        currency: RLUSD_CURRENCY_HEX,
        issuer: RLUSD_ISSUERS.testnet,
        value: "1.25",
      },
      SourceTag: 123456,
      InvoiceID: INVOICE_ID,
      DestinationTag: 9,
    });
  });

  it("dispatches the issued builder by Asset type", () => {
    expect(buildXrplPaymentTransaction(intent()).Amount).toEqual({
      currency: RLUSD_CURRENCY_HEX,
      issuer: RLUSD_ISSUERS.testnet,
      value: "1.25",
    });
  });
});
