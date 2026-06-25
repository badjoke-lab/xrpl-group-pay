import { describe, expect, it } from "vitest";

import { BillInputError, prepareBillReview } from "./create-bill";

const destinationAddress = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const payers = [
  "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
  "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
];

function baseInput() {
  return {
    title: "Dinner",
    destinationAddress,
    settlementAssetId: "xrpl:testnet:xrp" as const,
    totalAmount: "10",
    creatorShareAmount: "1",
    participants: payers.map((expectedPayerAddress, index) => ({
      participantId: `p${index + 1}`,
      label: `P${index + 1}`,
      expectedPayerAddress,
    })),
  };
}

describe("prepareBillReview allocation integration", () => {
  it("recomputes equal obligations on the server", () => {
    const review = prepareBillReview({
      ...baseInput(),
      allocation: { strategy: "equal" },
    });

    expect(review.creatorShareAmount.units).toBe("1000000");
    expect(review.participants.map((item) => item.expectedAmount.units)).toEqual([
      "3000000",
      "3000000",
      "3000000",
    ]);
    expect(review.allocatedAmount.units).toBe("10000000");
  });

  it("applies an explicit equal-allocation remainder to the creator", () => {
    const review = prepareBillReview({
      ...baseInput(),
      totalAmount: "0.000010",
      creatorShareAmount: "0",
      allocation: {
        strategy: "equal",
        remainderAssignment: { kind: "creator" },
      },
    });

    expect(review.creatorShareAmount.units).toBe("1");
    expect(review.participants.map((item) => item.expectedAmount.units)).toEqual([
      "3",
      "3",
      "3",
    ]);
  });

  it("allocates by exact percentage units", () => {
    const input = baseInput();
    const review = prepareBillReview({
      ...input,
      participants: input.participants.slice(0, 2),
      creatorShareAmount: "2",
      allocation: {
        strategy: "percentage",
        percentageScale: 2,
        percentages: [
          { participantId: "p1", units: "2500" },
          { participantId: "p2", units: "7500" },
        ],
      },
    });

    expect(review.participants.map((item) => item.expectedAmount.units)).toEqual([
      "2000000",
      "6000000",
    ]);
  });

  it("allocates by positive shares", () => {
    const input = baseInput();
    const review = prepareBillReview({
      ...input,
      participants: input.participants.slice(0, 2),
      allocation: {
        strategy: "shares",
        shares: [
          { participantId: "p1", units: "2" },
          { participantId: "p2", units: "1" },
        ],
      },
    });

    expect(review.participants.map((item) => item.expectedAmount.units)).toEqual([
      "6000000",
      "3000000",
    ]);
  });

  it("uses selected participant IDs for deterministic remainder assignment", () => {
    const review = prepareBillReview({
      ...baseInput(),
      totalAmount: "0.000010",
      creatorShareAmount: "0",
      allocation: {
        strategy: "equal",
        remainderAssignment: {
          kind: "selected_participant",
          participantId: "p3",
        },
      },
    });

    expect(review.participants.map((item) => item.expectedAmount.units)).toEqual([
      "3",
      "3",
      "4",
    ]);
  });

  it("rejects client amount fields for non-custom strategies", () => {
    const input = baseInput();
    expect(() =>
      prepareBillReview({
        ...input,
        participants: input.participants.map((participant) => ({
          ...participant,
          amount: "3",
        })),
        allocation: { strategy: "equal" },
      }),
    ).toThrow(
      "Participant amount fields are only accepted for Custom Amount allocation.",
    );
  });

  it("requires custom amounts and complete strategy participant coverage", () => {
    expect(() =>
      prepareBillReview({
        ...baseInput(),
        allocation: { strategy: "custom" },
      }),
    ).toThrow(
      "Every participant requires an amount for Custom Amount allocation.",
    );

    const input = baseInput();
    expect(() =>
      prepareBillReview({
        ...input,
        participants: input.participants.slice(0, 2),
        allocation: {
          strategy: "shares",
          shares: [
            { participantId: "p1", units: "1" },
            { participantId: "unknown", units: "1" },
          ],
        },
      }),
    ).toThrow(BillInputError);
  });
});
