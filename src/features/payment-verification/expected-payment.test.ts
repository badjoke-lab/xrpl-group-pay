import { describe, expect, it } from "vitest";

import {
  ExpectedPaymentError,
  extractExpectedPayment,
  TF_PARTIAL_PAYMENT,
} from "./expected-payment";
import {
  makeXamanPayload,
  TEST_AMOUNT_DROPS,
  TEST_DESTINATION,
  TEST_INVOICE_ID,
  TEST_SENDER,
  TEST_SOURCE_TAG,
  TEST_TXID,
} from "./test-helpers";

describe("extractExpectedPayment", () => {
  it("uses the server-fetched Xaman template and signer as expected values", () => {
    expect(
      extractExpectedPayment(makeXamanPayload(), TEST_SOURCE_TAG),
    ).toEqual({
      network: "testnet",
      transactionId: TEST_TXID,
      sender: TEST_SENDER,
      destination: TEST_DESTINATION,
      amountDrops: TEST_AMOUNT_DROPS,
      sourceTag: TEST_SOURCE_TAG,
      destinationTag: 9,
      invoiceId: TEST_INVOICE_ID,
    });
  });

  it("treats an unresolved Sign Request as pending", () => {
    const payload = makeXamanPayload();
    payload.meta.resolved = false;
    payload.meta.signed = false;
    payload.response.txid = null;

    expect(() => extractExpectedPayment(payload, TEST_SOURCE_TAG)).toThrow(
      expect.objectContaining<Partial<ExpectedPaymentError>>({
        code: "XAMAN_NOT_RESOLVED",
      }),
    );
  });

  it.each([
    ["wrong Source Tag", (payload: ReturnType<typeof makeXamanPayload>) => {
      payload.payload!.request_json.SourceTag = TEST_SOURCE_TAG + 1;
    }],
    ["partial payment", (payload: ReturnType<typeof makeXamanPayload>) => {
      payload.payload!.request_json.Flags = TF_PARTIAL_PAYMENT;
    }],
    ["cross-currency field", (payload: ReturnType<typeof makeXamanPayload>) => {
      payload.payload!.request_json.SendMax = "5000000";
    }],
    ["fixed signer account", (payload: ReturnType<typeof makeXamanPayload>) => {
      payload.payload!.request_json.Account = TEST_SENDER;
    }],
    ["mismatched destination summary", (payload: ReturnType<typeof makeXamanPayload>) => {
      payload.payload!.tx_destination = TEST_SENDER;
    }],
  ])("rejects an invalid template: %s", (_name, mutate) => {
    const payload = makeXamanPayload();
    mutate(payload);

    expect(() => extractExpectedPayment(payload, TEST_SOURCE_TAG)).toThrow(
      expect.objectContaining<Partial<ExpectedPaymentError>>({
        code: "INVALID_XAMAN_TEMPLATE",
      }),
    );
  });
});
