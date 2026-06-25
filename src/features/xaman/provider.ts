import type { XamanEnvironment } from "@/config/server-env";
import type { PaymentIntent } from "@/features/payment-intents/types";
import {
  WalletProviderError,
  walletHandoffSchema,
  type WalletHandoff,
  type WalletProvider,
  type WalletProviderCapabilities,
} from "@/features/wallet-providers/types";
import { XrplPaymentBuildError } from "@/features/xrpl/payment-builder";
import { buildXrplPaymentTransaction } from "@/features/xrpl/transaction-builder";

import { XamanApiError, XamanClient } from "./client";
import {
  TESTNET_FORCE_NETWORK,
  type XamanPaymentPayloadRequest,
} from "./payment-request";
import type { XamanCreatePayloadResponse } from "./schemas";

export type XamanPayloadClient = Pick<XamanClient, "createPayload">;

export const XAMAN_PROVIDER_CAPABILITIES = {
  paymentRails: ["xrpl"],
  networks: ["testnet"],
  assetTypes: ["native", "issued"],
  handoffMethods: ["mobile-uri", "browser-uri", "qr"],
  statusChannel: true,
} as const satisfies WalletProviderCapabilities;

function buildXamanRequest(intent: PaymentIntent): XamanPaymentPayloadRequest {
  if (intent.network !== "testnet") {
    throw new WalletProviderError(
      "xaman",
      "UNSUPPORTED_INTENT",
      "The current Xaman adapter accepts only XRPL Testnet intents.",
    );
  }

  try {
    return {
      txjson: buildXrplPaymentTransaction(intent),
      options: {
        submit: true,
        expire: 5,
        force_network: TESTNET_FORCE_NETWORK,
      },
    };
  } catch (error) {
    if (error instanceof XrplPaymentBuildError) {
      throw new WalletProviderError(
        "xaman",
        "UNSUPPORTED_INTENT",
        error.message,
      );
    }
    throw error;
  }
}

function normalizeCreatedHandoff(
  intent: PaymentIntent,
  response: XamanCreatePayloadResponse,
): WalletHandoff {
  const parsed = walletHandoffSchema.safeParse({
    providerId: "xaman",
    requestId: response.uuid,
    status: "available",
    mobileUri: response.next.always,
    browserUri: response.next.always,
    qrData: response.refs.qr_matrix ?? null,
    qrImageUrl: response.refs.qr_png,
    statusChannel: response.refs.websocket_status,
    expiresAt: intent.expiresAt,
    transactionId: null,
    providerMetadata: { pushed: response.pushed ?? null },
  });

  if (!parsed.success) {
    throw new WalletProviderError(
      "xaman",
      "INVALID_PROVIDER_RESPONSE",
      "Xaman returned an invalid Wallet Handoff response.",
      502,
    );
  }
  return parsed.data;
}

export class XamanProvider implements WalletProvider {
  readonly providerId = "xaman" as const;
  readonly capabilities = XAMAN_PROVIDER_CAPABILITIES;

  constructor(private readonly client: XamanPayloadClient) {}

  async createPayloadRequest(
    request: XamanPaymentPayloadRequest,
  ): Promise<XamanCreatePayloadResponse> {
    try {
      return await this.client.createPayload(request);
    } catch (error) {
      if (error instanceof XamanApiError) {
        throw new WalletProviderError(
          "xaman",
          "PROVIDER_UNAVAILABLE",
          error.message,
          error.status,
        );
      }
      throw new WalletProviderError(
        "xaman",
        "PROVIDER_UNAVAILABLE",
        "Xaman could not create the Wallet Handoff.",
      );
    }
  }

  async createHandoff(intent: PaymentIntent): Promise<WalletHandoff> {
    const request = buildXamanRequest(intent);
    return normalizeCreatedHandoff(
      intent,
      await this.createPayloadRequest(request),
    );
  }
}

export function createXamanProvider(environment: XamanEnvironment) {
  return new XamanProvider(new XamanClient(environment));
}
