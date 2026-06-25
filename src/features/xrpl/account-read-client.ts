import "server-only";

import { isValidClassicAddress } from "xrpl";
import { z } from "zod";

import type { MainnetAssetAccess } from "@/features/assets/mainnet-registry";
import type { XrplNetwork } from "@/features/assets/types";

export const XRPL_ACCOUNT_READ_ENDPOINTS: Readonly<
  Record<XrplNetwork, readonly string[]>
> = {
  testnet: [
    "https://s.altnet.rippletest.net:51234/",
    "https://testnet.xrpl-labs.com/",
  ],
  mainnet: [
    "https://s1.ripple.com:51234/",
    "https://s2.ripple.com:51234/",
  ],
};

const classicAddressSchema = z.string().refine(isValidClassicAddress);
const decimalStringSchema = z
  .string()
  .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/);

const accountFlagsSchema = z
  .object({
    requireDestinationTag: z.boolean().optional().default(false),
    depositAuth: z.boolean().optional().default(false),
    globalFreeze: z.boolean().optional().default(false),
    requireAuthorization: z.boolean().optional().default(false),
    disallowIncomingXRP: z.boolean().optional().default(false),
  })
  .passthrough();

const accountInfoResultSchema = z
  .object({
    account_data: z
      .object({
        Account: classicAddressSchema,
      })
      .passthrough(),
    account_flags: accountFlagsSchema,
    validated: z.literal(true),
  })
  .passthrough();

const trustLineSchema = z
  .object({
    account: classicAddressSchema,
    balance: decimalStringSchema,
    currency: z.string().min(3).max(40),
    limit: decimalStringSchema,
    limit_peer: decimalStringSchema,
    authorized: z.boolean().optional().default(false),
    peer_authorized: z.boolean().optional().default(false),
    freeze: z.boolean().optional().default(false),
    freeze_peer: z.boolean().optional().default(false),
    deep_freeze: z.boolean().optional().default(false),
    deep_freeze_peer: z.boolean().optional().default(false),
  })
  .passthrough();

const accountLinesResultSchema = z
  .object({
    account: classicAddressSchema,
    lines: z.array(trustLineSchema),
    validated: z.literal(true),
    marker: z.unknown().optional(),
  })
  .passthrough();

const rpcEnvelopeSchema = z
  .object({
    result: z.unknown(),
  })
  .passthrough();

const rpcErrorSchema = z
  .object({
    error: z.string(),
  })
  .passthrough();

export type XrplAccountFlags = z.infer<typeof accountFlagsSchema>;
export type XrplTrustLine = z.infer<typeof trustLineSchema>;

export type XrplAccountInfo = {
  account: string;
  flags: XrplAccountFlags;
};

export interface XrplRecipientReadClient {
  readonly network: XrplNetwork;
  getAccountInfo(account: string): Promise<XrplAccountInfo | null>;
  getTrustLines(account: string, peer: string): Promise<XrplTrustLine[]>;
}

export class XrplAccountReadUnavailableError extends Error {
  constructor() {
    super("Validated XRPL account data is temporarily unavailable.");
    this.name = "XrplAccountReadUnavailableError";
  }
}

export class XrplAccountReadConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XrplAccountReadConfigurationError";
  }
}

class EndpointResponseError extends Error {}

function requireClassicAddress(value: string) {
  const parsed = classicAddressSchema.safeParse(value);
  if (!parsed.success) {
    throw new XrplAccountReadConfigurationError(
      "Recipient readiness requires a valid classic XRPL address.",
    );
  }
  return parsed.data;
}

export class XrplAccountReadClient implements XrplRecipientReadClient {
  constructor(
    readonly network: XrplNetwork,
    private readonly endpoints: readonly string[] =
      XRPL_ACCOUNT_READ_ENDPOINTS[network],
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (endpoints.length === 0) {
      throw new XrplAccountReadConfigurationError(
        "At least one XRPL account read endpoint is required.",
      );
    }
  }

