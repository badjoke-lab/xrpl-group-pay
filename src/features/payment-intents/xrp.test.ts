import { describe, expect, it } from "vitest";

import { getXrpAssetDescriptor } from "@/features/assets/registry";

import { paymentIntentSchema } from "./types";
import { createXrpPaymentIntent, PaymentIntentError } from "./xrp";

const DESTINATION = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const PAYER = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const INVOICE_ID = "AB".repeat(32);

function input() {
  return {
    paymentSlotId: "00000000-0000-4000-8000-000000000001",
    network: "testnet" as const,
    amountDrops: "4000001",
    destination: DESTINATION,
    destinationTag: 9,
    sourceTag: 123456,
    invoiceId: INVOICE_ID,
    expectedPayer: PAYER,
    revision: 2,
    now: new Date("2026-06-24T00:00:00.000Z"),
  };
}

describe("createXrpPaymentIntent", () => {
  it("creates a wallet-neutral frozen XRP intent", () => {
    expect(createXrpPaymentIntent(input())).toEqual({
      intentId:
        "payment-slot:00000000-0000-4000-8000-000000000001:revision:2",
      paymentSlotId: "00000000-0000-4000-8000-000000000001",
      paymentRail: "xrpl",
      network: "testnet",
      asset: getXrpAssetDescriptor("testnet"),
      amount: { code: "XRP", units: "4000001", scale: 6 },
      destination: DESTINATION,
      destinationTag: 9,
      sourceTag: 123456,
      invoiceId: INVOICE_ID,
      expectedPayer: PAYER,
      expiresAt: "2026-06-24T00:05:00.000Z",
      revision: 2,
    });
  });

  it("keeps Testnet and Mainnet Asset identity separate", () => {
    const mainnet = createXrpPaymentIntent({
      ...input(),
      network: "mainnet",
    });
    expect(mainnet.asset).toEqual(getXrpAssetDescriptor("mainnet"));
    expect(mainnet.asset.id).not.toBe(getXrpAssetDescriptor("testnet").id);
  });

  it("rejects invalid amount, address, tag, and lifetime fields", () => {
    expect(() =>
      createXrpPaymentIntent({ ...input(), amountDrops: "0" }),
    ).toThrow(PaymentIntentError);
    expect(() =>
      createXrpPaymentIntent({ ...input(), destination: "not-an-address" }),
    ).toThrow(PaymentIntentError);
    expect(() =>
      createXrpPaymentIntent({ ...input(), sourceTag: -1 }),
    ).toThrow(PaymentIntentError);
    expect(() =>
      createXrpPaymentIntent({ ...input(), ttlSeconds: 0 }),
    ).toThrow(PaymentIntentError);
  });

  it("rejects an Asset and network mismatch", () => {
    const intent = createXrpPaymentIntent(input());
    expect(
      paymentIntentSchema.safeParse({
        ...intent,
        asset: getXrpAssetDescriptor("mainnet"),
      }).success,
    ).toBe(false);
  });
});
