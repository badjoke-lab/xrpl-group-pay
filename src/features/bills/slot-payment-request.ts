import type { XamanPaymentPayloadRequest } from "@/features/xaman/payment-request";
import { TESTNET_FORCE_NETWORK } from "@/features/xaman/payment-request";

import type { ResolvedPaymentSlot } from "./payment-slot";

export function buildStoredSlotPaymentPayload(
  slot: ResolvedPaymentSlot,
  sourceTag: number,
): XamanPaymentPayloadRequest {
  if (
    !Number.isInteger(sourceTag) ||
    sourceTag < 0 ||
    sourceTag > 4_294_967_295
  ) {
    throw new Error("Source Tag must be a UInt32 value.");
  }

  return {
    txjson: {
      TransactionType: "Payment",
      Destination: slot.destinationAddress,
      Amount: slot.expectedAmountDrops,
      SourceTag: sourceTag,
      InvoiceID: slot.invoiceId,
      ...(slot.destinationTag === null
        ? {}
        : { DestinationTag: slot.destinationTag }),
    },
    options: {
      submit: true,
      expire: 5,
      force_network: TESTNET_FORCE_NETWORK,
    },
  };
}
