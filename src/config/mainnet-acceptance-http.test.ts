import { describe, expect, it, vi } from "vitest";

import {
  MainnetAcceptanceAuthorizationConfigurationError,
  MainnetAcceptanceAuthorizationError,
} from "./mainnet-acceptance-authorization";
import { controlledMainnetAuthorizationFailure } from "./mainnet-acceptance-http";

const request = new Request("https://xgp.badjoke-lab.com/api/bills", {
  method: "POST",
});

describe("controlled Mainnet authorization HTTP boundary", () => {
  it("returns a generic bearer challenge without exposing private material", async () => {
    const authorize = vi
      .fn()
      .mockRejectedValue(new MainnetAcceptanceAuthorizationError());

    const response = await controlledMainnetAuthorizationFailure(
      request,
      authorize,
    );

    expect(response?.status).toBe(401);
    expect(response?.headers.get("cache-control")).toBe("no-store");
    expect(response?.headers.get("www-authenticate")).toContain("Bearer");
    await expect(response?.json()).resolves.toEqual({
      error: {
        code: "MAINNET_ACCEPTANCE_UNAUTHORIZED",
        message: "Controlled Mainnet acceptance authorization is required.",
      },
    });
  });

  it("fails closed when the temporary authorization is not configured safely", async () => {
    const authorize = vi
      .fn()
      .mockRejectedValue(
        new MainnetAcceptanceAuthorizationConfigurationError(),
      );

    const response = await controlledMainnetAuthorizationFailure(
      request,
      authorize,
    );

    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toMatchObject({
      error: { code: "MAINNET_ACCEPTANCE_AUTH_UNAVAILABLE" },
    });
  });
});
