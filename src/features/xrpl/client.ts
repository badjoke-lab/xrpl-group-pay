import "server-only";

import type { XrplNetwork } from "@/features/assets/types";

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

export const XRPL_MAINNET_RPC_ENDPOINTS = [
  "https://s1.ripple.com:51234/",
  "https://s2.ripple.com:51234/",
] as const;

export const XRPL_TRANSACTION_RPC_ENDPOINTS: Readonly<
  Record<XrplNetwork, readonly string[]>
> = {
  testnet: XRPL_TESTNET_RPC_ENDPOINTS,
  mainnet: XRPL_MAINNET_RPC_ENDPOINTS,
};

export type MainnetTransactionReadAccess = {
  network: "mainnet";
  mainnetGateApproved: true;
};

export class XrplTransactionPendingError extends Error {
  constructor(readonly network: XrplNetwork = "testnet") {
    super(
      `The transaction is not available on the validated XRPL ${network} ledger yet.`,
    );
    this.name = "XrplTransactionPendingError";
  }
}

export class XrplNodeUnavailableError extends Error {
  constructor(readonly network: XrplNetwork = "testnet") {
    super(`XRPL ${network} transaction data is temporarily unavailable.`);
    this.name = "XrplNodeUnavailableError";
  }
}

export class XrplTransactionClientConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XrplTransactionClientConfigurationError";
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

function requireMainnetAccess(
  network: XrplNetwork,
  access: MainnetTransactionReadAccess | undefined,
) {
  if (
    network === "mainnet" &&
    (access?.network !== "mainnet" || access.mainnetGateApproved !== true)
  ) {
    throw new XrplTransactionClientConfigurationError(
      "XRPL Mainnet transaction reads require an explicitly approved Mainnet gate.",
    );
  }
}

export class XrplTransactionClient {
  constructor(
    readonly network: XrplNetwork,
    private readonly endpoints: readonly string[] =
      XRPL_TRANSACTION_RPC_ENDPOINTS[network],
    private readonly fetcher: typeof fetch = fetch,
    mainnetAccess?: MainnetTransactionReadAccess,
  ) {
    requireMainnetAccess(network, mainnetAccess);
    if (endpoints.length === 0) {
      throw new XrplTransactionClientConfigurationError(
        "At least one network-scoped XRPL transaction endpoint is required.",
      );
    }
  }

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
        throw new XrplTransactionPendingError(this.network);
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
      throw new XrplNodeUnavailableError(this.network);
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
      throw new XrplTransactionPendingError(this.network);
    }

    throw new XrplNodeUnavailableError(this.network);
  }
}

export class XrplTestnetClient extends XrplTransactionClient {
  constructor(
    endpoints: readonly string[] = XRPL_TESTNET_RPC_ENDPOINTS,
    fetcher: typeof fetch = fetch,
  ) {
    super("testnet", endpoints, fetcher);
  }
}

export class XrplMainnetClient extends XrplTransactionClient {
  constructor(
    access: MainnetTransactionReadAccess,
    endpoints: readonly string[] = XRPL_MAINNET_RPC_ENDPOINTS,
    fetcher: typeof fetch = fetch,
  ) {
    super("mainnet", endpoints, fetcher, access);
  }
}

export function createXrplTransactionClient(
  network: XrplNetwork,
  options: {
    deploymentNetwork?: XrplNetwork;
    mainnetAccess?: MainnetTransactionReadAccess;
    endpoints?: readonly string[];
    fetcher?: typeof fetch;
  } = {},
): XrplTransactionClient {
  if (
    options.deploymentNetwork !== undefined &&
    options.deploymentNetwork !== network
  ) {
    throw new XrplTransactionClientConfigurationError(
      "The PaymentSlot network does not match the deployment network.",
    );
  }

  if (network === "mainnet") {
    return new XrplMainnetClient(
      options.mainnetAccess as MainnetTransactionReadAccess,
      options.endpoints,
      options.fetcher,
    );
  }

  return new XrplTestnetClient(options.endpoints, options.fetcher);
}
