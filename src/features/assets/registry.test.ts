import { describe, expect, it } from "vitest";

import {
  RLUSD_CURRENCY_HEX,
  RLUSD_ISSUERS,
  XRPL_RLUSD_ASSET_IDS,
} from "./rlusd";
import {
  AssetRegistry,
  AssetRegistryError,
  assetRegistry,
  getRlusdAssetDescriptor,
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
  it("registers XRP and RLUSD descriptors per network", () => {
    expect(assetRegistry.list()).toHaveLength(4);
    expect(getXrpAssetDescriptor("testnet")).toMatchObject({
      id: XRPL_XRP_ASSET_IDS.testnet,
      assetType: "native",
      currency: "XRP",
      issuer: null,
      precision: 6,
    });
    expect(getRlusdAssetDescriptor("testnet")).toMatchObject({
      id: XRPL_RLUSD_ASSET_IDS.testnet,
      assetType: "issued",
      currency: RLUSD_CURRENCY_HEX,
      issuer: RLUSD_ISSUERS.testnet,
      symbol: "RLUSD",
    });
    expect(getRlusdAssetDescriptor("mainnet").issuer).toBe(RLUSD_ISSUERS.mainnet);
  });

  it("filters without merging network or issuer identity", () => {
    expect(assetRegistry.list({ network: "testnet" })).toHaveLength(2);
    expect(assetRegistry.list({ assetType: "issued" })).toHaveLength(2);
  });

  it("fails closed for an unknown Asset ID", () => {
    expect(() => assetRegistry.require("xrpl:testnet:unknown")).toThrow(AssetRegistryError);
  });

  it("rejects duplicate IDs and semantic identities", () => {
    expect(() => new AssetRegistry([issuedAsset, issuedAsset])).toThrow("Duplicate Asset ID");
    expect(() => new AssetRegistry([
      issuedAsset,
      { ...issuedAsset, id: "xrpl:testnet:second-test-usd" },
    ])).toThrow("Duplicate Asset identity");
  });

  it("enforces native and issued descriptor boundaries", () => {
    expect(assetDescriptorSchema.safeParse({
      ...getXrpAssetDescriptor("testnet"),
      issuer: issuedAsset.issuer,
    }).success).toBe(false);
    expect(assetDescriptorSchema.parse(issuedAsset)).toEqual(issuedAsset);
  });
});
