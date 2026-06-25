import { describe, expect, it } from "vitest";

import {
  RLUSD_CURRENCY_HEX,
  RLUSD_ISSUERS,
} from "@/features/assets/rlusd";
import { createRlusdPaymentIntent } from "@/features/payment-intents/rlusd";
import type { XrplTxResult } from "@/features/xrpl/schemas";

import { TF_PARTIAL_PAYMENT } from "./expected-payment";
import { verifyIssuedPayment } from "./issued-verifier";
import {
  TEST_DESTINATION,
  TEST_INVOICE_ID,
  TEST_SENDER,
  TEST_SOURCE_TAG,
  TEST_TXID,
} from "./test-helpers";

const intent = createRlusdPaymentIntent({
  paymentSlotId: "slot-rlusd-1",
  network: "testnet",
  amountUnits: "1250000",
  destination: TEST_DESTINATION,
  destinationTag: 9,
  sourceTag: TEST_SOURCE_TAG,
  invoiceId: TEST_INVOICE_ID,
  expectedPayer: TEST_SENDER,
  now: new Date("2026-06-25T00:00:00.000Z"),
});

function amount(
  value = "1.25",
  currency = RLUSD_CURRENCY_HEX,
  issuer = RLUSD_ISSUERS.testnet,
) {
  return { currency, issuer, value };
}

function transaction(
  overrides: {
    requested?: unknown;
    delivered?: unknown;
    flags?: number;
    sendMax?: unknown;
    paths?: unknown;
  } = {},
): XrplTxResult {
  return {
    hash: TEST_TXID,
    validated: true,
    ledger_index: 12_345,
    tx_json: {
      TransactionType: "Payment",
      Account: TEST_SENDER,
      Destination: TEST_DESTINATION,
      DeliverMax: overrides.requested ?? amount(),
      SourceTag: TEST_SOURCE_TAG,
      DestinationTag: 9,
      InvoiceID: TEST_INVOICE_ID,
      Flags: overrides.flags ?? 0,
      ...(overrides.sendMax === undefined
        ? {}
        : { SendMax: overrides.sendMax }),
      ...(overrides.paths === undefined ? {} : { Paths: overrides.paths }),
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      delivered_amount: overrides.delivered ?? amount(),
    },
  };
}

describe("verifyIssuedPayment", () => {
  it("verifies exact official RLUSD identity and delivered amount", () => {
    const outcome = verifyIssuedPayment(
      intent,
      TEST_TXID,
      transaction({
        requested: amount("125e-2"),
        delivered: amount("1.250000"),
      }),
      new Date("2026-06-25T01:00:00.000Z"),
    );

    expect(outcome).toMatchObject({
      status: "verified",
      legacyProof: null,
      payment: {
        contractVersion: "xrpl-group-pay:verified-payment:v1",
        receiptContract: "xrpl-issued-payment-v1",
        transactionId: TEST_TXID,
        asset: {
          currency: RLUSD_CURRENCY_HEX,
          issuer: RLUSD_ISSUERS.testnet,
        },
        requestedAmount: { units: "1250000", scale: 6 },
        deliveredAmount: { units: "1250000", scale: 6 },
      },
    });
  });

  it.each([
    [amount("1.25", "USD"), "ASSET_MISMATCH"],
    [amount("1.25", RLUSD_CURRENCY_HEX, TEST_SENDER), "ASSET_MISMATCH"],
    [amount("1.24"), "AMOUNT_MISMATCH"],
  ] as const)("rejects a mismatched requested Amount", (requested, reason) => {
    expect(
      verifyIssuedPayment(intent, TEST_TXID, transaction({ requested })),
    ).toMatchObject({ status: "failed", reason });
  });

  it.each([
    [amount("1.25", "USD"), "DELIVERED_ASSET_MISMATCH"],
    [amount("1.25", RLUSD_CURRENCY_HEX, TEST_SENDER), "DELIVERED_ASSET_MISMATCH"],
    [amount("1.24"), "DELIVERED_AMOUNT_MISMATCH"],
  ] as const)("rejects a mismatched delivered Amount", (delivered, reason) => {
    expect(
      verifyIssuedPayment(intent, TEST_TXID, transaction({ delivered })),
    ).toMatchObject({ status: "failed", reason });
  });

  it("rejects partial and cross-currency fields", () => {
    expect(
      verifyIssuedPayment(
        intent,
        TEST_TXID,
        transaction({ flags: TF_PARTIAL_PAYMENT }),
      ),
    ).toMatchObject({ status: "failed", reason: "PARTIAL_PAYMENT" });
    expect(
      verifyIssuedPayment(
        intent,
        TEST_TXID,
        transaction({ sendMax: amount("1.25") }),
      ),
    ).toMatchObject({ status: "failed", reason: "CROSS_CURRENCY_PAYMENT" });
  });

  it("rejects native XRP amount shapes", () => {
    expect(
      verifyIssuedPayment(
        intent,
        TEST_TXID,
        transaction({ requested: "1250000", delivered: "1250000" }),
      ),
    ).toMatchObject({ status: "failed", reason: "NON_ISSUED_PAYMENT" });
  });
});
