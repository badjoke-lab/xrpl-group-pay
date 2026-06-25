import { describe, expect, it, vi } from "vitest";

import {
  createXrplAccountReadClient,
  XrplAccountReadClient,
  XrplAccountReadConfigurationError,
  XrplAccountReadUnavailableError,
} from "./account-read-client";

const ACCOUNT = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
const CURRENCY = "524C555344000000000000000000000000000000";

function rpcResponse(result: unknown) {
  return new Response(JSON.stringify({ result, id: "readiness" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function accountInfo(overrides: Record<string, unknown> = {}) {
  return {
    account_data: { Account: ACCOUNT },
    account_flags: {
      requireDestinationTag: false,
      depositAuth: false,
      globalFreeze: false,
      requireAuthorization: false,
    },
    validated: true,
    ...overrides,
  };
}

function line(overrides: Record<string, unknown> = {}) {
  return {
    account: ISSUER,
    balance: "10",
    currency: CURRENCY,
    limit: "1000",
    limit_peer: "0",
    ...overrides,
  };
}

describe("XrplAccountReadClient", () => {
  it("requests validated API v2 account data and fails over from malformed data", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(rpcResponse({ unexpected: true }))
      .mockResolvedValueOnce(
        rpcResponse(
          accountInfo({
            account_flags: { requireDestinationTag: true },
          }),
        ),
      );
    const client = new XrplAccountReadClient(
      "testnet",
      ["https://primary.test/", "https://secondary.test/"],
      fetcher as unknown as typeof fetch,
    );

    await expect(client.getAccountInfo(ACCOUNT)).resolves.toEqual({
      account: ACCOUNT,
      flags: expect.objectContaining({
        requireDestinationTag: true,
        depositAuth: false,
      }),
    });
    expect(fetcher).toHaveBeenCalledTimes(2);

    const request = JSON.parse(
      (fetcher.mock.calls[1][1] as RequestInit).body as string,
    );
    expect(request).toEqual({
      method: "account_info",
      params: [
        {
          account: ACCOUNT,
          ledger_index: "validated",
          api_version: 2,
        },
      ],
      id: "xrpl-group-pay-recipient-readiness",
    });
  });

  it("returns null for a validated account-not-found response", async () => {
    const client = new XrplAccountReadClient(
      "testnet",
      ["https://node.test/"],
      vi.fn().mockResolvedValue(rpcResponse({ error: "actNotFound" })) as unknown as typeof fetch,
    );
    await expect(client.getAccountInfo(ACCOUNT)).resolves.toBeNull();
  });

  it("reads all trust-line pages with the exact issuer peer filter", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        rpcResponse({
          account: ACCOUNT,
          lines: [line()],
          marker: { ledger: 1, seq: 2 },
          validated: true,
        }),
      )
      .mockResolvedValueOnce(
        rpcResponse({
          account: ACCOUNT,
          lines: [line({ currency: "USD" })],
          validated: true,
        }),
      );
    const client = new XrplAccountReadClient(
      "mainnet",
      ["https://node.test/"],
      fetcher as unknown as typeof fetch,
    );

    await expect(client.getTrustLines(ACCOUNT, ISSUER)).resolves.toHaveLength(2);
    const secondRequest = JSON.parse(
      (fetcher.mock.calls[1][1] as RequestInit).body as string,
    );
    expect(secondRequest.params[0]).toMatchObject({
      account: ACCOUNT,
      peer: ISSUER,
      ledger_index: "validated",
      limit: 400,
      marker: { ledger: 1, seq: 2 },
      api_version: 2,
    });
  });

  it("fails closed when all responses are unavailable, unvalidated, or malformed", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(rpcResponse(accountInfo({ validated: false })));
    const client = new XrplAccountReadClient(
      "testnet",
      ["https://one.test/", "https://two.test/"],
      fetcher as unknown as typeof fetch,
    );

    await expect(client.getAccountInfo(ACCOUNT)).rejects.toBeInstanceOf(
      XrplAccountReadUnavailableError,
    );
  });

  it("requires explicit Mainnet gate approval in the default client factory", () => {
    expect(() => createXrplAccountReadClient("mainnet")).toThrow(
      XrplAccountReadConfigurationError,
    );
    expect(() =>
      createXrplAccountReadClient("mainnet", {
        mainnetAccess: {
          network: "mainnet",
          mainnetGateApproved: true,
        },
        endpoints: ["https://node.test/"],
      }),
    ).not.toThrow();
  });
});
