import { classicAddressToXAddress } from "xrpl";
import { describe, expect, it } from "vitest";

import {
  buildTestnetPaymentPayload,
  createInvoiceId,
  PaymentInputError,
} from "./payment-request";

const DESTINATION = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

describe("buildTestnetPaymentPayload", () => {
  it("builds a Testnet-only XRP Payment with separate SourceTag and InvoiceID", () => {
    const invoiceId = "AB".repeat(32);
    const payload = buildTestnetPaymentPayload(
      { destination: DESTINATION, amountXrp: "4.000001", destinationTag: "9" },
      123456,
      invoiceId,
    );

    expect(payload).toEqual({
      txjson: {
        TransactionType: "Payment",
        Destination: DESTINATION,
        Amount: "4000001",
        SourceTag: 123456,
        InvoiceID: invoiceId,
        DestinationTag: 9,
      },
      options: { submit: true, expire: 5, force_network: "TESTNET" },
    });
  });

  it("rejects invalid addresses, X-Addresses, and zero amounts", () => {
    expect(() =>
      buildTestnetPaymentPayload(
        { destination: "not-an-address", amountXrp: "1" },
        1,
      ),
    ).toThrow(PaymentInputError);

    expect(() =>
      buildTestnetPaymentPayload(
        {
          destination: classicAddressToXAddress(DESTINATION, 9, true),
          amountXrp: "1",
        },
        1,
      ),
    ).toThrow(/classic XRPL address/);

    expect(() =>
      buildTestnetPaymentPayload(
        { destination: DESTINATION, amountXrp: "0" },
        1,
      ),
    ).toThrow(/greater than zero/);
  });

  it("creates a 256-bit uppercase InvoiceID", () => {
    expect(createInvoiceId(new Uint8Array(32).fill(15))).toBe("0F".repeat(32));
  });
});
