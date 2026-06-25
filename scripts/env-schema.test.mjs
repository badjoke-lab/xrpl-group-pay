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
      mainnetReleaseMode: "disabled",
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
      }),
    ).toMatchObject({
      appNetwork: "mainnet",
      paymentsDatabaseBinding: "PAYMENTS_DB_MAINNET",
      mainnetReleaseMode: "internal",
    });
  });
});
