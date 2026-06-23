import { z } from "zod";

export const recordedPaymentReceiptSchema = z
  .object({
    receiptId: z.string().min(1),
    status: z.enum(["created", "existing"]),
    network: z.literal("testnet"),
    transactionId: z.string().regex(/^[A-F0-9]{64}$/),
    invoiceId: z.string().regex(/^[A-F0-9]{64}$/),
    recordedAt: z.string().datetime(),
    proofDigest: z.string().regex(/^[A-F0-9]{64}$/),
  })
  .strict();

export type RecordedPaymentReceipt = z.infer<
  typeof recordedPaymentReceiptSchema
>;
