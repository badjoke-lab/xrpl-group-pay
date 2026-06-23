import type { ExpectedPayment } from "./expected-payment";
import type { XamanPayloadResponse } from "@/features/xaman/schemas";
import type { XrplTxResult } from "@/features/xrpl/schemas";

export const TEST_TXID = "A".repeat(64);
export const TEST_INVOICE_ID = "B".repeat(64);
export const TEST_SENDER = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
export const TEST_DESTINATION = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
export const TEST_SOURCE_TAG = 123456;
export const TEST_AMOUNT_DROPS = "4000000";

export function makeExpectedPayment(): ExpectedPayment {
  return {
    transactionId: TEST_TXID,
    sender: TEST_SENDER,
    destination: TEST_DESTINATION,
    amountDrops: TEST_AMOUNT_DROPS,
    sourceTag: TEST_SOURCE_TAG,
    destinationTag: 9,
    invoiceId: TEST_INVOICE_ID,
  };
}

export function makeXamanPayload(): XamanPayloadResponse {
  return {
    meta: {
      exists: true,
      submit: true,
      resolved: true,
      signed: true,
      cancelled: false,
      expired: false,
    },
    payload: {
      tx_type: "Payment",
      tx_destination: TEST_DESTINATION,
      tx_destination_tag: 9,
      request_json: {
        TransactionType: "Payment",
        Destination: TEST_DESTINATION,
        Amount: TEST_AMOUNT_DROPS,
        SourceTag: TEST_SOURCE_TAG,
        DestinationTag: 9,
        InvoiceID: TEST_INVOICE_ID,
      },
    },
    response: {
      txid: TEST_TXID,
      account: TEST_SENDER,
      hex: "120000",
      resolved_at: "2026-06-23T00:00:00.000Z",
    },
  };
}

export function makeXrplTransaction(): XrplTxResult {
  return {
    hash: TEST_TXID,
    validated: true,
    ledger_index: 12_345,
    tx_json: {
      TransactionType: "Payment",
      Account: TEST_SENDER,
      Destination: TEST_DESTINATION,
      DeliverMax: TEST_AMOUNT_DROPS,
      SourceTag: TEST_SOURCE_TAG,
      DestinationTag: 9,
      InvoiceID: TEST_INVOICE_ID,
      Flags: 0,
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      delivered_amount: TEST_AMOUNT_DROPS,
    },
  };
}
