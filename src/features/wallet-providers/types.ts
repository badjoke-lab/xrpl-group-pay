import { z } from "zod";

import type { PaymentIntent } from "@/features/payment-intents/types";

export const walletProviderIdSchema = z.literal("xaman");

export const walletHandoffStatusSchema = z.enum([
  "created",
  "available",
  "opened",
  "rejected",
  "expired",
  "signed",
  "submitted",
  "failed",
]);

const optionalUrlSchema = z.string().url().nullable();

export const walletHandoffSchema = z
  .object({
    providerId: walletProviderIdSchema,
    requestId: z.string().min(1).max(200),
    status: walletHandoffStatusSchema,
    mobileUri: optionalUrlSchema,
    browserUri: optionalUrlSchema,
    qrData: z.string().min(1).nullable(),
    qrImageUrl: optionalUrlSchema,
    statusChannel: optionalUrlSchema,
    expiresAt: z.string().datetime(),
    transactionId: z
      .string()
      .regex(/^[A-F0-9]{64}$/i)
      .nullable(),
    providerMetadata: z.record(z.string(), z.unknown()),
  })
  .strict();

export type WalletProviderId = z.infer<typeof walletProviderIdSchema>;
export type WalletHandoffStatus = z.infer<typeof walletHandoffStatusSchema>;
export type WalletHandoff = z.infer<typeof walletHandoffSchema>;

export type WalletProviderCapabilities = {
  readonly paymentRails: readonly ["xrpl"];
  readonly networks: readonly ("testnet" | "mainnet")[];
  readonly assetTypes: readonly ("native" | "issued")[];
  readonly handoffMethods: readonly ("mobile-uri" | "browser-uri" | "qr")[];
  readonly statusChannel: boolean;
};

export interface WalletProvider {
  readonly providerId: WalletProviderId;
  readonly capabilities: WalletProviderCapabilities;
  createHandoff(intent: PaymentIntent): Promise<WalletHandoff>;
}

export type WalletProviderErrorCode =
  | "UNSUPPORTED_INTENT"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_PROVIDER_RESPONSE";

export class WalletProviderError extends Error {
  constructor(
    readonly providerId: WalletProviderId,
    readonly code: WalletProviderErrorCode,
    message: string,
    readonly providerStatus: number | null = null,
  ) {
    super(message);
    this.name = "WalletProviderError";
  }
}
