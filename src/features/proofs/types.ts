import { z } from "zod";

const upperHex256Schema = z.string().regex(/^[A-F0-9]{64}$/);
const dropsSchema = z.string().regex(/^(?:0|[1-9]\d*)$/);
const uint32Schema = z.number().int().min(0).max(4_294_967_295);

export const publicTransactionProofSchema = z
  .object({
    network: z.literal("testnet"),
    validationStatus: z.literal("validated"),
    transactionResult: z.literal("tesSUCCESS"),
    transactionId: upperHex256Schema,
    ledgerIndex: z.number().int().min(0),
    sender: z.string().min(1),
    destination: z.string().min(1),
    amountDrops: dropsSchema,
    deliveredAmountDrops: dropsSchema,
    sourceTag: uint32Schema,
    destinationTag: uint32Schema.nullable(),
    invoiceId: upperHex256Schema,
    verifiedAt: z.string().datetime(),
    recordedAt: z.string().datetime(),
    proofDigest: upperHex256Schema,
  })
  .strict();

export type PublicTransactionProof = z.infer<
  typeof publicTransactionProofSchema
>;
