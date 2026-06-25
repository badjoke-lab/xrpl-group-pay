import { describe, expect, it } from "vitest";

import { parseBuildEnv } from "../scripts/env-schema.mjs";

describe("parseBuildEnv", () => {
  it("defaults to Testnet", () => {
    expect(parseBuildEnv({})).toMatchObject({
      appNetwork: "testnet",
      allowMainnetBuild: false,
      mainnetGateApproved: false,
      mainnetReleaseMode: "disabled",
      paymentsDatabaseBinding: "PAYMENTS_DB",
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

  it("allows Mainnet only with every explicit approval and isolation control", () => {
    expect(
      parseBuildEnv({
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_URL: "https://group-pay.example",
        ALLOW_MAINNET_BUILD: "true",
        MAINNET_GATE_APPROVED: "true",
        MAINNET_RELEASE_MODE: "internal",
        PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
      }),
    ).toMatchObject({
      appNetwork: "mainnet",
      allowMainnetBuild: true,
      mainnetGateApproved: true,
      mainnetReleaseMode: "internal",
      paymentsDatabaseBinding: "PAYMENTS_DB_MAINNET",
    });
  });
});
