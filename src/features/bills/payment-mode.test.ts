import { describe, expect, it } from "vitest";

import {
  BillInputError,
  prepareBillReview,
} from "./create-bill";

const recipient = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const payerA = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const payerB = "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH";

function directInput() {
  return {
    title: "Direct booking payment",
    paymentMode: "direct" as const,
    recipientLabel: "Booking provider",
    destinationAddress: recipient,
    settlementAssetId: "xrpl:testnet:xrp" as const,
    totalAmount: "8",
    recipientFundedAmount: "0",
    allocation: { strategy: "custom" as const },
    participants: [
      {
        label: "A",
        expectedPayerAddress: payerA,
        amount: "3",
      },
      {
        label: "B",
        expectedPayerAddress: payerB,
        amount: "5",
      },
    ],
  };
}

describe("Bill payment modes", () => {
  it("normalizes a direct-recipient Bill with no recipient-funded amount", () => {
    expect(prepareBillReview(directInput())).toMatchObject({
      paymentMode: "direct",
      recipientLabel: "Booking provider",
      destinationAddress: recipient,
      recipientFundedAmount: {
        code: "XRP",
        units: "0",
        scale: 6,
      },
      creatorShareAmount: {
        code: "XRP",
        units: "0",
        scale: 6,
      },
      participants: [
        expect.objectContaining({ expectedPayerAddress: payerA }),
        expect.objectContaining({ expectedPayerAddress: payerB }),
      ],
    });
  });

  it("rejects a direct-recipient Bill with a recipient-funded amount", () => {
    expect(() =>
      prepareBillReview({
        ...directInput(),
        recipientFundedAmount: "1",
      }),
    ).toThrow(BillInputError);
  });

  it("rejects creator remainder assignment in direct mode", () => {
    expect(() =>
      prepareBillReview({
        ...directInput(),
        totalAmount: "0.000003",
        allocation: {
          strategy: "equal" as const,
          remainderAssignment: { kind: "creator" as const },
        },
        participants: [
          { expectedPayerAddress: payerA },
          { expectedPayerAddress: payerB },
        ],
      }),
    ).toThrow(BillInputError);
  });

  it("rejects duplicate expected payer addresses", () => {
    expect(() =>
      prepareBillReview({
        ...directInput(),
        participants: [
          {
            expectedPayerAddress: payerA,
            amount: "3",
          },
          {
            expectedPayerAddress: payerA,
            amount: "5",
          },
        ],
      }),
    ).toThrow(BillInputError);
  });

  it("rejects the recipient address as an expected payer", () => {
    expect(() =>
      prepareBillReview({
        ...directInput(),
        participants: [
          {
            expectedPayerAddress: recipient,
            amount: "3",
          },
          {
            expectedPayerAddress: payerB,
            amount: "5",
          },
        ],
      }),
    ).toThrow(BillInputError);
  });

  it("keeps the existing canonical creator-share field as a representative compatibility input", () => {
    expect(
      prepareBillReview({
        title: "Representative collection",
        destinationAddress: recipient,
        settlementAssetId: "xrpl:testnet:xrp",
        totalAmount: "10",
        creatorShareAmount: "2",
        allocation: { strategy: "custom" },
        participants: [
          {
            expectedPayerAddress: payerA,
            amount: "3",
          },
          {
            expectedPayerAddress: payerB,
            amount: "5",
          },
        ],
      }),
    ).toMatchObject({
      paymentMode: "representative",
      recipientFundedAmount: { units: "2000000" },
      creatorShareAmount: { units: "2000000" },
    });
  });
});
