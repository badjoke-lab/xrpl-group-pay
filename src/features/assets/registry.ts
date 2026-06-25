import { createRlusdAssetDescriptor, XRPL_RLUSD_ASSET_IDS } from "./rlusd";
import {
  assetDescriptorSchema,
  type AssetDescriptor,
  type AssetType,
  type IssuedAssetDescriptor,
  type NativeXrpAssetDescriptor,
  type XrplNetwork,
} from "./types";

export class AssetRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetRegistryError";
  }
}

export type AssetRegistryFilter = {
  network?: XrplNetwork;
  assetType?: AssetType;
};

function semanticIdentity(asset: AssetDescriptor) {
  return [
    asset.paymentRail,
    asset.network,
    asset.assetType,
    asset.currency,
    asset.issuer ?? "",
  ].join(":");
}

export class AssetRegistry {
  private readonly assets: readonly AssetDescriptor[];
  private readonly byId: ReadonlyMap<string, AssetDescriptor>;

  constructor(descriptors: readonly unknown[]) {
    const byId = new Map<string, AssetDescriptor>();
    const identities = new Set<string>();
    const assets = descriptors.map((descriptor) => {
      const parsed = Object.freeze(assetDescriptorSchema.parse(descriptor));

      if (byId.has(parsed.id)) {
        throw new AssetRegistryError(`Duplicate Asset ID: ${parsed.id}`);
      }

      const identity = semanticIdentity(parsed);
      if (identities.has(identity)) {
        throw new AssetRegistryError(
          `Duplicate Asset identity: ${parsed.paymentRail}/${parsed.network}/${parsed.currency}`,
        );
      }

      byId.set(parsed.id, parsed);
      identities.add(identity);
      return parsed;
    });

    this.assets = Object.freeze(assets);
    this.byId = byId;
  }

  get(id: string): AssetDescriptor | undefined {
    return this.byId.get(id);
  }

  require(id: string): AssetDescriptor {
    const asset = this.get(id);
    if (!asset) {
      throw new AssetRegistryError(`Unknown Asset ID: ${id}`);
    }
    return asset;
  }

  list(filter: AssetRegistryFilter = {}): readonly AssetDescriptor[] {
    return this.assets.filter(
      (asset) =>
        (filter.network === undefined || asset.network === filter.network) &&
        (filter.assetType === undefined ||
          asset.assetType === filter.assetType),
    );
  }
}

export const XRPL_XRP_ASSET_IDS = {
  testnet: "xrpl:testnet:xrp",
  mainnet: "xrpl:mainnet:xrp",
} as const;

const XRP_ASSETS = [
  {
    id: XRPL_XRP_ASSET_IDS.testnet,
    paymentRail: "xrpl",
    network: "testnet",
    assetType: "native",
    currency: "XRP",
    issuer: null,
    precision: 6,
    symbol: "XRP",
    verificationStrategy: "xrpl-xrp-v1",
    receiptContract: "xrpl-xrp-payment-v1",
  },
  {
    id: XRPL_XRP_ASSET_IDS.mainnet,
    paymentRail: "xrpl",
    network: "mainnet",
    assetType: "native",
    currency: "XRP",
    issuer: null,
    precision: 6,
    symbol: "XRP",
    verificationStrategy: "xrpl-xrp-v1",
    receiptContract: "xrpl-xrp-payment-v1",
  },
] as const;

const RLUSD_ASSETS = [
  createRlusdAssetDescriptor("testnet"),
  createRlusdAssetDescriptor("mainnet"),
] as const;

export const assetRegistry = new AssetRegistry([
  ...XRP_ASSETS,
  ...RLUSD_ASSETS,
]);

export function getXrpAssetDescriptor(
  network: XrplNetwork,
): NativeXrpAssetDescriptor {
  return assetRegistry.require(
    XRPL_XRP_ASSET_IDS[network],
  ) as NativeXrpAssetDescriptor;
}

export function getRlusdAssetDescriptor(
  network: XrplNetwork,
): IssuedAssetDescriptor {
  return assetRegistry.require(
    XRPL_RLUSD_ASSET_IDS[network],
  ) as IssuedAssetDescriptor;
}
