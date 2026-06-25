import { describe, expect, it } from "vitest";

import { parseBuildEnv } from "./env-schema.mjs";

describe("parseBuildEnv", () => {
  it("defaults to the Testnet build target", () => {
    expect(parseBuildEnv({})).toMatchObject({
      appNetwork: "testnet",
      publicAppNetwork: "testnet",
      paymentsDatabaseBinding: "PAYMENTS_DB",
      allowMainnetBuild: false,
      mainnetGateApproved: false,
      mainnetSourceTagApproved: false,
      mainnetReleaseMode: "disabled",
      xrplSourceTag: null,
    });
  });

  it("rejects Testnet use of the Mainnet database binding", () => {
    expect(() =>
      parseBuildEnv({ PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET" }),
    ).toThrow("A Testnet build cannot target the Mainnet payment database binding.");
  });

  it("requires every Mainnet build gate and a non-local HTTPS URL", () => {
    const base = {
      APP_NETWORK: "mainnet",
      NEXT_PUBLIC_APP_NETWORK: "mainnet",
    };

    expect(() => parseBuildEnv(base)).toThrow("ALLOW_MAINNET_BUILD=true");
    expect(() =>
      parseBuildEnv({ ...base, ALLOW_MAINNET_BUILD: "true" }),
    ).toThrow("MAINNET_GATE_APPROVED=true");
    expect(() =>
      parseBuildEnv({
        ...base,
        ALLOW_MAINNET_BUILD: "true",
        MAINNET_GATE_APPROVED: "true",
      }),
    ).toThrow("MAINNET_RELEASE_MODE=disabled");
    expect(() =>
      parseBuildEnv({
        ...base,
        ALLOW_MAINNET_BUILD: "true",
        MAINNET_GATE_APPROVED: "true",
        MAINNET_RELEASE_MODE: "internal",
      }),
    ).toThrow("PAYMENTS_DATABASE_BINDING=PAYMENTS_DB_MAINNET");
    expect(() =>
      parseBuildEnv({
        ...base,
        ALLOW_MAINNET_BUILD: "true",
        MAINNET_GATE_APPROVED: "true",
        MAINNET_RELEASE_MODE: "internal",
        PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
      }),
    ).toThrow("MAINNET_SOURCE_TAG_APPROVED=true");
    expect(() =>
      parseBuildEnv({
        ...base,
        ALLOW_MAINNET_BUILD: "true",
        MAINNET_GATE_APPROVED: "true",
        MAINNET_RELEASE_MODE: "internal",
        PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
        MAINNET_SOURCE_TAG_APPROVED: "true",
      }),
    ).toThrow("XRPL_MAINNET_SOURCE_TAG");
    expect(() =>
      parseBuildEnv({
        ...base,
        ALLOW_MAINNET_BUILD: "true",
        MAINNET_GATE_APPROVED: "true",
        MAINNET_RELEASE_MODE: "internal",
        PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
        MAINNET_SOURCE_TAG_APPROVED: "true",
        XRPL_MAINNET_SOURCE_TAG: "123",
      }),
    ).toThrow("non-local HTTPS");
  });

  it("accepts an explicitly gated isolated Mainnet build", () => {
    expect(
      parseBuildEnv({
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_URL: "https://group-pay.example",
        ALLOW_MAINNET_BUILD: "true",
        MAINNET_GATE_APPROVED: "true",
        MAINNET_RELEASE_MODE: "internal",
        PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
        MAINNET_SOURCE_TAG_APPROVED: "true",
        XRPL_MAINNET_SOURCE_TAG: "123",
      }),
    ).toMatchObject({
      appNetwork: "mainnet",
      paymentsDatabaseBinding: "PAYMENTS_DB_MAINNET",
      mainnetReleaseMode: "internal",
      mainnetSourceTagApproved: true,
      xrplSourceTag: 123,
    });
  });

  it("rejects invalid Mainnet Source Tag values", () => {
    for (const value of ["-1", "1.5", "4294967296", "tag"]) {
      expect(() =>
        parseBuildEnv({
          APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_URL: "https://group-pay.example",
          ALLOW_MAINNET_BUILD: "true",
          MAINNET_GATE_APPROVED: "true",
          MAINNET_RELEASE_MODE: "internal",
          PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
          MAINNET_SOURCE_TAG_APPROVED: "true",
          XRPL_MAINNET_SOURCE_TAG: value,
        }),
      ).toThrow();
    }
  });
});
