import { describe, expect, it } from "vitest";

import { getXrpAssetDescriptor } from "@/features/assets/registry";
import { paymentDetailsSchema } from "@/features/bills/payment-details";

const base = {
  billTitle: "Controlled Mainnet XRP acceptance",
  participantLabel: "Primary acceptance",
  expectedPayerAddress: "rsMuUUdLC1wxrJ2DvQnTrnKGRhVxoLrhEj",
  destinationAddress: "rECPk8UQrbFcqAhPfy1g8UN5RyCrb42GTp",
  destinationTag: null,
  sourceTag: 2_171_267_705,
  invoiceId: "A".repeat(64),
};

describe("paymentDetailsSchema network handling", () => {
  it("accepts canonical Mainnet XRP payment details", () => {
    const asset = getXrpAssetDescriptor("mainnet");

    const result = paymentDetailsSchema.parse({
      ...base,
      network: "mainnet",
      asset,
      amount: { code: "XRP", units: "1", scale: 6 },
      amountDrops: "1",
    });

    expect(result.network).toBe("mainnet");
    expect(result.asset.id).toBe("xrpl:mainnet:xrp");
    expect(result.amount.units).toBe("1");
  });

  it("rejects an Asset whose network does not match the payment network", () => {
    const asset = getXrpAssetDescriptor("testnet");

    expect(() =>
      paymentDetailsSchema.parse({
        ...base,
        network: "mainnet",
        asset,
        amount: { code: "XRP", units: "1", scale: 6 },
        amountDrops: "1",
      }),
    ).toThrow();
  });

  it("keeps the legacy XRP details format testnet-only", () => {
    const legacy = {
      ...base,
      network: "testnet",
      amountDrops: "1",
    };

    expect(paymentDetailsSchema.parse(legacy).network).toBe("testnet");
    expect(() =>
      paymentDetailsSchema.parse({ ...legacy, network: "mainnet" }),
    ).toThrow();
  });
});
