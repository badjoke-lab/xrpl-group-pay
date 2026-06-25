import type {
  IssuedAssetDescriptor,
  XrplNetwork,
} from "./types";

export const RLUSD_CURRENCY_HEX: string =
  "524C555344000000000000000000000000000000";

export const RLUSD_ISSUERS: Readonly<Record<XrplNetwork, string>> = {
  testnet: "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV",
  mainnet: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
};

export const XRPL_RLUSD_ASSET_IDS = {
  testnet: "xrpl:testnet:rlusd",
  mainnet: "xrpl:mainnet:rlusd",
} as const;

// Application-level fixed precision for allocation and persistence.
// XRPL issued-currency values remain decimal strings on the transaction rail.
export const RLUSD_APPLICATION_SCALE = 6 as const;

export function createRlusdAssetDescriptor(
  network: XrplNetwork,
): IssuedAssetDescriptor {
  return {
    id: XRPL_RLUSD_ASSET_IDS[network],
    paymentRail: "xrpl",
    network,
    assetType: "issued",
    currency: RLUSD_CURRENCY_HEX,
    issuer: RLUSD_ISSUERS[network],
    precision: RLUSD_APPLICATION_SCALE,
    symbol: "RLUSD",
    verificationStrategy: "xrpl-issued-asset-v1",
    receiptContract: "xrpl-issued-payment-v1",
  };
}
