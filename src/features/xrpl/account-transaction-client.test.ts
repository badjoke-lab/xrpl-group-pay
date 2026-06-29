import { describe, expect, it, vi } from "vitest";

import {
  createXrplAccountTransactionClient,
  XrplAccountHistoryIncompleteError,
  XrplAccountTransactionClient,
} from "./account-transaction-client";
import { XrplTransactionClientConfigurationError } from "./client";

const ACCOUNT = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const DESTINATION = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const INVOICE = "AB".repeat(32);

function transaction(hash: string, invoiceId = INVOICE) {
  return {
    hash,
    validated: true,
    ledger_index: 100,
    tx_json: {
      TransactionType: "Payment",
      Account: ACCOUNT,
      Destination: DESTINATION,
      Amount: "1",
      SourceTag: 1,
      InvoiceID: invoiceId,
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      delivered_amount: "1",
    },
  };
}

function response(input: {
  transactions?: unknown[];
  marker?: unknown;
  validated?: boolean;
}) {
  return new Response(
    JSON.stringify({
      result: {
        account: ACCOUNT,
        ledger_index_min: 1,
        ledger_index_max: 200,
        transactions: input.transactions ?? [],
        validated: input.validated ?? true,
        ...(input.marker === undefined ? {} : { marker: input.marker }),
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("XRPL account transaction client", () => {
  it("returns exact validated InvoiceID matches and ignores unrelated entries", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response({
        transactions: [
          transaction("A".repeat(64)),
          transaction("B".repeat(64), "CD".repeat(32)),
          {
            ...transaction("C".repeat(64)),
            tx_json: {
              ...transaction("C".repeat(64)).tx_json,
              Account: DESTINATION,
            },
          },
        ],
      }),
    );
    const client = new XrplAccountTransactionClient(
      "testnet",
      ["https://testnet.example/"],
      fetcher as unknown as typeof fetch,
    );

    await expect(client.findByInvoiceId(ACCOUNT, INVOICE)).resolves.toMatchObject({
      pages: 1,
      reviewedLedgerMin: 1,
      reviewedLedgerMax: 200,
      transactions: [{ hash: "A".repeat(64) }],
    });
  });

  it("paginates with the server marker before returning a complete result", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ marker: { ledger: 100, seq: 1 } }))
      .mockResolvedValueOnce(
        response({ transactions: [transaction("D".repeat(64))] }),
      );
    const client = new XrplAccountTransactionClient(
      "testnet",
      ["https://testnet.example/"],
      fetcher as unknown as typeof fetch,
    );

    const result = await client.findByInvoiceId(ACCOUNT, INVOICE);
    expect(result.pages).toBe(2);
    expect(result.transactions).toHaveLength(1);

    const secondRequest = JSON.parse(
      (fetcher.mock.calls[1]?.[1] as RequestInit).body as string,
    );
    expect(secondRequest.params[0].marker).toEqual({ ledger: 100, seq: 1 });
  });

  it("fails closed when pagination exceeds the bounded review window", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(response({ marker: { ledger: 100, seq: 1 } }));
    const client = new XrplAccountTransactionClient(
      "testnet",
      ["https://testnet.example/"],
      fetcher as unknown as typeof fetch,
    );

    await expect(client.findByInvoiceId(ACCOUNT, INVOICE)).rejects.toBeInstanceOf(
      XrplAccountHistoryIncompleteError,
    );
    expect(fetcher).toHaveBeenCalledTimes(8);
  });

  it("requires Mainnet gate access and deployment-network identity", () => {
    expect(() => createXrplAccountTransactionClient("mainnet")).toThrow(
      XrplTransactionClientConfigurationError,
    );
    expect(() =>
      createXrplAccountTransactionClient("mainnet", {
        deploymentNetwork: "testnet",
        mainnetAccess: {
          network: "mainnet",
          mainnetGateApproved: true,
        },
      }),
    ).toThrow(XrplTransactionClientConfigurationError);
  });
});
