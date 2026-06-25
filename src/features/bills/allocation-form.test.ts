import { describe, expect, it } from "vitest";

import { evaluateAllocationForm } from "./allocation-form";

const participants = [
  {
    participantId: "p1",
    amount: "3",
    percentage: "25",
    shares: "2",
  },
  {
    participantId: "p2",
    amount: "5",
    percentage: "75",
    shares: "1",
  },
];

describe("evaluateAllocationForm", () => {
  it("preserves exact Custom Amount feedback", () => {
    expect(
      evaluateAllocationForm({
        strategy: "custom",
        totalAmount: "10",
        creatorShareAmount: "2",
        assetScale: 6,
        participants,
      }),
    ).toMatchObject({
      status: "exact",
      allocation: { strategy: "custom" },
      participantUnits: { p1: "3000000", p2: "5000000" },
    });
  });

  it("previews equal, percentage, and share allocations", () => {
    expect(
      evaluateAllocationForm({
        strategy: "equal",
        totalAmount: "10",
        creatorShareAmount: "2",
        assetScale: 6,
        participants,
      }),
    ).toMatchObject({
      status: "exact",
      participantUnits: { p1: "4000000", p2: "4000000" },
    });

    expect(
      evaluateAllocationForm({
        strategy: "percentage",
        totalAmount: "10",
        creatorShareAmount: "2",
        assetScale: 6,
        participants,
      }),
    ).toMatchObject({
      status: "exact",
      allocation: {
        strategy: "percentage",
        percentageScale: 2,
        percentages: [
          { participantId: "p1", units: "2500" },
          { participantId: "p2", units: "7500" },
        ],
      },
      participantUnits: { p1: "2000000", p2: "6000000" },
    });

    expect(
      evaluateAllocationForm({
        strategy: "shares",
        totalAmount: "11",
        creatorShareAmount: "2",
        assetScale: 6,
        participants,
      }),
    ).toMatchObject({
      status: "exact",
      participantUnits: { p1: "6000000", p2: "3000000" },
    });
  });

  it("separates incomplete, invalid, and explicit-remainder states", () => {
    expect(
      evaluateAllocationForm({
        strategy: "percentage",
        totalAmount: "10",
        creatorShareAmount: "2",
        assetScale: 6,
        participants: participants.map((participant) => ({
          ...participant,
          percentage: "40",
        })),
      }),
    ).toMatchObject({ status: "invalid" });

    expect(
      evaluateAllocationForm({
        strategy: "shares",
        totalAmount: "10",
        creatorShareAmount: "0",
        assetScale: 0,
        participants,
      }),
    ).toMatchObject({ status: "needs_remainder" });

    expect(
      evaluateAllocationForm({
        strategy: "custom",
        totalAmount: "",
        creatorShareAmount: "",
        assetScale: 6,
        participants,
      }),
    ).toMatchObject({ status: "incomplete" });
  });
});
