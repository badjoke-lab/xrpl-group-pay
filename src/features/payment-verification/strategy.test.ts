import { describe, expect, it } from "vitest";

import {
  RLUSD_CURRENCY_HEX,
  RLUSD_ISSUERS,
} from "@/features/assets/rlusd";
import type { XrplNetwork } from "@/features/assets/types";
import { createRlusdPaymentIntent } from "@/features/payment-intents/rlusd";
import { createXrpPaymentIntent } from "@/features/payment-intents/xrp";
import type { XrplTxResult } from "@/features/xrpl/schemas";

import {
  makeXrplTransaction,
  TEST_AMOUNT_DROPS,
  TEST_DESTINATION,
  TEST_INVOICE_ID,
  TEST_SENDER,
  TEST_SOURCE_TAG,
  TEST_TXID,
} from "./test-helpers";
import {
  dispatchAssetPaymentVerification,
  dispatchPaymentVerification,
} from "./strategy";

function rlusdTransaction(network: XrplNetwork = "testnet"): XrplTxResult {
  const issued = {
    currency: RLUSD_CURRENCY_HEX,
    issuer: RLUSD_ISSUERS[network],
    value: "1.25",
  };
  return {
    hash: TEST_TXID,
    validated: true,
    ledger_index: 12_345,
    tx_json: {
      TransactionType: "Payment",
      Account: TEST_SENDER,
      Destination: TEST_DESTINATION,
      DeliverMax: issued,
      SourceTag: TEST_SOURCE_TAG,
      DestinationTag: 9,
      InvoiceID: TEST_INVOICE_ID,
      Flags: 0,
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      delivered_amount: issued,
    },
  };
}

describe("verification dispatch", () => {
  it("routes a native XRP intent and preserves its legacy proof", () => {
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

  it("routes Mainnet XRP to a Mainnet-scoped proof", () => {
    const intent = createXrpPaymentIntent({
      paymentSlotId: "slot-mainnet-xrp",
      network: "mainnet",
      amountDrops: TEST_AMOUNT_DROPS,
      destination: TEST_DESTINATION,
      destinationTag: 9,
      sourceTag: TEST_SOURCE_TAG,
      invoiceId: TEST_INVOICE_ID,
      expectedPayer: TEST_SENDER,
    });

    expect(
      dispatchAssetPaymentVerification(
        intent,
        TEST_TXID,
        makeXrplTransaction(),
      ),
    ).toMatchObject({
      status: "verified",
      legacyProof: {
        network: "mainnet",
        idempotencyKey: `mainnet:${TEST_TXID}`,
      },
      payment: {
        network: "mainnet",
        asset: { id: "xrpl:mainnet:xrp" },
      },
    });
  });

  it("routes Testnet RLUSD without enabling the legacy endpoint", () => {
    const intent = createRlusdPaymentIntent({
      paymentSlotId: "slot-rlusd-1",
      network: "testnet",
      amountUnits: "1250000",
      destination: TEST_DESTINATION,
      destinationTag: 9,
      sourceTag: TEST_SOURCE_TAG,
      invoiceId: TEST_INVOICE_ID,
      expectedPayer: TEST_SENDER,
    });

    expect(
      dispatchAssetPaymentVerification(intent, TEST_TXID, rlusdTransaction()),
    ).toMatchObject({
      status: "verified",
      legacyProof: null,
      payment: { receiptContract: "xrpl-issued-payment-v1" },
    });
    expect(
      dispatchPaymentVerification(intent, TEST_TXID, rlusdTransaction()),
    ).toMatchObject({
      status: "failed",
      reason: "UNSUPPORTED_VERIFICATION_STRATEGY",
    });
  });

  it("routes official Mainnet RLUSD to a Mainnet-scoped payment", () => {
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

    expect(
      dispatchAssetPaymentVerification(
        intent,
        TEST_TXID,
        rlusdTransaction("mainnet"),
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
        idempotencyKey: `mainnet:${TEST_TXID}`,
      },
    });
  });
});
