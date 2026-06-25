import { describe, expect, it } from "vitest";

import {
  assetDescriptorFromPersistedRow,
  persistedSlotObligationRowSchema,
} from "./asset-records";

const xrp = {
  asset_id: "xrpl:testnet:xrp",
  asset_type: "native" as const,
  currency_code: "XRP",
  issuer: null,
  amount_scale: 6,
};

describe("asset persistence", () => {
  it("parses an XRP slot obligation", () => {
    expect(
      persistedSlotObligationRowSchema.parse({
        ...xrp,
        payment_contract_version: "xrpl-group-pay:payment-slot:v1",
        expected_amount_units: "3000000",
      }),
    ).toBeDefined();
  });

  it("reconstructs the XRP Asset descriptor", () => {
    expect(assetDescriptorFromPersistedRow("testnet", xrp)).toMatchObject({
      id: "xrpl:testnet:xrp",
      currency: "XRP",
      issuer: null,
      precision: 6,
    });
  });
});
