import "server-only";

import { isValidClassicAddress } from "xrpl";
import { z } from "zod";

import type { XrplNetwork } from "@/features/assets/types";

import {
  XRPL_TRANSACTION_RPC_ENDPOINTS,
  type MainnetTransactionReadAccess,
  XrplTransactionClientConfigurationError,
} from "./client";
import {
  transactionHashSchema,
  xrplRpcEnvelopeSchema,
  xrplTxResultSchema,
  type XrplTxResult,
} from "./schemas";

const PAGE_LIMIT = 200;
const MAX_PAGES = 8;

const accountTxResultSchema = z
  .object({
    account: z.string().refine(isValidClassicAddress),
    ledger_index_min: z.number().int(),
    ledger_index_max: z.number().int(),
    transactions: z.array(xrplTxResultSchema),
    validated: z.literal(true),
    marker: z.unknown().optional(),
  })
  .passthrough();

export type AccountTransactionSearchResult = {
  transactions: XrplTxResult[];
  reviewedLedgerMin: number;
  reviewedLedgerMax: number;
  pages: number;
};

export class XrplAccountHistoryUnavailableError extends Error {
  constructor(readonly network: XrplNetwork) {
    super(`XRPL ${network} account transaction history is temporarily unavailable.`);
    this.name = "XrplAccountHistoryUnavailableError";
  }
}

export class XrplAccountHistoryIncompleteError extends Error {
  constructor(readonly network: XrplNetwork) {
    super(
      `XRPL ${network} account transaction history could not be reviewed completely within the bounded search window.`,
    );
    this.name = "XrplAccountHistoryIncompleteError";
  }
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
      "XRPL Mainnet account history reads require an explicitly approved Mainnet gate.",
    );
  }
}

export class XrplAccountTransactionClient {
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
        "At least one network-scoped XRPL account history endpoint is required.",
      );
    }
  }

  private async searchEndpoint(
    endpoint: string,
    account: string,
    invoiceId: string,
  ): Promise<AccountTransactionSearchResult> {
    const matching: XrplTxResult[] = [];
    let marker: unknown = undefined;
    let reviewedLedgerMin = -1;
    let reviewedLedgerMax = -1;

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      let response: Response;
      try {
        response = await this.fetcher(endpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            method: "account_tx",
            params: [
              {
                account,
                ledger_index_min: -1,
                ledger_index_max: -1,
                binary: false,
                forward: false,
                limit: PAGE_LIMIT,
                api_version: 2,
                ...(marker === undefined ? {} : { marker }),
              },
            ],
            id: "xrpl-group-pay-reconciliation",
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new XrplAccountHistoryUnavailableError(this.network);
      }

      if (!response.ok) {
        throw new XrplAccountHistoryUnavailableError(this.network);
      }

      const body: unknown = await response.json().catch(() => null);
      const envelope = xrplRpcEnvelopeSchema.safeParse(body);
      if (!envelope.success) {
        throw new XrplAccountHistoryUnavailableError(this.network);
      }
      const parsed = accountTxResultSchema.safeParse(envelope.data.result);
      if (!parsed.success || parsed.data.account !== account) {
        throw new XrplAccountHistoryUnavailableError(this.network);
      }

      reviewedLedgerMin = parsed.data.ledger_index_min;
      reviewedLedgerMax = parsed.data.ledger_index_max;
      for (const transaction of parsed.data.transactions) {
        if (
          transaction.validated === true &&
          transaction.tx_json.Account === account &&
          transaction.tx_json.InvoiceID?.toUpperCase() === invoiceId
        ) {
          matching.push(transaction);
        }
      }

      marker = parsed.data.marker;
      if (marker === undefined) {
        return {
          transactions: matching,
          reviewedLedgerMin,
          reviewedLedgerMax,
          pages: page,
        };
      }
    }

    throw new XrplAccountHistoryIncompleteError(this.network);
  }

  async findByInvoiceId(
    account: string,
    invoiceId: string,
  ): Promise<AccountTransactionSearchResult> {
    if (!isValidClassicAddress(account)) {
      throw new XrplAccountHistoryUnavailableError(this.network);
    }
    const parsedInvoice = transactionHashSchema.safeParse(invoiceId);
    if (!parsedInvoice.success) {
      throw new XrplAccountHistoryUnavailableError(this.network);
    }

    for (const endpoint of [...new Set(this.endpoints)]) {
      try {
        return await this.searchEndpoint(
          endpoint,
          account,
          parsedInvoice.data.toUpperCase(),
        );
      } catch (error) {
        if (error instanceof XrplAccountHistoryIncompleteError) throw error;
      }
    }

    throw new XrplAccountHistoryUnavailableError(this.network);
  }
}

export function createXrplAccountTransactionClient(
  network: XrplNetwork,
  options: {
    deploymentNetwork?: XrplNetwork;
    mainnetAccess?: MainnetTransactionReadAccess;
    endpoints?: readonly string[];
    fetcher?: typeof fetch;
  } = {},
) {
  if (
    options.deploymentNetwork !== undefined &&
    options.deploymentNetwork !== network
  ) {
    throw new XrplTransactionClientConfigurationError(
      "The PaymentSlot network does not match the deployment network.",
    );
  }

  return new XrplAccountTransactionClient(
    network,
    options.endpoints,
    options.fetcher,
    network === "mainnet" ? options.mainnetAccess : undefined,
  );
}
