import { describe, expect, it } from "vitest";

import { getXrpAssetDescriptor } from "@/features/assets/registry";

import { BillInputError, prepareBillReview } from "./create-bill";

const validInput = {
  title: "  Dinner  ",
  destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  destinationTag: "7",
  totalXrp: "10",
  creatorShareXrp: "2",
  participants: [
    {
      label: " Alex ",
      expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      amountXrp: "3",
    },
    {
      expectedPayerAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
      amountXrp: "5",
    },
  ],
};

const asset = getXrpAssetDescriptor("testnet");

describe("prepareBillReview", () => {
  it("normalizes the Asset conditions that will later be frozen", () => {
    expect(prepareBillReview(validInput)).toEqual({
      network: "testnet",
      title: "Dinner",
      destinationAddress: validInput.destinationAddress,
      destinationTag: 7,
      asset,
      totalAmount: { code: "XRP", units: "10000000", scale: 6 },
      creatorShareAmount: { code: "XRP", units: "2000000", scale: 6 },
      allocatedAmount: { code: "XRP", units: "10000000", scale: 6 },
      totalDrops: "10000000",
      creatorShareDrops: "2000000",
      allocatedDrops: "10000000",
      participants: [
        {
          participantLabel: "Alex",
          expectedPayerAddress:
            validInput.participants[0].expectedPayerAddress,
          expectedAmount: { code: "XRP", units: "3000000", scale: 6 },
          expectedAmountDrops: "3000000",
        },
        {
          participantLabel: null,
          expectedPayerAddress:
            validInput.participants[1].expectedPayerAddress,
          expectedAmount: { code: "XRP", units: "5000000", scale: 6 },
          expectedAmountDrops: "5000000",
        },
      ],
    });
  });

  it("rejects invalid addresses and non-exact custom allocations", () => {
    expect(() =>
      prepareBillReview({ ...validInput, destinationAddress: "invalid" }),
    ).toThrow(BillInputError);
    expect(() =>
      prepareBillReview({ ...validInput, totalXrp: "11" }),
    ).toThrow(
      "Creator share and custom participant amounts must equal the Bill total.",
    );
  });
});
