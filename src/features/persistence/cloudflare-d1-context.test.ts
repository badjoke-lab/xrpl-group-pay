import { describe, expect, it, vi } from "vitest";

import {
  getPaymentsDatabaseContextFromBindings,
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
  MAINNET_OPERATIONS_MODE: "halted",
  PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
  XRPL_MAINNET_SOURCE_TAG: "2171267705",
};

describe("payment database deployment context", () => {
  it("returns the Testnet database and network together", () => {
    const testnet = database("testnet");
    const context = getPaymentsDatabaseContextFromBindings(
      { PAYMENTS_DB: testnet },
      {},
    );

    expect(context.database).toBe(testnet);
    expect(context.target).toMatchObject({
      network: "testnet",
      databaseBinding: "PAYMENTS_DB",
    });
  });

  it("returns the isolated Mainnet database and resolved network together", () => {
    const mainnet = database("mainnet");
    const context = getPaymentsDatabaseContextFromBindings(
      { PAYMENTS_DB_MAINNET: mainnet },
      mainnetEnvironment,
    );

    expect(context.database).toBe(mainnet);
    expect(context.target).toMatchObject({
      network: "mainnet",
      databaseBinding: "PAYMENTS_DB_MAINNET",
      sourceTag: 2171267705,
      mainnetReleaseMode: "internal",
      mainnetOperationsMode: "halted",
    });
  });

  it("never returns a Testnet database for a Mainnet target", () => {
    expect(() =>
      getPaymentsDatabaseContextFromBindings(
        { PAYMENTS_DB: database("testnet") },
        mainnetEnvironment,
      ),
    ).toThrow(PaymentsDatabaseUnavailableError);
  });
});
