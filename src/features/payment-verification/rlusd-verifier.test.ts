import { describe, expect, it } from "vitest";

import {
  RLUSD_CURRENCY_HEX,
  RLUSD_ISSUERS,
} from "@/features/assets/rlusd";
import { createRlusdPaymentIntent } from "@/features/payment-intents/rlusd";
import type { XrplTxResult } from "@/features/xrpl/schemas";

import {
  TEST_DESTINATION,
  TEST_INVOICE_ID,
  TEST_SENDER,
  TEST_SOURCE_TAG,
  TEST_TXID,
} from "./test-helpers";
import { verifyRlusdPayment } from "./rlusd-verifier";

const intent = createRlusdPaymentIntent({
  paymentSlotId: "slot-mainnet-rlusd",
  network: "mainnet",
  amountUnits: "1250000",
  destination: TEST_DESTINATION,
  destinationTag: 9,
  sourceTag: TEST_SOURCE_TAG,
  invoiceId: TEST_INVOICE_ID,
  expectedPayer: TEST_SENDER,
});

function amount(value = "1.25", issuer = RLUSD_ISSUERS.mainnet) {
  return { currency: RLUSD_CURRENCY_HEX, issuer, value };
}

function transaction(): XrplTxResult {
  return {
    hash: TEST_TXID,
    validated: true,
    ledger_index: 12_345,
    tx_json: {
      TransactionType: "Payment",
      Account: TEST_SENDER,
      Destination: TEST_DESTINATION,
      DeliverMax: amount(),
      SourceTag: TEST_SOURCE_TAG,
      DestinationTag: 9,
      InvoiceID: TEST_INVOICE_ID,
      Flags: 0,
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      delivered_amount: amount(),
    },
  };
}

describe("verifyRlusdPayment", () => {
  it("verifies official Mainnet RLUSD", () => {
    expect(
      verifyRlusdPayment(intent, TEST_TXID, transaction()),
    ).toMatchObject({
      status: "verified",
      payment: {
        network: "mainnet",
        asset: {
          id: "xrpl:mainnet:rlusd",
          issuer: RLUSD_ISSUERS.mainnet,
        },
        idempotencyKey: `mainnet:${TEST_TXID}`,
      },
    });
  });
});
