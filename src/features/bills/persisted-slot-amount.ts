import type { ResolvedPaymentSlot } from "./payment-slot";

export function resolveXrpSlotUnits(slot: ResolvedPaymentSlot) {
  if (!slot.asset || !slot.expectedAmount) {
    return slot.expectedAmountDrops;
  }

  const valid =
    slot.asset.assetType === "native" &&
    slot.asset.currency === "XRP" &&
    slot.asset.issuer === null &&
    slot.asset.network === slot.network &&
    slot.expectedAmount.code === slot.asset.symbol &&
    slot.expectedAmount.scale === slot.asset.precision &&
    slot.expectedAmount.units === slot.expectedAmountDrops;

  if (!valid) {
    throw new Error("The persisted PaymentSlot Asset is invalid.");
  }
  return slot.expectedAmount.units;
}
