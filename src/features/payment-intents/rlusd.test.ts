import { describe, expect, it } from "vitest";

import {
  RLUSD_CURRENCY_HEX,
  RLUSD_ISSUERS,
} from "@/features/assets/rlusd";

import { createRlusdPaymentIntent } from "./rlusd";

const DESTINATION = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const PAYER = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const INVOICE_ID = "AB".repeat(32);

describe("createRlusdPaymentIntent", () => {
  it("freezes official Testnet RLUSD identity and exact units", () => {
    const intent = createRlusdPaymentIntent({
      paymentSlotId: "slot-rlusd-1",
      network: "testnet",
      amountUnits: "1250000",
      destination: DESTINATION,
      destinationTag: 9,
      sourceTag: 123456,
      invoiceId: INVOICE_ID,
      expectedPayer: PAYER,
      now: new Date("2026-06-25T00:00:00.000Z"),
    });

    expect(intent).toMatchObject({
      network: "testnet",
      asset: {
        assetType: "issued",
        currency: RLUSD_CURRENCY_HEX,
        issuer: RLUSD_ISSUERS.testnet,
        symbol: "RLUSD",
      },
      amount: { code: "RLUSD", units: "1250000", scale: 6 },
      expiresAt: "2026-06-25T00:05:00.000Z",
    });
  });

  it("uses a different official issuer on Mainnet", () => {
    const intent = createRlusdPaymentIntent({
      paymentSlotId: "slot-rlusd-2",
      network: "mainnet",
      amountUnits: "1",
      destination: DESTINATION,
      destinationTag: null,
      sourceTag: 1,
      invoiceId: INVOICE_ID,
      expectedPayer: PAYER,
    });

    expect(intent.asset.issuer).toBe(RLUSD_ISSUERS.mainnet);
  });
});
