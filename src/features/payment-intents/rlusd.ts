import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type { XrplNetwork } from "@/features/assets/types";

import { paymentIntentSchema, type PaymentIntent } from "./types";
import {
  DEFAULT_PAYMENT_INTENT_TTL_SECONDS,
  PaymentIntentError,
} from "./xrp";

export type CreateRlusdPaymentIntentInput = {
  paymentSlotId: string;
  network: XrplNetwork;
  amountUnits: string;
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

export function createRlusdPaymentIntent(
  input: CreateRlusdPaymentIntentInput,
): PaymentIntent {
  const revision = input.revision ?? 1;
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_PAYMENT_INTENT_TTL_SECONDS;
  const now = input.now ?? new Date();
  const asset = getRlusdAssetDescriptor(input.network);

  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0 || ttlSeconds > 3_600) {
    throw new PaymentIntentError(
      "Payment Intent lifetime must be between 1 and 3600 seconds.",
    );
  }
  if (Number.isNaN(now.getTime())) {
    throw new PaymentIntentError("Payment Intent creation time is invalid.");
  }

  const parsed = paymentIntentSchema.safeParse({
    intentId:
      input.intentId ??
      `payment-slot:${input.paymentSlotId}:revision:${revision}`,
    paymentSlotId: input.paymentSlotId,
    paymentRail: "xrpl",
    network: input.network,
    asset,
    amount: {
      code: asset.symbol,
      units: input.amountUnits,
      scale: asset.precision,
    },
    destination: input.destination,
    destinationTag: input.destinationTag,
    sourceTag: input.sourceTag,
    invoiceId: input.invoiceId.toUpperCase(),
    expectedPayer: input.expectedPayer,
    expiresAt: new Date(now.getTime() + ttlSeconds * 1_000).toISOString(),
    revision,
  });

  if (!parsed.success) {
    throw new PaymentIntentError("The RLUSD Payment Intent is invalid.");
  }
  return parsed.data;
}
