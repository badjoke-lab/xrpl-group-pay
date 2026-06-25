import { describe, expect, it, vi } from "vitest";

import {
  makeXrplTransaction,
  TEST_TXID,
} from "@/features/payment-verification/test-helpers";

import {
  createXrplTransactionClient,
  XrplNodeUnavailableError,
  XrplTestnetClient,
  XrplTransactionClientConfigurationError,
  XrplTransactionPendingError,
} from "./client";

function rpcResponse(result: unknown) {
  return new Response(JSON.stringify({ result, id: "test", status: "success" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("XRPL transaction client", () => {
  it("requests API v2 and fails over to the second Testnet endpoint", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("primary unavailable"))
      .mockResolvedValueOnce(rpcResponse(makeXrplTransaction()));
    const client = new XrplTestnetClient(
      ["https://primary.test/", "https://failover.test/"],
      fetcher as unknown as typeof fetch,
    );

    await expect(client.getTransaction(TEST_TXID)).resolves.toMatchObject({
      hash: TEST_TXID,
      validated: true,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);

    const secondCall = fetcher.mock.calls[1];
    const request = JSON.parse((secondCall?.[1] as RequestInit).body as string);
    expect(request).toEqual({
      method: "tx",
      params: [
        {
          transaction: TEST_TXID,
          binary: false,
          api_version: 2,
        },
      ],
      id: "xrpl-group-pay-verification",
    });
  });

  it("returns pending when no Testnet endpoint has the transaction", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        rpcResponse({ error: "txnNotFound", status: "error" }),
      );
    const client = new XrplTestnetClient(
      ["https://primary.test/", "https://failover.test/"],
      fetcher as unknown as typeof fetch,
    );

    await expect(client.getTransaction(TEST_TXID)).rejects.toBeInstanceOf(
      XrplTransactionPendingError,
    );
  });

  it("fails closed when every Testnet endpoint is unavailable or malformed", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("bad", { status: 502 }))
      .mockResolvedValueOnce(rpcResponse({ unexpected: true }));
    const client = new XrplTestnetClient(
      ["https://primary.test/", "https://failover.test/"],
      fetcher as unknown as typeof fetch,
    );

    await expect(client.getTransaction(TEST_TXID)).rejects.toBeInstanceOf(
      XrplNodeUnavailableError,
    );
  });

  it("requires explicit Mainnet gate access", () => {
    expect(() => createXrplTransactionClient("mainnet")).toThrow(
      XrplTransactionClientConfigurationError,
    );
  });

  it("reads Mainnet only through an approved network-scoped client", async () => {
    const fetcher = vi.fn().mockResolvedValue(rpcResponse(makeXrplTransaction()));
    const client = createXrplTransactionClient("mainnet", {
      deploymentNetwork: "mainnet",
      mainnetAccess: {
        network: "mainnet",
        mainnetGateApproved: true,
      },
      endpoints: ["https://mainnet.test/"],
      fetcher: fetcher as unknown as typeof fetch,
    });

    await expect(client.getTransaction(TEST_TXID)).resolves.toMatchObject({
      hash: TEST_TXID,
      validated: true,
    });
    expect(client.network).toBe("mainnet");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("rejects PaymentSlot and deployment network crossover", () => {
    expect(() =>
      createXrplTransactionClient("mainnet", {
        deploymentNetwork: "testnet",
        mainnetAccess: {
          network: "mainnet",
          mainnetGateApproved: true,
        },
      }),
    ).toThrow(XrplTransactionClientConfigurationError);
  });
});
