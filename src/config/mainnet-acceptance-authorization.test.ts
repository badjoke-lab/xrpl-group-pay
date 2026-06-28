import { describe, expect, it } from "vitest";

import {
  assertMainnetAcceptanceAuthorized,
  MainnetAcceptanceAuthorizationConfigurationError,
  MainnetAcceptanceAuthorizationError,
} from "./mainnet-acceptance-authorization";

const TOKEN = "a".repeat(43);
const NOW = new Date("2026-06-28T00:00:00.000Z");
const FUTURE = "2026-06-28T00:20:00.000Z";

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
    MAINNET_ACCEPTANCE_EXPIRES_AT: FUTURE,
    ...overrides,
  };
}

describe("controlled Mainnet acceptance authorization", () => {
  it("does not add an authorization requirement to Testnet", async () => {
    await expect(
      assertMainnetAcceptanceAuthorized(
        request(),
        {
          APP_NETWORK: "testnet",
          NEXT_PUBLIC_APP_NETWORK: "testnet",
        },
        NOW,
      ),
    ).resolves.toMatchObject({
      required: false,
      network: "testnet",
      expiresAt: null,
    });
  });

  it("does not replace the halted Mainnet operations boundary", async () => {
    await expect(
      assertMainnetAcceptanceAuthorized(
        request(),
        environment({
          MAINNET_OPERATIONS_MODE: "halted",
          MAINNET_ACCEPTANCE_EXPIRES_AT: undefined,
        }),
        NOW,
      ),
    ).resolves.toMatchObject({
      required: false,
      network: "mainnet",
      operationsMode: "halted",
      expiresAt: null,
    });
  });

  it.each(["enabled", "verify-only"] as const)(
    "requires a valid digest for internal Mainnet mode %s",
    async (mode) => {
      await expect(
        assertMainnetAcceptanceAuthorized(
          request(),
          environment({ MAINNET_OPERATIONS_MODE: mode }),
          NOW,
        ),
      ).rejects.toBeInstanceOf(
        MainnetAcceptanceAuthorizationConfigurationError,
      );
    },
  );

  it("accepts only the exact bearer token during the configured window", async () => {
    const expectedDigest = await digest(TOKEN);
    const controlled = environment({
      MAINNET_ACCEPTANCE_AUTH_DIGEST: expectedDigest.toUpperCase(),
    });

    await expect(
      assertMainnetAcceptanceAuthorized(request(TOKEN), controlled, NOW),
    ).resolves.toMatchObject({
      required: true,
      network: "mainnet",
      releaseMode: "internal",
      operationsMode: "enabled",
      expiresAt: FUTURE,
    });

    await expect(
      assertMainnetAcceptanceAuthorized(request(), controlled, NOW),
    ).rejects.toBeInstanceOf(MainnetAcceptanceAuthorizationError);
    await expect(
      assertMainnetAcceptanceAuthorized(
        request("b".repeat(43)),
        controlled,
        NOW,
      ),
    ).rejects.toBeInstanceOf(MainnetAcceptanceAuthorizationError);
  });

  it("rejects expired and oversized internal windows", async () => {
    const expectedDigest = await digest(TOKEN);

    await expect(
      assertMainnetAcceptanceAuthorized(
        request(TOKEN),
        environment({
          MAINNET_ACCEPTANCE_AUTH_DIGEST: expectedDigest,
          MAINNET_ACCEPTANCE_EXPIRES_AT: "2026-06-27T23:59:59.000Z",
        }),
        NOW,
      ),
    ).rejects.toBeInstanceOf(
      MainnetAcceptanceAuthorizationConfigurationError,
    );

    await expect(
      assertMainnetAcceptanceAuthorized(
        request(TOKEN),
        environment({
          MAINNET_ACCEPTANCE_AUTH_DIGEST: expectedDigest,
          MAINNET_ACCEPTANCE_EXPIRES_AT: "2026-06-28T00:31:00.000Z",
        }),
        NOW,
      ),
    ).rejects.toBeInstanceOf(
      MainnetAcceptanceAuthorizationConfigurationError,
    );
  });

  it("fails closed for network mismatch and Testnet contamination", async () => {
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

    await expect(
      assertMainnetAcceptanceAuthorized(request(), {
        APP_NETWORK: "testnet",
        NEXT_PUBLIC_APP_NETWORK: "testnet",
        MAINNET_ACCEPTANCE_EXPIRES_AT: FUTURE,
      }),
    ).rejects.toBeInstanceOf(
      MainnetAcceptanceAuthorizationConfigurationError,
    );
  });

  it("does not impose temporary controls on a future public Mainnet mode", async () => {
    await expect(
      assertMainnetAcceptanceAuthorized(
        request(),
        {
          APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_NETWORK: "mainnet",
          MAINNET_RELEASE_MODE: "public",
          MAINNET_OPERATIONS_MODE: "enabled",
        },
        NOW,
      ),
    ).resolves.toMatchObject({
      required: false,
      network: "mainnet",
      releaseMode: "public",
      expiresAt: null,
    });
  });
});
