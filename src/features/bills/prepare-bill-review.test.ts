import { describe, expect, it } from "vitest";

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

describe("prepareBillReview", () => {
  it("normalizes the exact conditions that will later be frozen", () => {
    expect(prepareBillReview(validInput)).toEqual({
      network: "testnet",
      title: "Dinner",
      destinationAddress: validInput.destinationAddress,
      destinationTag: 7,
      totalDrops: "10000000",
      creatorShareDrops: "2000000",
      allocatedDrops: "10000000",
      participants: [
        {
          participantLabel: "Alex",
          expectedPayerAddress:
            validInput.participants[0].expectedPayerAddress,
          expectedAmountDrops: "3000000",
        },
        {
          participantLabel: null,
          expectedPayerAddress:
            validInput.participants[1].expectedPayerAddress,
          expectedAmountDrops: "5000000",
        },
      ],
    });
  });

  it("rejects invalid addresses and non-exact allocations", () => {
    expect(() =>
      prepareBillReview({ ...validInput, destinationAddress: "invalid" }),
    ).toThrow(BillInputError);
    expect(() =>
      prepareBillReview({ ...validInput, totalXrp: "11" }),
    ).toThrow("Creator share and participant amounts must equal the bill total.");
  });
});
