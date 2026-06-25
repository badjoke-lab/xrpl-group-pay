import {
  providerRequestStatusSchema,
  type ProviderRequestStatus,
  type ProviderStatusReader,
} from "@/features/wallet-providers/status-reader";
import { WalletProviderError } from "@/features/wallet-providers/types";

import { XamanApiError, type XamanClient } from "./client";
import { normalizeXamanStatus } from "./status";

export type XamanStatusClient = Pick<XamanClient, "getPayload">;

export class XamanStatusReader implements ProviderStatusReader {
  readonly providerId = "xaman" as const;

  constructor(private readonly client: XamanStatusClient) {}

  async readStatus(requestId: string): Promise<ProviderRequestStatus> {
    try {
      const payload = await this.client.getPayload(requestId);
      const normalized = normalizeXamanStatus(payload);
      const status =
        normalized.status === "waiting" ? "available" : normalized.status;
      const parsed = providerRequestStatusSchema.safeParse({
        providerId: this.providerId,
        requestId,
        status,
        transactionId: normalized.txid?.toUpperCase() ?? null,
      });

      if (!parsed.success) {
        throw new WalletProviderError(
          this.providerId,
          "INVALID_PROVIDER_RESPONSE",
          "Xaman returned an invalid request status.",
          502,
        );
      }
      return parsed.data;
    } catch (error) {
      if (error instanceof WalletProviderError) throw error;
      if (error instanceof XamanApiError) {
        throw new WalletProviderError(
          this.providerId,
          "PROVIDER_UNAVAILABLE",
          error.message,
          error.status,
        );
      }
      throw new WalletProviderError(
        this.providerId,
        "PROVIDER_UNAVAILABLE",
        "Xaman could not read the request status.",
      );
    }
  }
}
