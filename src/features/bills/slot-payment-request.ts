import { getRlusdAssetDescriptor, getXrpAssetDescriptor } from "@/features/assets/registry";
import type { AssetDescriptor } from "@/features/assets/types";
import type { PaymentIntent } from "@/features/payment-intents/types";
import { createRlusdPaymentIntent } from "@/features/payment-intents/rlusd";
import {
  createXrpPaymentIntent,
  PaymentIntentError,
} from "@/features/payment-intents/xrp";
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

export function buildStoredSlotPaymentIntent(
  slot: ResolvedPaymentSlot,
  sourceTag: number,
  now = new Date(),
): PaymentIntent {
  const normalizedSourceTag = requireSourceTag(sourceTag);
  const asset = slot.asset ?? getXrpAssetDescriptor(slot.network);
  const expectedAmount = slot.expectedAmount ?? {
    code: "XRP",
    units: slot.expectedAmountDrops,
    scale: 6,
  };

  if (asset.assetType === "native") {
    const officialXrp = getXrpAssetDescriptor(slot.network);
    if (
      !isExactAsset(asset, officialXrp) ||
      expectedAmount.code !== officialXrp.symbol ||
      expectedAmount.scale !== officialXrp.precision
    ) {
      throw new PaymentIntentError(
        "The stored native Asset does not match the supported XRP contract.",
      );
    }

    return createXrpPaymentIntent({
      paymentSlotId: slot.slotPublicId,
      network: slot.network,
      amountDrops: expectedAmount.units,
      destination: slot.destinationAddress,
      destinationTag: slot.destinationTag,
      sourceTag: normalizedSourceTag,
      invoiceId: slot.invoiceId,
      expectedPayer: slot.expectedPayerAddress,
      revision: 1,
      now,
    });
  }

  const officialRlusd = getRlusdAssetDescriptor(slot.network);
  if (
    !isExactAsset(asset, officialRlusd) ||
    expectedAmount.code !== officialRlusd.symbol ||
    expectedAmount.scale !== officialRlusd.precision
  ) {
    throw new PaymentIntentError(
      "The stored issued Asset does not match the supported RLUSD contract.",
    );
  }

  return createRlusdPaymentIntent({
    paymentSlotId: slot.slotPublicId,
    network: slot.network,
    amountUnits: expectedAmount.units,
    destination: slot.destinationAddress,
    destinationTag: slot.destinationTag,
    sourceTag: normalizedSourceTag,
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
  if (intent.network !== "testnet") {
    throw new PaymentIntentError(
      "The legacy Xaman payload helper is restricted to XRPL Testnet.",
    );
  }

  return {
    txjson: buildXrpPaymentTransaction(intent),
    options: {
      submit: true,
      expire: 5,
      force_network: TESTNET_FORCE_NETWORK,
    },
  };
}