  private async requestEndpoint(
    endpoint: string,
    method: "account_info" | "account_lines",
    params: Record<string, unknown>,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetcher(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method,
          params: [{ ...params, api_version: 2 }],
          id: "xrpl-group-pay-recipient-readiness",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new EndpointResponseError();
    }

    if (!response.ok) {
      throw new EndpointResponseError();
    }

    const body: unknown = await response.json().catch(() => null);
    const envelope = rpcEnvelopeSchema.safeParse(body);
    if (!envelope.success) {
      throw new EndpointResponseError();
    }
    return envelope.data.result;
  }

  private isUsableResult(
    method: "account_info" | "account_lines",
    params: Record<string, unknown>,
    result: unknown,
  ) {
    if (rpcErrorSchema.safeParse(result).success) return true;

    if (method === "account_info") {
      const parsed = accountInfoResultSchema.safeParse(result);
      return (
        parsed.success && parsed.data.account_data.Account === params.account
      );
    }

    const parsed = accountLinesResultSchema.safeParse(result);
    return parsed.success && parsed.data.account === params.account;
  }

  private async request(
    method: "account_info" | "account_lines",
    params: Record<string, unknown>,
  ): Promise<unknown> {
    for (const endpoint of [...new Set(this.endpoints)]) {
      try {
        const result = await this.requestEndpoint(endpoint, method, params);
        if (!this.isUsableResult(method, params, result)) {
          throw new EndpointResponseError();
        }
        return result;
      } catch {
        continue;
      }
    }
    throw new XrplAccountReadUnavailableError();
  }

  async getAccountInfo(account: string): Promise<XrplAccountInfo | null> {
    const normalizedAccount = requireClassicAddress(account);
    const result = await this.request("account_info", {
      account: normalizedAccount,
      ledger_index: "validated",
    });

    const rpcError = rpcErrorSchema.safeParse(result);
    if (rpcError.success) {
      if (rpcError.data.error === "actNotFound") return null;
      throw new XrplAccountReadUnavailableError();
    }

    const parsed = accountInfoResultSchema.parse(result);
    return {
      account: parsed.account_data.Account,
      flags: parsed.account_flags,
    };
  }

  async getTrustLines(account: string, peer: string): Promise<XrplTrustLine[]> {
    const normalizedAccount = requireClassicAddress(account);
    const normalizedPeer = requireClassicAddress(peer);
    const lines: XrplTrustLine[] = [];
    let marker: unknown = undefined;

    for (let page = 0; page < 10; page += 1) {
      const result = await this.request("account_lines", {
        account: normalizedAccount,
        peer: normalizedPeer,
        ledger_index: "validated",
        limit: 400,
        ...(marker === undefined ? {} : { marker }),
      });

      const rpcError = rpcErrorSchema.safeParse(result);
      if (rpcError.success) {
        if (rpcError.data.error === "actNotFound") return [];
        throw new XrplAccountReadUnavailableError();
      }

      const parsed = accountLinesResultSchema.parse(result);
      lines.push(...parsed.lines);

      marker = parsed.marker;
      if (marker === undefined) return lines;
    }

    throw new XrplAccountReadUnavailableError();
  }
}

export function createXrplAccountReadClient(
  network: XrplNetwork,
  options: {
    mainnetAccess?: MainnetAssetAccess;
    endpoints?: readonly string[];
    fetcher?: typeof fetch;
  } = {},
): XrplAccountReadClient {
  if (
    network === "mainnet" &&
    options.mainnetAccess?.mainnetGateApproved !== true
  ) {
    throw new XrplAccountReadConfigurationError(
      "XRPL Mainnet account reads require explicit Mainnet gate approval.",
    );
  }

  return new XrplAccountReadClient(
    network,
    options.endpoints ?? XRPL_ACCOUNT_READ_ENDPOINTS[network],
    options.fetcher,
  );
}
