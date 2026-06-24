import { getXrpAssetDescriptor } from "@/features/assets/registry";
import type { XrplNetwork } from "@/features/assets/types";

import { paymentIntentSchema, type PaymentIntent } from "./types";

export const DEFAULT_PAYMENT_INTENT_TTL_SECONDS = 5 * 60;

export class PaymentIntentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentIntentError";
  }
}

export type CreateXrpPaymentIntentInput = {
  paymentSlotId: string;
  network: XrplNetwork;
  amountDrops: string;
  destination: string;
  destinationTag: number | null;
  sourceTag: number;
  invoiceId: string;
  expectedPayer: string;
  revision?: number;
  intentId?: string;
  now?: Date;
  ttlSeconds?: number;
};

export function createXrpPaymentIntent(
  input: CreateXrpPaymentIntentInput,
): PaymentIntent {
  const revision = input.revision ?? 1;
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_PAYMENT_INTENT_TTL_SECONDS;
  const now = input.now ?? new Date();

  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0 || ttlSeconds > 3_600) {
    throw new PaymentIntentError(
      "Payment Intent lifetime must be between 1 and 3600 seconds.",
    );
  }
  if (Number.isNaN(now.getTime())) {
    throw new PaymentIntentError("Payment Intent creation time is invalid.");
  }

  const asset = getXrpAssetDescriptor(input.network);
  const candidate = {
    intentId:
      input.intentId ??
      `payment-slot:${input.paymentSlotId}:revision:${revision}`,
    paymentSlotId: input.paymentSlotId,
    paymentRail: "xrpl" as const,
    network: input.network,
    asset,
    amount: {
      code: asset.symbol,
      units: input.amountDrops,
      scale: asset.precision,
    },
    destination: input.destination,
    destinationTag: input.destinationTag,
    sourceTag: input.sourceTag,
    invoiceId: input.invoiceId.toUpperCase(),
    expectedPayer: input.expectedPayer,
    expiresAt: new Date(now.getTime() + ttlSeconds * 1_000).toISOString(),
    revision,
  };

  const parsed = paymentIntentSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new PaymentIntentError("The XRP Payment Intent is invalid.");
  }
  return parsed.data;
}
