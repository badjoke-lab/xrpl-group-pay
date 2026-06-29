import { describe, expect, it, vi } from "vitest";

import {
  createXrplSigningStateClient,
  XrplSigningStateClient,
  XrplSigningStateUnavailableError,
} from "./signing-state-client";
import { XrplTransactionClientConfigurationError } from "./client";

const ACCOUNT = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";

function rpcResponse(result: unknown) {
  return new Response(JSON.stringify({ result, id: "test", status: "success" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("XRPL signing-state client", () => {
  it("reads Account Sequence from one validated ledger snapshot", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      rpcResponse({
        account_data: {
          Account: ACCOUNT,
          Sequence: 123,
        },
        ledger_index: 9_876_543,
        validated: true,
      }),
    );
    const client = new XrplSigningStateClient(
      "testnet",
      ["https://testnet.example/"],
      fetcher as unknown as typeof fetch,
    );

    await expect(client.getSigningState(ACCOUNT)).resolves.toEqual({
      account: ACCOUNT,
      sequence: 123,
      validatedLedgerIndex: 9_876_543,
    });

    const request = JSON.parse(
      (fetcher.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(request).toEqual({
      method: "account_info",
      params: [
        {
          account: ACCOUNT,
          ledger_index: "validated",
          strict: true,
          api_version: 2,
        },
      ],
      id: "xrpl-group-pay-signing-state",
    });
  });

  it("fails over and rejects unvalidated or malformed account state", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        rpcResponse({
          account_data: { Account: ACCOUNT, Sequence: 123 },
          ledger_index: 9_876_543,
          validated: false,
        }),
      )
      .mockResolvedValueOnce(
        rpcResponse({
          account_data: { Account: ACCOUNT, Sequence: 124 },
          ledger_index: 9_876_544,
          validated: true,
        }),
      );
    const client = new XrplSigningStateClient(
      "testnet",
      ["https://primary.example/", "https://failover.example/"],
      fetcher as unknown as typeof fetch,
    );

    await expect(client.getSigningState(ACCOUNT)).resolves.toMatchObject({
      sequence: 124,
      validatedLedgerIndex: 9_876_544,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fails closed when no endpoint returns validated state", async () => {
    const fetcher = vi.fn().mockResolvedValue(rpcResponse({ error: "actNotFound" }));
    const client = new XrplSigningStateClient(
      "testnet",
      ["https://primary.example/", "https://failover.example/"],
      fetcher as unknown as typeof fetch,
    );

    await expect(client.getSigningState(ACCOUNT)).rejects.toBeInstanceOf(
      XrplSigningStateUnavailableError,
    );
  });

  it("requires explicit Mainnet gate access and matching deployment network", () => {
    expect(() => createXrplSigningStateClient("mainnet")).toThrow(
      XrplTransactionClientConfigurationError,
    );
    expect(() =>
      createXrplSigningStateClient("mainnet", {
        deploymentNetwork: "testnet",
        mainnetAccess: {
          network: "mainnet",
          mainnetGateApproved: true,
        },
      }),
    ).toThrow(XrplTransactionClientConfigurationError);
  });
});
