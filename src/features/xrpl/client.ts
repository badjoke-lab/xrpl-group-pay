import "server-only";

import {
  transactionHashSchema,
  xrplRpcEnvelopeSchema,
  xrplTxResultSchema,
  type XrplTxResult,
} from "./schemas";

export const XRPL_TESTNET_RPC_ENDPOINTS = [
  "https://s.altnet.rippletest.net:51234/",
  "https://testnet.xrpl-labs.com/",
] as const;

export class XrplTransactionPendingError extends Error {
  constructor() {
    super("The transaction is not available on the validated Testnet ledger yet.");
    this.name = "XrplTransactionPendingError";
  }
}

export class XrplNodeUnavailableError extends Error {
  constructor() {
    super("XRPL Testnet transaction data is temporarily unavailable.");
    this.name = "XrplNodeUnavailableError";
  }
}

class XrplNodeResponseError extends Error {
  constructor() {
    super("The XRPL node returned an invalid response.");
    this.name = "XrplNodeResponseError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class XrplTestnetClient {
  constructor(
    private readonly endpoints: readonly string[] = XRPL_TESTNET_RPC_ENDPOINTS,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async requestEndpoint(
    endpoint: string,
    transactionId: string,
  ): Promise<XrplTxResult> {
    let response: Response;
    try {
      response = await this.fetcher(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "tx",
          params: [
            {
              transaction: transactionId,
              binary: false,
              api_version: 2,
            },
          ],
          id: "xrpl-group-pay-verification",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new XrplNodeResponseError();
    }

    if (!response.ok) {
      throw new XrplNodeResponseError();
    }

    const body: unknown = await response.json().catch(() => null);
    const envelope = xrplRpcEnvelopeSchema.safeParse(body);
    if (!envelope.success) {
      throw new XrplNodeResponseError();
    }

    if (isRecord(envelope.data.result)) {
      const error = envelope.data.result.error;
      if (error === "txnNotFound") {
        throw new XrplTransactionPendingError();
      }
      if (typeof error === "string") {
        throw new XrplNodeResponseError();
      }
    }

    const parsed = xrplTxResultSchema.safeParse(envelope.data.result);
    if (!parsed.success) {
      throw new XrplNodeResponseError();
    }

    return parsed.data;
  }

  async getTransaction(transactionId: string): Promise<XrplTxResult> {
    const parsedTransactionId = transactionHashSchema.safeParse(transactionId);
    if (!parsedTransactionId.success) {
      throw new XrplNodeUnavailableError();
    }

    let sawNotFound = false;
    const endpoints = [...new Set(this.endpoints)];

    for (const endpoint of endpoints) {
      try {
        return await this.requestEndpoint(
          endpoint,
          parsedTransactionId.data.toUpperCase(),
        );
      } catch (error) {
        if (error instanceof XrplTransactionPendingError) {
          sawNotFound = true;
        }
      }
    }

    if (sawNotFound) {
      throw new XrplTransactionPendingError();
    }

    throw new XrplNodeUnavailableError();
  }
}
