import { describe, expect, it } from "vitest";

import {
  AssetRegistry,
  AssetRegistryError,
  assetRegistry,
  getXrpAssetDescriptor,
  XRPL_XRP_ASSET_IDS,
} from "./registry";
import { assetDescriptorSchema } from "./types";

const issuedAsset = {
  id: "xrpl:testnet:test-usd",
  paymentRail: "xrpl",
  network: "testnet",
  assetType: "issued",
  currency: "USD",
  issuer: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  precision: 6,
  symbol: "USD",
  verificationStrategy: "xrpl-issued-asset-v1",
  receiptContract: "xrpl-issued-payment-v1",
} as const;


describe("AssetRegistry", () => {
  it("registers separate XRP descriptors for Testnet and Mainnet", () => {
    expect(assetRegistry.list()).toHaveLength(2);
    expect(getXrpAssetDescriptor("testnet")).toMatchObject({
      id: XRPL_XRP_ASSET_IDS.testnet,
      network: "testnet",
      assetType: "native",
      currency: "XRP",
      issuer: null,
      precision: 6,
    });
    expect(getXrpAssetDescriptor("mainnet").id).toBe(
      XRPL_XRP_ASSET_IDS.mainnet,
    );
  });

  it("filters assets without merging network identity", () => {
    expect(assetRegistry.list({ network: "testnet" })).toHaveLength(1);
    expect(assetRegistry.list({ assetType: "issued" })).toEqual([]);
  });

  it("fails closed for an unknown Asset ID", () => {
    expect(() => assetRegistry.require("xrpl:testnet:unknown")).toThrow(
      AssetRegistryError,
    );
  });

  it("rejects duplicate IDs and duplicate semantic identities", () => {
    expect(() => new AssetRegistry([issuedAsset, issuedAsset])).toThrow(
      "Duplicate Asset ID",
    );
    expect(
      () =>
        new AssetRegistry([
          issuedAsset,
          { ...issuedAsset, id: "xrpl:testnet:second-test-usd" },
        ]),
    ).toThrow("Duplicate Asset identity");
  });

  it("enforces native and issued descriptor boundaries", () => {
    expect(
      assetDescriptorSchema.safeParse({
        ...getXrpAssetDescriptor("testnet"),
        issuer: issuedAsset.issuer,
      }).success,
    ).toBe(false);
    expect(assetDescriptorSchema.parse(issuedAsset)).toEqual(issuedAsset);
  });
});
