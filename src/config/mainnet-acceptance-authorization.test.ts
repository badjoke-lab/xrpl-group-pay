import { describe, expect, it } from "vitest";

import {
  assertMainnetAcceptanceAuthorized,
  MainnetAcceptanceAuthorizationConfigurationError,
  MainnetAcceptanceAuthorizationError,
} from "./mainnet-acceptance-authorization";

const TOKEN = "a".repeat(43);

async function digest(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function request(token?: string) {
  return new Request("https://xgp.badjoke-lab.com/api/bills", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

function environment(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_NETWORK: "mainnet",
    MAINNET_RELEASE_MODE: "internal",
    MAINNET_OPERATIONS_MODE: "enabled",
    ...overrides,
  };
}

describe("controlled Mainnet acceptance authorization", () => {
  it("does not add an authorization requirement to Testnet", async () => {
    await expect(
      assertMainnetAcceptanceAuthorized(request(), {
        APP_NETWORK: "testnet",
        NEXT_PUBLIC_APP_NETWORK: "testnet",
      }),
    ).resolves.toMatchObject({ required: false, network: "testnet" });
  });

  it("does not replace the halted Mainnet operations boundary", async () => {
    await expect(
      assertMainnetAcceptanceAuthorized(
        request(),
        environment({ MAINNET_OPERATIONS_MODE: "halted" }),
      ),
    ).resolves.toMatchObject({
      required: false,
      network: "mainnet",
      operationsMode: "halted",
    });
  });

  it.each(["enabled", "verify-only"] as const)(
    "requires a valid digest for internal Mainnet mode %s",
    async (mode) => {
      await expect(
        assertMainnetAcceptanceAuthorized(
          request(),
          environment({ MAINNET_OPERATIONS_MODE: mode }),
        ),
      ).rejects.toBeInstanceOf(
        MainnetAcceptanceAuthorizationConfigurationError,
      );
    },
  );

  it("accepts only the exact bearer token matching the configured digest", async () => {
    const expectedDigest = await digest(TOKEN);
    const controlled = environment({
      MAINNET_ACCEPTANCE_AUTH_DIGEST: expectedDigest.toUpperCase(),
    });

    await expect(
      assertMainnetAcceptanceAuthorized(request(TOKEN), controlled),
    ).resolves.toMatchObject({
      required: true,
      network: "mainnet",
      releaseMode: "internal",
      operationsMode: "enabled",
    });

    await expect(
      assertMainnetAcceptanceAuthorized(request(), controlled),
    ).rejects.toBeInstanceOf(MainnetAcceptanceAuthorizationError);
    await expect(
      assertMainnetAcceptanceAuthorized(request("b".repeat(43)), controlled),
    ).rejects.toBeInstanceOf(MainnetAcceptanceAuthorizationError);
  });

  it("fails closed for network mismatch and Testnet digest contamination", async () => {
    await expect(
      assertMainnetAcceptanceAuthorized(request(), {
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "testnet",
      }),
    ).rejects.toBeInstanceOf(
      MainnetAcceptanceAuthorizationConfigurationError,
    );

    await expect(
      assertMainnetAcceptanceAuthorized(request(), {
        APP_NETWORK: "testnet",
        NEXT_PUBLIC_APP_NETWORK: "testnet",
        MAINNET_ACCEPTANCE_AUTH_DIGEST: await digest(TOKEN),
      }),
    ).rejects.toBeInstanceOf(
      MainnetAcceptanceAuthorizationConfigurationError,
    );
  });

  it("does not impose the acceptance token on a future public Mainnet mode", async () => {
    await expect(
      assertMainnetAcceptanceAuthorized(
        request(),
        environment({ MAINNET_RELEASE_MODE: "public" }),
      ),
    ).resolves.toMatchObject({
      required: false,
      network: "mainnet",
      releaseMode: "public",
    });
  });
});
