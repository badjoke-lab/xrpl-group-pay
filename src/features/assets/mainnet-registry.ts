import {
  getRlusdAssetDescriptor,
  getXrpAssetDescriptor,
  XRPL_XRP_ASSET_IDS,
} from "./registry";
import {
  RLUSD_CURRENCY_HEX,
  RLUSD_ISSUERS,
  XRPL_RLUSD_ASSET_IDS,
} from "./rlusd";
import type { AssetDescriptor } from "./types";

export const MAINNET_SETTLEMENT_ASSET_IDS = [
  XRPL_XRP_ASSET_IDS.mainnet,
  XRPL_RLUSD_ASSET_IDS.mainnet,
] as const;

export type MainnetSettlementAssetId =
  (typeof MAINNET_SETTLEMENT_ASSET_IDS)[number];

export type MainnetAssetAccess = {
  network: "mainnet";
  mainnetGateApproved: true;
};

export class MainnetAssetRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MainnetAssetRegistryError";
  }
}

function requireExplicitAccess(access: MainnetAssetAccess | undefined) {
  if (
    access?.network !== "mainnet" ||
    access.mainnetGateApproved !== true
  ) {
    throw new MainnetAssetRegistryError(
      "XRPL Mainnet Settlement Assets require an explicitly approved Mainnet gate.",
    );
  }
}

function assertCanonicalMainnetAsset(asset: AssetDescriptor) {
  if (asset.network !== "mainnet" || asset.paymentRail !== "xrpl") {
    throw new MainnetAssetRegistryError(
      `Asset ${asset.id} is not an XRPL Mainnet Asset.`,
    );
  }

  if (asset.id === XRPL_XRP_ASSET_IDS.mainnet) {
    if (
      asset.assetType !== "native" ||
      asset.currency !== "XRP" ||
      asset.issuer !== null ||
      asset.precision !== 6 ||
      asset.verificationStrategy !== "xrpl-xrp-v1" ||
      asset.receiptContract !== "xrpl-xrp-payment-v1"
    ) {
      throw new MainnetAssetRegistryError(
        "The XRPL Mainnet XRP descriptor does not match the canonical identity.",
      );
    }
    return asset;
  }

  if (asset.id === XRPL_RLUSD_ASSET_IDS.mainnet) {
    if (
      asset.assetType !== "issued" ||
      asset.currency !== RLUSD_CURRENCY_HEX ||
      asset.issuer !== RLUSD_ISSUERS.mainnet ||
      asset.precision !== 6 ||
      asset.verificationStrategy !== "xrpl-issued-asset-v1" ||
      asset.receiptContract !== "xrpl-issued-payment-v1"
    ) {
      throw new MainnetAssetRegistryError(
        "The XRPL Mainnet RLUSD descriptor does not match the canonical identity.",
      );
    }
    return asset;
  }

  throw new MainnetAssetRegistryError(
    `Asset ${asset.id} is not approved for XRPL Group Pay Mainnet settlement.`,
  );
}

const CANONICAL_MAINNET_ASSETS = Object.freeze([
  assertCanonicalMainnetAsset(getXrpAssetDescriptor("mainnet")),
  assertCanonicalMainnetAsset(getRlusdAssetDescriptor("mainnet")),
]);

export function listApprovedMainnetSettlementAssets(
  access?: MainnetAssetAccess,
): readonly AssetDescriptor[] {
  requireExplicitAccess(access);
  return CANONICAL_MAINNET_ASSETS;
}

export function requireApprovedMainnetSettlementAsset(
  id: string,
  access?: MainnetAssetAccess,
): AssetDescriptor {
  requireExplicitAccess(access);
  const asset = CANONICAL_MAINNET_ASSETS.find((candidate) => candidate.id === id);
  if (!asset) {
    throw new MainnetAssetRegistryError(
      `Asset ${id} is not approved for XRPL Group Pay Mainnet settlement.`,
    );
  }
  return asset;
}
