import type { XamanEnvironment } from "@/config/server-env";
import {
  assetRegistry,
  AssetRegistryError,
} from "@/features/assets/registry";
import {
  MainnetAssetRegistryError,
  requireApprovedMainnetSettlementAsset,
  type MainnetAssetAccess,
} from "@/features/assets/mainnet-registry";
import type {
  AssetDescriptor,
  XrplNetwork,
} from "@/features/assets/types";
import {
  paymentIntentSchema,
  type PaymentIntent,
} from "@/features/payment-intents/types";
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
  XAMAN_FORCE_NETWORKS,
  type XamanPaymentPayloadRequest,
} from "./payment-request";
import type { XamanCreatePayloadResponse } from "./schemas";

export type XamanPayloadClient = Pick<XamanClient, "createPayload">;

export type XamanProviderConfiguration = {
  network: XrplNetwork;
  mainnetAccess?: MainnetAssetAccess;
};

export const XAMAN_PROVIDER_CAPABILITIES = {
  paymentRails: ["xrpl"],
  networks: ["testnet", "mainnet"],
  assetTypes: ["native", "issued"],
  handoffMethods: ["mobile-uri", "browser-uri", "qr"],
  statusChannel: true,
} as const satisfies WalletProviderCapabilities;

function unsupported(message: string): never {
  throw new WalletProviderError(
    "xaman",
    "UNSUPPORTED_INTENT",
    message,
  );
}

function isExactAsset(
  actual: AssetDescriptor,
  expected: AssetDescriptor,
): boolean {
  return (
    actual.id === expected.id &&
    actual.paymentRail === expected.paymentRail &&
    actual.network === expected.network &&
    actual.assetType === expected.assetType &&
    actual.currency === expected.currency &&
    actual.issuer === expected.issuer &&
    actual.precision === expected.precision &&
    actual.symbol === expected.symbol &&
    actual.verificationStrategy === expected.verificationStrategy &&
    actual.receiptContract === expected.receiptContract
  );
}

function requireCanonicalIntent(
  intent: PaymentIntent,
  configuration: XamanProviderConfiguration,
): PaymentIntent {
  const parsed = paymentIntentSchema.safeParse(intent);
  if (!parsed.success) {
    return unsupported("The Payment Intent is invalid.");
  }

  const canonicalIntent = parsed.data;
  if (canonicalIntent.network !== configuration.network) {
    return unsupported(
      `The Xaman Provider is configured for ${configuration.network}, not ${canonicalIntent.network}.`,
    );
  }

  let canonicalAsset: AssetDescriptor;
  try {
    canonicalAsset =
      canonicalIntent.network === "mainnet"
        ? requireApprovedMainnetSettlementAsset(
            canonicalIntent.asset.id,
            configuration.mainnetAccess,
          )
        : assetRegistry.require(canonicalIntent.asset.id);
  } catch (error) {
    if (
      error instanceof AssetRegistryError ||
      error instanceof MainnetAssetRegistryError
    ) {
      return unsupported(error.message);
    }
    throw error;
  }

  if (
    canonicalAsset.network !== canonicalIntent.network ||
    !isExactAsset(canonicalIntent.asset, canonicalAsset)
  ) {
    return unsupported(
      "The Payment Intent Asset does not match the canonical XRPL Asset registry entry.",
    );
  }

  return canonicalIntent;
}

function buildXamanRequest(
  intent: PaymentIntent,
  configuration: XamanProviderConfiguration,
): XamanPaymentPayloadRequest {
  const canonicalIntent = requireCanonicalIntent(intent, configuration);

  try {
    return {
      txjson: buildXrplPaymentTransaction(canonicalIntent),
      options: {
        submit: true,
        expire: 5,
        force_network: XAMAN_FORCE_NETWORKS[canonicalIntent.network],
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
    providerMetadata: {
      pushed: response.pushed ?? null,
      network: intent.network,
      assetId: intent.asset.id,
    },
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

  constructor(
    private readonly client: XamanPayloadClient,
    private readonly configuration: XamanProviderConfiguration = {
      network: "testnet",
    },
  ) {}

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
    const canonicalIntent = requireCanonicalIntent(intent, this.configuration);
    const request = buildXamanRequest(canonicalIntent, this.configuration);
    return normalizeCreatedHandoff(
      canonicalIntent,
      await this.createPayloadRequest(request),
    );
  }
}

export function createXamanProvider(environment: XamanEnvironment) {
  const mainnetAccess =
    environment.APP_NETWORK === "mainnet" &&
    environment.MAINNET_GATE_APPROVED === true
      ? ({
          network: "mainnet",
          mainnetGateApproved: true,
        } satisfies MainnetAssetAccess)
      : undefined;

  return new XamanProvider(new XamanClient(environment), {
    network: environment.APP_NETWORK,
    mainnetAccess,
  });
}
