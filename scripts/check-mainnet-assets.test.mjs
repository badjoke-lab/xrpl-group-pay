import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readMainnetAssetRegistry } from "./check-mainnet-assets.mjs";

const directories = [];

async function temporaryRegistry(value) {
  const directory = await mkdtemp(join(tmpdir(), "xrpl-group-pay-assets-"));
  directories.push(directory);
  const path = join(directory, "registry.json");
  await writeFile(path, JSON.stringify(value), "utf8");
  return path;
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("readMainnetAssetRegistry", () => {
  it("accepts the checked-in canonical registry", async () => {
    const registry = await readMainnetAssetRegistry();
    expect(registry.assets.map((asset) => asset.id)).toEqual([
      "xrpl:mainnet:xrp",
      "xrpl:mainnet:rlusd",
    ]);
  });

  it("rejects an altered RLUSD issuer", async () => {
    const canonical = await readMainnetAssetRegistry();
    const path = await temporaryRegistry({
      ...canonical,
      assets: canonical.assets.map((asset) =>
        asset.id === "xrpl:mainnet:rlusd"
          ? { ...asset, issuer: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY" }
          : asset,
      ),
    });
    await expect(readMainnetAssetRegistry(path)).rejects.toThrow(
      "unexpected issuer",
    );
  });

  it("rejects missing or duplicate required Asset IDs", async () => {
    const canonical = await readMainnetAssetRegistry();
    const duplicatePath = await temporaryRegistry({
      ...canonical,
      assets: [canonical.assets[0], canonical.assets[0]],
    });
    await expect(readMainnetAssetRegistry(duplicatePath)).rejects.toThrow(
      "Duplicate Mainnet Asset ID",
    );
  });
});
