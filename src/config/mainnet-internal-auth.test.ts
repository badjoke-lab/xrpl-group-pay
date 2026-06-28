import { describe, expect, it } from "vitest";

import {
  assertMainnetInternalAuthorization,
  MainnetInternalAuthorizationConfigurationError,
  MainnetInternalAuthorizationError,
  mainnetAcceptanceTokenDigest,
} from "./mainnet-internal-auth";

const token = "acceptance-token-0123456789-abcdefghijklmnopqrstuvwxyz";

function environment(overrides: Record<string, string | undefined> = {}) {
  return {
    APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_NETWORK: "mainnet",
    MAINNET_RELEASE_MODE: "internal",
    MAINNET_OPERATIONS_MODE: "enabled",
    MAINNET_ACCEPTANCE_TOKEN_SHA256: mainnetAcceptanceTokenDigest(token),
    ...overrides,
  };
}

describe("internal Mainnet acceptance authorization", () => {
  it("does not add an authorization requirement to Testnet", () => {
    expect(
      assertMainnetInternalAuthorization(
        {
          APP_NETWORK: "testnet",
          NEXT_PUBLIC_APP_NETWORK: "testnet",
        },
        new Headers(),
      ),
    ).toMatchObject({ network: "testnet", mode: "testnet" });
  });

  it("accepts the exact token using a SHA-256 comparison", () => {
    expect(
      assertMainnetInternalAuthorization(
        environment(),
        new Headers({ "X-XRPL-Mainnet-Acceptance": token }),
      ),
    ).toMatchObject({ network: "mainnet", mode: "enabled" });
  });

  it("rejects a missing or incorrect token", () => {
    expect(() =>
      assertMainnetInternalAuthorization(environment(), new Headers()),
    ).toThrow(MainnetInternalAuthorizationError);
    expect(() =>
      assertMainnetInternalAuthorization(
        environment(),
        new Headers({ "X-XRPL-Mainnet-Acceptance": `${token}-wrong` }),
      ),
    ).toThrow(MainnetInternalAuthorizationError);
  });

  it("fails closed when the internal digest is missing or malformed", () => {
    expect(() =>
      assertMainnetInternalAuthorization(
        environment({ MAINNET_ACCEPTANCE_TOKEN_SHA256: undefined }),
        new Headers({ "X-XRPL-Mainnet-Acceptance": token }),
      ),
    ).toThrow(MainnetInternalAuthorizationConfigurationError);
    expect(() =>
      assertMainnetInternalAuthorization(
        environment({ MAINNET_ACCEPTANCE_TOKEN_SHA256: "bad" }),
        new Headers({ "X-XRPL-Mainnet-Acceptance": token }),
      ),
    ).toThrow(MainnetInternalAuthorizationConfigurationError);
  });

  it("does not permit the internal token boundary in another release mode", () => {
    expect(() =>
      assertMainnetInternalAuthorization(
        environment({ MAINNET_RELEASE_MODE: "public" }),
        new Headers({ "X-XRPL-Mainnet-Acceptance": token }),
      ),
    ).toThrow(MainnetInternalAuthorizationConfigurationError);
  });
});
