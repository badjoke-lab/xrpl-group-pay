import { describe, expect, it } from "vitest";

import {
  listApprovedMainnetSettlementAssets,
  MainnetAssetRegistryError,
  requireApprovedMainnetSettlementAsset,
} from "./mainnet-registry";
import {
  RLUSD_CURRENCY_HEX,
  RLUSD_ISSUERS,
  XRPL_RLUSD_ASSET_IDS,
} from "./rlusd";
import { XRPL_XRP_ASSET_IDS } from "./registry";

const access = {
  network: "mainnet" as const,
  mainnetGateApproved: true as const,
};

describe("Mainnet Settlement Asset registry", () => {
  it("fails closed without explicit Mainnet gate approval", () => {
    expect(() => listApprovedMainnetSettlementAssets()).toThrow(
      MainnetAssetRegistryError,
    );
    expect(() =>
      requireApprovedMainnetSettlementAsset(XRPL_XRP_ASSET_IDS.mainnet),
    ).toThrow("explicitly approved Mainnet gate");
  });

  it("returns only canonical Mainnet XRP and RLUSD identities", () => {
    expect(listApprovedMainnetSettlementAssets(access)).toEqual([
      expect.objectContaining({
        id: XRPL_XRP_ASSET_IDS.mainnet,
        network: "mainnet",
        assetType: "native",
        currency: "XRP",
        issuer: null,
        precision: 6,
      }),
      expect.objectContaining({
        id: XRPL_RLUSD_ASSET_IDS.mainnet,
        network: "mainnet",
        assetType: "issued",
        currency: RLUSD_CURRENCY_HEX,
        issuer: RLUSD_ISSUERS.mainnet,
        precision: 6,
      }),
    ]);
  });

  it("rejects Testnet and unknown Asset IDs", () => {
    expect(() =>
      requireApprovedMainnetSettlementAsset(
        XRPL_RLUSD_ASSET_IDS.testnet,
        access,
      ),
    ).toThrow("not approved");
    expect(() =>
      requireApprovedMainnetSettlementAsset("xrpl:mainnet:unknown", access),
    ).toThrow("not approved");
  });

  it("returns frozen canonical descriptors", () => {
    const asset = requireApprovedMainnetSettlementAsset(
      XRPL_RLUSD_ASSET_IDS.mainnet,
      access,
    );
    expect(Object.isFrozen(asset)).toBe(true);
    expect(asset).toMatchObject({
      verificationStrategy: "xrpl-issued-asset-v1",
      receiptContract: "xrpl-issued-payment-v1",
    });
  });
});
