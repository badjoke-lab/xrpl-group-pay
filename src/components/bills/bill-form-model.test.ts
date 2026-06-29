import { describe, expect, it } from "vitest";

import { billDraftToInput, newBillDraft } from "./bill-form-model";

describe("deployment-aware Bill drafts", () => {
  it("defaults to Testnet XRP for local and Testnet deployments", () => {
    expect(newBillDraft().settlementAssetId).toBe("xrpl:testnet:xrp");
    expect(newBillDraft("testnet").settlementAssetId).toBe("xrpl:testnet:xrp");
  });

  it("starts Mainnet drafts with the canonical Mainnet XRP Asset", () => {
    const draft = newBillDraft("mainnet");
    expect(draft.settlementAssetId).toBe("xrpl:mainnet:xrp");
  });

  it("preserves a canonical Mainnet RLUSD Asset in creation input", () => {
    const draft = newBillDraft("mainnet");
    draft.title = "Dinner";
    draft.destinationAddress = "rDestination";
    draft.settlementAssetId = "xrpl:mainnet:rlusd";
    draft.totalAmount = "2";
    draft.creatorShareAmount = "0";
    draft.participants[0].expectedPayerAddress = "rPayerOne";
    draft.participants[0].amount = "1";
    draft.participants[1].expectedPayerAddress = "rPayerTwo";
    draft.participants[1].amount = "1";

    expect(
      billDraftToInput({
        draft,
        includeRemainder: false,
      }),
    ).toMatchObject({
      settlementAssetId: "xrpl:mainnet:rlusd",
      totalAmount: "2",
      creatorShareAmount: "0",
      allocation: { strategy: "custom" },
    });
  });
});
