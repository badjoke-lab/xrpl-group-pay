import { z } from "zod";

import { getXrpAssetDescriptor } from "@/features/assets/registry";
import { assetDescriptorSchema } from "@/features/assets/types";
import { moneyAmountSchema } from "@/features/money/types";
import type { D1DatabaseLike } from "@/features/persistence/d1-types";

import {
  loadPaymentSlotByToken,
  requirePayableSlot,
  type ResolvedPaymentSlot,
} from "./payment-slot";

const legacyDropsSchema = z.string().regex(/^[1-9]\d*$/).nullable();

export const paymentDetailsSchema = z
  .object({
    billTitle: z.string().min(1).max(100),
    participantLabel: z.string().max(60).nullable(),
    expectedPayerAddress: z.string().min(1),
    destinationAddress: z.string().min(1),
    destinationTag: z.number().int().min(0).max(4_294_967_295).nullable(),
    asset: assetDescriptorSchema,
    amount: moneyAmountSchema,
    amountDrops: legacyDropsSchema,
    sourceTag: z.number().int().min(0).max(4_294_967_295),
    invoiceId: z.string().regex(/^[A-F0-9]{64}$/),
    network: z.literal("testnet"),
  })
  .strict()
  .superRefine((details, context) => {
    if (details.asset.network !== details.network) {
      context.addIssue({
        code: "custom",
        path: ["asset", "network"],
        message: "The Asset network must match the payment network.",
      });
    }
    if (
      details.amount.code !== details.asset.symbol ||
      details.amount.scale !== details.asset.precision
    ) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "The amount code and scale must match the Asset contract.",
      });
    }
    if (BigInt(details.amount.units) <= 0n) {
      context.addIssue({
        code: "custom",
        path: ["amount", "units"],
        message: "The payment amount must be greater than zero.",
      });
    }
    if (
      details.asset.assetType === "native" &&
      details.amountDrops !== details.amount.units
    ) {
      context.addIssue({
        code: "custom",
        path: ["amountDrops"],
        message: "Native XRP compatibility drops must match the generic amount.",
      });
    }
    if (details.asset.assetType === "issued" && details.amountDrops !== null) {
      context.addIssue({
        code: "custom",
        path: ["amountDrops"],
        message: "Issued Assets must not be represented as XRP drops.",
      });
    }
  });

export type PaymentDetails = z.infer<typeof paymentDetailsSchema>;

export function paymentDetailsFromSlot(
  slot: ResolvedPaymentSlot,
  sourceTag: number,
): PaymentDetails {
  const asset = slot.asset ?? getXrpAssetDescriptor(slot.network);
  const amount = slot.expectedAmount ?? {
    code: asset.symbol,
    units: slot.expectedAmountDrops,
    scale: asset.precision,
  };

  return paymentDetailsSchema.parse({
    billTitle: slot.billTitle,
    participantLabel: slot.participantLabel,
    expectedPayerAddress: slot.expectedPayerAddress,
    destinationAddress: slot.destinationAddress,
    destinationTag: slot.destinationTag,
    asset,
    amount,
    amountDrops: asset.assetType === "native" ? amount.units : null,
    sourceTag,
    invoiceId: slot.invoiceId,
    network: slot.network,
  });
}

export async function loadPayablePaymentDetails(
  database: D1DatabaseLike,
  paymentToken: string,
  sourceTag: number,
): Promise<PaymentDetails> {
  const slot = requirePayableSlot(
    await loadPaymentSlotByToken(database, paymentToken),
  );

  return paymentDetailsFromSlot(slot, sourceTag);
}
