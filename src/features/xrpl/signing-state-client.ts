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
  xrplSigningStateSchema,
  type XrplSigningState,
} from "./one-shot-payment";
import { xrplRpcEnvelopeSchema } from "./schemas";

const accountInfoResultSchema = z
  .object({
    account_data: z
      .object({
        Account: z.string().refine(isValidClassicAddress),
        Sequence: z.number().int().min(0).max(4_294_967_295),
      })
      .passthrough(),
    ledger_index: z.number().int().min(0).max(4_294_967_295),
    validated: z.literal(true),
  })
  .passthrough();

export class XrplSigningStateUnavailableError extends Error {
  constructor(readonly network: XrplNetwork) {
    super(`XRPL ${network} account signing state is temporarily unavailable.`);
    this.name = "XrplSigningStateUnavailableError";
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
      "XRPL Mainnet signing-state reads require an explicitly approved Mainnet gate.",
    );
  }
}

export class XrplSigningStateClient {
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
        "At least one network-scoped XRPL signing-state endpoint is required.",
      );
    }
  }

  private async requestEndpoint(
    endpoint: string,
    account: string,
  ): Promise<XrplSigningState> {
    let response: Response;
    try {
      response = await this.fetcher(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "account_info",
          params: [
            {
              account,
              ledger_index: "validated",
              strict: true,
              api_version: 2,
            },
          ],
          id: "xrpl-group-pay-signing-state",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new XrplSigningStateUnavailableError(this.network);
    }

    if (!response.ok) {
      throw new XrplSigningStateUnavailableError(this.network);
    }

    const body: unknown = await response.json().catch(() => null);
    const envelope = xrplRpcEnvelopeSchema.safeParse(body);
    if (!envelope.success) {
      throw new XrplSigningStateUnavailableError(this.network);
    }

    const parsed = accountInfoResultSchema.safeParse(envelope.data.result);
    if (
      !parsed.success ||
      parsed.data.account_data.Account !== account
    ) {
      throw new XrplSigningStateUnavailableError(this.network);
    }

    return xrplSigningStateSchema.parse({
      account,
      sequence: parsed.data.account_data.Sequence,
      validatedLedgerIndex: parsed.data.ledger_index,
    });
  }

  async getSigningState(account: string): Promise<XrplSigningState> {
    if (!isValidClassicAddress(account)) {
      throw new XrplSigningStateUnavailableError(this.network);
    }

    for (const endpoint of [...new Set(this.endpoints)]) {
      try {
        return await this.requestEndpoint(endpoint, account);
      } catch {
        // Fail over to the next endpoint and fail closed if none are usable.
      }
    }

    throw new XrplSigningStateUnavailableError(this.network);
  }
}

export function createXrplSigningStateClient(
  network: XrplNetwork,
  options: {
    deploymentNetwork?: XrplNetwork;
    mainnetAccess?: MainnetTransactionReadAccess;
    endpoints?: readonly string[];
    fetcher?: typeof fetch;
  } = {},
): XrplSigningStateClient {
  if (
    options.deploymentNetwork !== undefined &&
    options.deploymentNetwork !== network
  ) {
    throw new XrplTransactionClientConfigurationError(
      "The PaymentSlot network does not match the deployment network.",
    );
  }

  return new XrplSigningStateClient(
    network,
    options.endpoints,
    options.fetcher,
    network === "mainnet" ? options.mainnetAccess : undefined,
  );
}
