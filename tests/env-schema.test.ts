import { describe, expect, it } from "vitest";

import { parseBuildEnv } from "../scripts/env-schema.mjs";

describe("parseBuildEnv", () => {
  it("defaults to Testnet", () => {
    expect(parseBuildEnv({})).toMatchObject({
      appNetwork: "testnet",
      allowMainnetBuild: false,
    });
  });

  it("rejects mismatched public and server networks", () => {
    expect(() =>
      parseBuildEnv({
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "testnet",
      }),
    ).toThrow(/must identify the same XRPL network/);
  });

  it("fails closed for an unapproved Mainnet build", () => {
    expect(() =>
      parseBuildEnv({
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
      }),
    ).toThrow(/Mainnet builds are blocked/);
  });

  it("allows Mainnet only with an explicit approval flag", () => {
    expect(
      parseBuildEnv({
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
        ALLOW_MAINNET_BUILD: "true",
      }),
    ).toMatchObject({ appNetwork: "mainnet", allowMainnetBuild: true });
  });
});
