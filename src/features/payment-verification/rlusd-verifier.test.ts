import { describe, expect, it } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import {
  RLUSD_CURRENCY_HEX,
  RLUSD_ISSUERS,
} from "@/features/assets/rlusd";
import { createRlusdPaymentIntent } from "@/features/payment-intents/rlusd";
import type { PaymentIntent } from "@/features/payment-intents/types";
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

function amount(
  value = "1.25",
  issuer = RLUSD_ISSUERS.mainnet,
  currency = RLUSD_CURRENCY_HEX,
) {
  return { currency, issuer, value };
}

function transaction(
  requested: unknown = amount(),
  delivered: unknown = amount(),
): XrplTxResult {
  return {
    hash: TEST_TXID,
    validated: true,
    ledger_index: 12_345,
    tx_json: {
      TransactionType: "Payment",
      Account: TEST_SENDER,
      Destination: TEST_DESTINATION,
      DeliverMax: requested,
      SourceTag: TEST_SOURCE_TAG,
      DestinationTag: 9,
      InvoiceID: TEST_INVOICE_ID,
      Flags: 0,
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      delivered_amount: delivered,
    },
  };
}

describe("verifyRlusdPayment", () => {
  it("verifies official Mainnet RLUSD", () => {
    expect(
      verifyRlusdPayment(
        intent,
        TEST_TXID,
        transaction(amount("125e-2"), amount("1.250000")),
      ),
    ).toMatchObject({
      status: "verified",
      legacyProof: null,
      payment: {
        network: "mainnet",
        asset: {
          id: "xrpl:mainnet:rlusd",
          issuer: RLUSD_ISSUERS.mainnet,
        },
        requestedAmount: { units: "1250000", scale: 6 },
        deliveredAmount: { units: "1250000", scale: 6 },
        idempotencyKey: `mainnet:${TEST_TXID}`,
      },
    });
  });

  it("rejects a non-canonical issued Asset", () => {
    const officialAsset = getRlusdAssetDescriptor("mainnet");
    const arbitraryIntent: PaymentIntent = {
      ...intent,
      asset: {
        ...officialAsset,
        id: "xrpl:mainnet:arbitrary-usd",
        issuer: TEST_SENDER,
      },
    };

    expect(
      verifyRlusdPayment(arbitraryIntent, TEST_TXID, transaction()),
    ).toMatchObject({
      status: "failed",
      reason: "UNSUPPORTED_VERIFICATION_STRATEGY",
    });
  });

  it("rejects a Testnet issuer in the Mainnet requested Amount", () => {
    expect(
      verifyRlusdPayment(
        intent,
        TEST_TXID,
        transaction(amount("1.25", RLUSD_ISSUERS.testnet)),
      ),
    ).toMatchObject({ status: "failed", reason: "ASSET_MISMATCH" });
  });

  it("rejects a Testnet issuer in the Mainnet delivered amount", () => {
    expect(
      verifyRlusdPayment(
        intent,
        TEST_TXID,
        transaction(amount(), amount("1.25", RLUSD_ISSUERS.testnet)),
      ),
    ).toMatchObject({
      status: "failed",
      reason: "DELIVERED_ASSET_MISMATCH",
    });
  });
});
