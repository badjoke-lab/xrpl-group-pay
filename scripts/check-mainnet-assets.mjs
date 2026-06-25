import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

const assetSchema = z
  .object({
    id: z.enum(["xrpl:mainnet:xrp", "xrpl:mainnet:rlusd"]),
    payment_rail: z.literal("xrpl"),
    asset_type: z.enum(["native", "issued"]),
    symbol: z.enum(["XRP", "RLUSD"]),
    currency: z.string().min(3),
    issuer: z.string().min(25).max(35).nullable(),
    precision: z.literal(6),
    verification_strategy: z.enum([
      "xrpl-xrp-v1",
      "xrpl-issued-asset-v1",
    ]),
    receipt_contract: z.enum([
      "xrpl-xrp-payment-v1",
      "xrpl-issued-payment-v1",
    ]),
    official_source: z.string().url(),
  })
  .strict();

const registrySchema = z
  .object({
    schema_version: z.literal(1),
    network: z.literal("mainnet"),
    registry_version: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    state: z.literal("identity_verified"),
    assets: z.array(assetSchema).length(2),
  })
  .strict();

const expected = {
  "xrpl:mainnet:xrp": {
    payment_rail: "xrpl",
    asset_type: "native",
    symbol: "XRP",
    currency: "XRP",
    issuer: null,
    precision: 6,
    verification_strategy: "xrpl-xrp-v1",
    receipt_contract: "xrpl-xrp-payment-v1",
  },
  "xrpl:mainnet:rlusd": {
    payment_rail: "xrpl",
    asset_type: "issued",
    symbol: "RLUSD",
    currency: "524C555344000000000000000000000000000000",
    issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
    precision: 6,
    verification_strategy: "xrpl-issued-asset-v1",
    receipt_contract: "xrpl-issued-payment-v1",
  },
};

function assertExactAsset(asset) {
  const canonical = expected[asset.id];
  if (!canonical) {
    throw new Error(`Unsupported Mainnet Asset ID: ${asset.id}`);
  }

  for (const [key, value] of Object.entries(canonical)) {
    if (asset[key] !== value) {
      throw new Error(
        `Mainnet Asset ${asset.id} has an unexpected ${key}: ${String(asset[key])}`,
      );
    }
  }
}

export async function readMainnetAssetRegistry(
  path = resolve(process.cwd(), "config/xrpl-mainnet-assets.json"),
) {
  const raw = await readFile(path, "utf8");
  const registry = registrySchema.parse(JSON.parse(raw));

  const ids = new Set();
  for (const asset of registry.assets) {
    if (ids.has(asset.id)) {
      throw new Error(`Duplicate Mainnet Asset ID: ${asset.id}`);
    }
    ids.add(asset.id);
    assertExactAsset(asset);
  }

  for (const id of Object.keys(expected)) {
    if (!ids.has(id)) {
      throw new Error(`Missing required Mainnet Asset ID: ${id}`);
    }
  }

  return registry;
}

async function main() {
  const registry = await readMainnetAssetRegistry();
  console.log(
    `XRPL Mainnet Asset registry verified: version=${registry.registry_version}, assets=${registry.assets.length}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Mainnet Asset registry validation failed: ${message}`);
    process.exit(1);
  });
}
