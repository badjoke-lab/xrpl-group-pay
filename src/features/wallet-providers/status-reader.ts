import { z } from "zod";

import {
  walletHandoffStatusSchema,
  walletProviderIdSchema,
  type WalletProviderId,
} from "./types";

export const providerRequestStatusSchema = z
  .object({
    providerId: walletProviderIdSchema,
    requestId: z.string().min(1).max(200),
    status: walletHandoffStatusSchema,
    transactionId: z
      .string()
      .regex(/^[A-F0-9]{64}$/i)
      .nullable(),
  })
  .strict();

export type ProviderRequestStatus = z.infer<
  typeof providerRequestStatusSchema
>;

export interface ProviderStatusReader {
  readonly providerId: WalletProviderId;
  readStatus(requestId: string): Promise<ProviderRequestStatus>;
}
