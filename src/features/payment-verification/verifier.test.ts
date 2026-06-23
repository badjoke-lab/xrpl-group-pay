import { describe, expect, it } from "vitest";

import { TF_PARTIAL_PAYMENT } from "./expected-payment";
import {
  makeExpectedPayment,
  makeXrplTransaction,
  TEST_AMOUNT_DROPS,
  TEST_DESTINATION,
  TEST_INVOICE_ID,
  TEST_SENDER,
  TEST_SOURCE_TAG,
  TEST_TXID,
} from "./test-helpers";
import { verifyXrpPayment } from "./verifier";

describe("verifyXrpPayment", () => {
  it("returns a ledger proof only after every expected field matches", () => {
    const outcome = verifyXrpPayment(
      makeExpectedPayment(),
      makeXrplTransaction(),
      new Date("2026-06-23T01:02:03.000Z"),
    );

    expect(outcome).toEqual({
      status: "verified",
      proof: {
        network: "testnet",
        transactionId: TEST_TXID,
        ledgerIndex: 12_345,
        sender: TEST_SENDER,
        destination: TEST_DESTINATION,
        amountDrops: TEST_AMOUNT_DROPS,
        deliveredAmountDrops: TEST_AMOUNT_DROPS,
        sourceTag: TEST_SOURCE_TAG,
        destinationTag: 9,
        invoiceId: TEST_INVOICE_ID,
        idempotencyKey: `testnet:${TEST_TXID}`,
        verifiedAt: "2026-06-23T01:02:03.000Z",
      },
    });
  });

  it("keeps an unvalidated transaction pending", () => {
    const transaction = makeXrplTransaction();
    transaction.validated = false;

    expect(verifyXrpPayment(makeExpectedPayment(), transaction)).toMatchObject({
      status: "pending",
      reason: "TRANSACTION_NOT_VALIDATED",
    });
  });

  it.each([
    ["HASH_MISMATCH", (transaction: ReturnType<typeof makeXrplTransaction>) => {
      transaction.hash = "C".repeat(64);
    }],
    ["TRANSACTION_FAILED", (transaction: ReturnType<typeof makeXrplTransaction>) => {
      transaction.meta.TransactionResult = "tecUNFUNDED_PAYMENT";
    }],
    ["WRONG_TRANSACTION_TYPE", (transaction: ReturnType<typeof makeXrplTransaction>) => {
      transaction.tx_json.TransactionType = "AccountSet";
    }],
    ["WRONG_SENDER", (transaction: ReturnType<typeof makeXrplTransaction>) => {
      transaction.tx_json.Account = TEST_DESTINATION;
    }],
    ["WRONG_DESTINATION", (transaction: ReturnType<typeof makeXrplTransaction>) => {
      transaction.tx_json.Destination = TEST_SENDER;
    }],
    ["PARTIAL_PAYMENT", (transaction: ReturnType<typeof makeXrplTransaction>) => {
      transaction.tx_json.Flags = TF_PARTIAL_PAYMENT;
    }],
    ["CROSS_CURRENCY_PAYMENT", (transaction: ReturnType<typeof makeXrplTransaction>) => {
      transaction.tx_json.SendMax = "5000000";
    }],
    ["NON_XRP_PAYMENT", (transaction: ReturnType<typeof makeXrplTransaction>) => {
      transaction.tx_json.DeliverMax = {
        currency: "USD",
        issuer: TEST_SENDER,
        value: "4",
      };
    }],
    ["AMOUNT_MISMATCH", (transaction: ReturnType<typeof makeXrplTransaction>) => {
      transaction.tx_json.DeliverMax = "3999999";
    }],
    ["DELIVERED_AMOUNT_MISMATCH", (transaction: ReturnType<typeof makeXrplTransaction>) => {
      transaction.meta.delivered_amount = "3999999";
    }],
    ["SOURCE_TAG_MISMATCH", (transaction: ReturnType<typeof makeXrplTransaction>) => {
      transaction.tx_json.SourceTag = TEST_SOURCE_TAG + 1;
    }],
    ["DESTINATION_TAG_MISMATCH", (transaction: ReturnType<typeof makeXrplTransaction>) => {
      transaction.tx_json.DestinationTag = 10;
    }],
    ["INVOICE_ID_MISMATCH", (transaction: ReturnType<typeof makeXrplTransaction>) => {
      transaction.tx_json.InvoiceID = "D".repeat(64);
    }],
  ])("rejects %s", (reason, mutate) => {
    const transaction = makeXrplTransaction();
    mutate(transaction);

    expect(verifyXrpPayment(makeExpectedPayment(), transaction)).toMatchObject({
      status: "failed",
      reason,
      transactionId: TEST_TXID,
    });
  });

  it("requires exact Destination Tag presence", () => {
    const transaction = makeXrplTransaction();
    delete transaction.tx_json.DestinationTag;

    expect(verifyXrpPayment(makeExpectedPayment(), transaction)).toMatchObject({
      status: "failed",
      reason: "DESTINATION_TAG_MISMATCH",
    });

    const expectedWithoutTag = makeExpectedPayment();
    expectedWithoutTag.destinationTag = null;
    expect(verifyXrpPayment(expectedWithoutTag, makeXrplTransaction())).toMatchObject({
      status: "failed",
      reason: "DESTINATION_TAG_MISMATCH",
    });
  });
});
