import { z } from "zod";

export const transactionHashSchema = z.string().regex(/^[A-F0-9]{64}$/i);
const uint32 = z.number().int().min(0).max(4_294_967_295);

export const xrplTxResultSchema = z
  .object({
    hash: transactionHashSchema,
    validated: z.boolean(),
    ledger_index: z.number().int().nonnegative(),
    tx_json: z
      .object({
        TransactionType: z.string(),
        Account: z.string(),
        Destination: z.string().optional(),
        DeliverMax: z.unknown().optional(),
        Amount: z.unknown().optional(),
        SourceTag: uint32.optional(),
        DestinationTag: uint32.optional(),
        InvoiceID: transactionHashSchema.optional(),
        Flags: uint32.optional(),
        SendMax: z.unknown().optional(),
        Paths: z.unknown().optional(),
      })
      .passthrough(),
    meta: z
      .object({
        TransactionResult: z.string(),
        delivered_amount: z.unknown().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const xrplRpcEnvelopeSchema = z
  .object({
    result: z.unknown(),
  })
  .passthrough();

export type XrplTxResult = z.infer<typeof xrplTxResultSchema>;
