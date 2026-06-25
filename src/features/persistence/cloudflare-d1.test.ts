import { describe, expect, it, vi } from "vitest";

import {
  getPaymentsDatabaseFromBindings,
  PaymentsDatabaseUnavailableError,
} from "./cloudflare-d1";
import type { D1DatabaseLike } from "./d1-types";

function database(name: string): D1DatabaseLike & { name: string } {
  return {
    name,
    prepare: vi.fn(),
    batch: vi.fn(),
  } as unknown as D1DatabaseLike & { name: string };
}

const mainnetEnvironment = {
  APP_NETWORK: "mainnet",
  NEXT_PUBLIC_APP_NETWORK: "mainnet",
  ALLOW_MAINNET_RUNTIME: "true",
  MAINNET_GATE_APPROVED: "true",
  MAINNET_SOURCE_TAG_APPROVED: "true",
  MAINNET_RELEASE_MODE: "internal",
  PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
  XRPL_MAINNET_SOURCE_TAG: "123",
};

describe("getPaymentsDatabaseFromBindings", () => {
  it("uses the existing Testnet PAYMENTS_DB binding by default", () => {
    const testnet = database("testnet");
    expect(getPaymentsDatabaseFromBindings({ PAYMENTS_DB: testnet }, {})).toBe(
      testnet,
    );
  });

  it("never falls back to Testnet storage for a Mainnet target", () => {
    const testnet = database("testnet");
    expect(() =>
      getPaymentsDatabaseFromBindings(
        { PAYMENTS_DB: testnet },
        mainnetEnvironment,
      ),
    ).toThrow(PaymentsDatabaseUnavailableError);
  });

  it("uses only the dedicated Mainnet binding after every runtime gate passes", () => {
    const testnet = database("testnet");
    const mainnet = database("mainnet");
    expect(
      getPaymentsDatabaseFromBindings(
        {
          PAYMENTS_DB: testnet,
          PAYMENTS_DB_MAINNET: mainnet,
        },
        mainnetEnvironment,
      ),
    ).toBe(mainnet);
  });

  it("accepts Mainnet Source Tag vars from Cloudflare bindings", () => {
    const mainnet = database("mainnet");
    expect(
      getPaymentsDatabaseFromBindings(
        {
          PAYMENTS_DB_MAINNET: mainnet,
          ...mainnetEnvironment,
        },
        {},
      ),
    ).toBe(mainnet);
  });

  it("lets Cloudflare string vars override stale process values consistently", () => {
    const testnet = database("testnet");
    expect(
      getPaymentsDatabaseFromBindings(
        {
          PAYMENTS_DB: testnet,
          APP_NETWORK: "testnet",
          NEXT_PUBLIC_APP_NETWORK: "testnet",
        },
        {
          APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_NETWORK: "mainnet",
        },
      ),
    ).toBe(testnet);
  });
});
