import { z } from "zod";

import type { D1DatabaseLike } from "@/features/persistence/d1-types";

import { loadPaymentSlotByToken, requirePayableSlot } from "./payment-slot";

export const paymentDetailsSchema = z
  .object({
    billTitle: z.string().min(1).max(100),
    participantLabel: z.string().max(60).nullable(),
    expectedPayerAddress: z.string().min(1),
    destinationAddress: z.string().min(1),
    destinationTag: z.number().int().min(0).max(4_294_967_295).nullable(),
    amountDrops: z.string().regex(/^[1-9]\d*$/),
    sourceTag: z.number().int().min(0).max(4_294_967_295),
    invoiceId: z.string().regex(/^[A-F0-9]{64}$/),
    network: z.literal("testnet"),
  })
  .strict();

export type PaymentDetails = z.infer<typeof paymentDetailsSchema>;

export async function loadPayablePaymentDetails(
  database: D1DatabaseLike,
  paymentToken: string,
  sourceTag: number,
): Promise<PaymentDetails> {
  const slot = requirePayableSlot(
    await loadPaymentSlotByToken(database, paymentToken),
  );

  return paymentDetailsSchema.parse({
    billTitle: slot.billTitle,
    participantLabel: slot.participantLabel,
    expectedPayerAddress: slot.expectedPayerAddress,
    destinationAddress: slot.destinationAddress,
    destinationTag: slot.destinationTag,
    amountDrops: slot.expectedAmountDrops,
    sourceTag,
    invoiceId: slot.invoiceId,
    network: slot.network,
  });
}
