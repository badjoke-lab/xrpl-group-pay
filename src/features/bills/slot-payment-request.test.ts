import { describe, expect, it } from "vitest";

import type { ResolvedPaymentSlot } from "./payment-slot";
import {
  buildStoredSlotPaymentIntent,
  buildStoredSlotPaymentPayload,
} from "./slot-payment-request";

const DESTINATION = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const PAYER = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const INVOICE_ID = "AB".repeat(32);

const slot: ResolvedPaymentSlot = {
  slotId: "slot-1",
  slotPublicId: "00000000-0000-4000-8000-000000000001",
  billId: "bill-1",
  billPublicId: "00000000-0000-4000-8000-000000000002",
  billTitle: "Dinner",
  network: "testnet",
  destinationAddress: DESTINATION,
  destinationTag: 9,
  participantLabel: "Alex",
  expectedPayerAddress: PAYER,
  expectedAmountDrops: "4000001",
  invoiceId: INVOICE_ID,
  slotStatus: "unpaid",
  billStatus: "open",
  paidTransactionId: null,
};

const now = new Date("2026-06-24T00:00:00.000Z");

describe("stored slot Payment Intent", () => {
  it("derives a frozen wallet-neutral intent from server state", () => {
    expect(buildStoredSlotPaymentIntent(slot, 123456, now)).toMatchObject({
      paymentSlotId: slot.slotPublicId,
      network: "testnet",
      amount: { code: "XRP", units: "4000001", scale: 6 },
      destination: DESTINATION,
      destinationTag: 9,
      sourceTag: 123456,
      invoiceId: INVOICE_ID,
      expectedPayer: PAYER,
      revision: 1,
      expiresAt: "2026-06-24T00:05:00.000Z",
    });
  });

  it("preserves the existing Xaman Testnet request shape", () => {
    expect(buildStoredSlotPaymentPayload(slot, 123456, now)).toEqual({
      txjson: {
        TransactionType: "Payment",
        Destination: DESTINATION,
        Amount: "4000001",
        SourceTag: 123456,
        InvoiceID: INVOICE_ID,
        DestinationTag: 9,
      },
      options: { submit: true, expire: 5, force_network: "TESTNET" },
    });
  });

  it("fails closed for an invalid configured Source Tag", () => {
    expect(() => buildStoredSlotPaymentIntent(slot, -1, now)).toThrow(
      "Source Tag must be a UInt32 value.",
    );
  });
});
