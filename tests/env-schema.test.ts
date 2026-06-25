import { describe, expect, it } from "vitest";

import { parseBuildEnv } from "../scripts/env-schema.mjs";

describe("parseBuildEnv", () => {
  it("defaults to Testnet", () => {
    expect(parseBuildEnv({})).toMatchObject({
      appNetwork: "testnet",
      allowMainnetBuild: false,
      mainnetGateApproved: false,
      mainnetSourceTagApproved: false,
      mainnetReleaseMode: "disabled",
      mainnetOperationsMode: "halted",
      paymentsDatabaseBinding: "PAYMENTS_DB",
      xrplSourceTag: null,
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
        MAINNET_SOURCE_TAG_APPROVED: "true",
        MAINNET_RELEASE_MODE: "internal",
        MAINNET_OPERATIONS_MODE: "enabled",
        PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
        XRPL_MAINNET_SOURCE_TAG: "123",
      }),
    ).toMatchObject({
      appNetwork: "mainnet",
      allowMainnetBuild: true,
      mainnetGateApproved: true,
      mainnetSourceTagApproved: true,
      mainnetReleaseMode: "internal",
      mainnetOperationsMode: "enabled",
      paymentsDatabaseBinding: "PAYMENTS_DB_MAINNET",
      xrplSourceTag: 123,
    });
  });
});
