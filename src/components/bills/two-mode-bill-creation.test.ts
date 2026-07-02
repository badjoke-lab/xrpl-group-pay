import { beforeEach, describe, expect, it } from "vitest";

import { prepareBillReview } from "@/features/bills/create-bill";

import {
  billDetailsAreComplete,
  payerAddressIssues,
  recipientFundedAmountIssue,
} from "./bill-creation-validation";
import {
  clearBillDraftSession,
  readBillDraftSession,
  writeBillDraftSession,
} from "./bill-draft-session";
import {
  billDraftToInput,
  newBillDraft,
  type BillDraft,
} from "./bill-form-model";

const recipient = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const payerOne = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const payerTwo = "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH";

function completeDraft(mode: "representative" | "direct"): BillDraft {
  const draft = newBillDraft("testnet");
  draft.paymentMode = mode;
  draft.recipientLabel = mode === "direct" ? "Venue" : "Alex";
  draft.title = "Dinner";
  draft.destinationAddress = recipient;
  draft.totalAmount = "10";
  draft.allocationStrategy = "custom";
  draft.recipientFundedEnabled = mode === "representative";
  draft.recipientFundedAmount = mode === "representative" ? "2" : "0";
  draft.creatorShareAmount = draft.recipientFundedAmount;
  draft.participants[0].label = "Payer one";
  draft.participants[0].expectedPayerAddress = payerOne;
  draft.participants[0].amount = mode === "representative" ? "3" : "4";
  draft.participants[1].label = "Payer two";
  draft.participants[1].expectedPayerAddress = payerTwo;
  draft.participants[1].amount = mode === "representative" ? "5" : "6";
  return draft;
}

describe("two-mode Bill inputs", () => {
  it("creates a server-valid representative review request", () => {
    const draft = completeDraft("representative");
    const input = billDraftToInput({ draft, includeRemainder: false });
    const review = prepareBillReview(input);

    expect(review.paymentMode).toBe("representative");
    expect(review.recipientLabel).toBe("Alex");
    expect(review.recipientFundedAmount.units).toBe("2000000");
    expect(review.participants.map((item) => item.expectedAmount.units)).toEqual([
      "3000000",
      "5000000",
    ]);
  });

  it("creates a server-valid direct-recipient review request", () => {
    const draft = completeDraft("direct");
    draft.recipientFundedEnabled = true;
    draft.recipientFundedAmount = "9";
    draft.creatorShareAmount = "9";

    const input = billDraftToInput({ draft, includeRemainder: false });
    const review = prepareBillReview(input);

    expect(review.paymentMode).toBe("direct");
    expect(review.recipientLabel).toBe("Venue");
    expect(review.recipientFundedAmount.units).toBe("0");
    expect(review.participants.map((item) => item.expectedAmount.units)).toEqual([
      "4000000",
      "6000000",
    ]);
  });
});

describe("two-mode draft validation", () => {
  it("enforces unique payer addresses and recipient separation", () => {
    const draft = completeDraft("direct");
    draft.participants[0].expectedPayerAddress = recipient;
    draft.participants[1].expectedPayerAddress = recipient;

    expect(payerAddressIssues(draft)).toEqual({
      [draft.participants[0].id]: "recipient_conflict",
      [draft.participants[1].id]: "recipient_conflict",
    });

    draft.participants[0].expectedPayerAddress = payerOne;
    draft.participants[1].expectedPayerAddress = payerOne;
    expect(payerAddressIssues(draft)).toEqual({
      [draft.participants[0].id]: "duplicate",
      [draft.participants[1].id]: "duplicate",
    });
  });

  it("requires a positive representative-funded amount below the total", () => {
    const draft = completeDraft("representative");
    const asset = {
      id: "xrpl:testnet:xrp",
      paymentRail: "xrpl",
      network: "testnet",
      symbol: "XRP",
      assetType: "native",
      precision: 6,
    } as const;

    draft.recipientFundedAmount = "0";
    expect(recipientFundedAmountIssue(draft, asset)).toBe("not_positive");
    draft.recipientFundedAmount = "10";
    expect(recipientFundedAmountIssue(draft, asset)).toBe("not_less_than_total");
    draft.recipientFundedAmount = "2";
    expect(recipientFundedAmountIssue(draft, asset)).toBeNull();
    expect(billDetailsAreComplete(draft, asset)).toBe(true);
  });
});

describe("session Bill drafts", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("restores draft values and the current step until explicitly cleared", () => {
    const draft = completeDraft("direct");
    writeBillDraftSession("testnet", draft, 3);

    expect(readBillDraftSession("testnet")).toMatchObject({
      step: 3,
      draft: {
        paymentMode: "direct",
        recipientLabel: "Venue",
        destinationAddress: recipient,
        totalAmount: "10",
      },
    });

    clearBillDraftSession("testnet");
    expect(readBillDraftSession("testnet")).toBeNull();
  });

  it("does not restore a Testnet draft into Mainnet", () => {
    writeBillDraftSession("testnet", completeDraft("representative"), 2);
    expect(readBillDraftSession("mainnet")).toBeNull();
  });
});
