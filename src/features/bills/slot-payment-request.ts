import type { PaymentIntent } from "@/features/payment-intents/types";
import { createXrpPaymentIntent } from "@/features/payment-intents/xrp";
import type { XamanPaymentPayloadRequest } from "@/features/xaman/payment-request";
import { TESTNET_FORCE_NETWORK } from "@/features/xaman/payment-request";
import { buildXrpPaymentTransaction } from "@/features/xrpl/payment-builder";

import type { ResolvedPaymentSlot } from "./payment-slot";

function requireSourceTag(sourceTag: number) {
  if (
    !Number.isInteger(sourceTag) ||
    sourceTag < 0 ||
    sourceTag > 4_294_967_295
  ) {
    throw new Error("Source Tag must be a UInt32 value.");
  }
  return sourceTag;
}

export function buildStoredSlotPaymentIntent(
  slot: ResolvedPaymentSlot,
  sourceTag: number,
  now = new Date(),
): PaymentIntent {
  return createXrpPaymentIntent({
    paymentSlotId: slot.slotPublicId,
    network: slot.network,
    amountDrops: slot.expectedAmountDrops,
    destination: slot.destinationAddress,
    destinationTag: slot.destinationTag,
    sourceTag: requireSourceTag(sourceTag),
    invoiceId: slot.invoiceId,
    expectedPayer: slot.expectedPayerAddress,
    revision: 1,
    now,
  });
}

export function buildStoredSlotPaymentPayload(
  slot: ResolvedPaymentSlot,
  sourceTag: number,
  now = new Date(),
): XamanPaymentPayloadRequest {
  const intent = buildStoredSlotPaymentIntent(slot, sourceTag, now);

  return {
    txjson: buildXrpPaymentTransaction(intent),
    options: {
      submit: true,
      expire: 5,
      force_network: TESTNET_FORCE_NETWORK,
    },
  };
}
