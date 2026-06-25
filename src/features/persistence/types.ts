import { z } from "zod";

import { xrplNetworkSchema } from "@/features/assets/types";

export const recordedPaymentReceiptSchema = z
  .object({
    receiptId: z.string().min(1),
    status: z.enum(["created", "existing"]),
    network: xrplNetworkSchema,
    transactionId: z.string().regex(/^[A-F0-9]{64}$/),
    invoiceId: z.string().regex(/^[A-F0-9]{64}$/),
    recordedAt: z.string().datetime(),
    proofDigest: z.string().regex(/^[A-F0-9]{64}$/),
  })
  .strict()
  .superRefine((receipt, context) => {
    if (receipt.receiptId !== `${receipt.network}:${receipt.transactionId}`) {
      context.addIssue({
        code: "custom",
        path: ["receiptId"],
        message: "Receipt ID must match the network and transaction.",
      });
    }
  });

export type RecordedPaymentReceipt = z.infer<
  typeof recordedPaymentReceiptSchema
>;
