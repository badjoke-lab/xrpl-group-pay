import { describe, expect, it } from "vitest";

import {
  billAssetWriteValues,
  INSERT_ASSET_AWARE_BILL,
  INSERT_ASSET_AWARE_SLOT,
  slotAssetWriteValues,
  TESTNET_XRP_WRITE_ASSET,
} from "./bill-write-contract";

describe("asset-aware Bill write contract", () => {
  it("binds the complete Testnet XRP settlement identity", () => {
    expect(TESTNET_XRP_WRITE_ASSET).toMatchObject({
      id: "xrpl:testnet:xrp",
      network: "testnet",
      assetType: "native",
      currency: "XRP",
      issuer: null,
      precision: 6,
    });
    expect(billAssetWriteValues("10000000", "2000000")).toEqual([
      "xrpl-group-pay:bill-settlement:v1",
      "xrpl:testnet:xrp",
      "native",
      "XRP",
      null,
      6,
      "10000000",
      "2000000",
    ]);
  });

  it("binds generic slot units alongside the legacy XRP value", () => {
    expect(slotAssetWriteValues("3000000")).toEqual([
      "xrpl-group-pay:payment-slot:v1",
      "xrpl:testnet:xrp",
      "native",
      "XRP",
      null,
      6,
      "3000000",
    ]);
  });

  it("writes versioned Asset columns explicitly", () => {
    expect(INSERT_ASSET_AWARE_BILL).toContain("settlement_asset_id");
    expect(INSERT_ASSET_AWARE_BILL).toContain("total_amount_units");
    expect(INSERT_ASSET_AWARE_SLOT).toContain("payment_contract_version");
    expect(INSERT_ASSET_AWARE_SLOT).toContain("expected_amount_units");
  });
});
