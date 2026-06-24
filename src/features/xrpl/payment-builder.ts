import { isValidClassicAddress } from "xrpl";
import { z } from "zod";

import {
  paymentIntentSchema,
  type PaymentIntent,
} from "@/features/payment-intents/types";

const uint32Schema = z.number().int().min(0).max(4_294_967_295);

export const xrpPaymentTransactionSchema = z
  .object({
    TransactionType: z.literal("Payment"),
    Destination: z.string().refine(isValidClassicAddress),
    Amount: z.string().regex(/^[1-9]\d*$/),
    SourceTag: uint32Schema,
    InvoiceID: z.string().regex(/^[A-F0-9]{64}$/),
    DestinationTag: uint32Schema.optional(),
  })
  .strict();

export type XrpPaymentTransaction = z.infer<
  typeof xrpPaymentTransactionSchema
>;

export class XrplPaymentBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XrplPaymentBuildError";
  }
}

export function buildXrpPaymentTransaction(
  intent: PaymentIntent,
): XrpPaymentTransaction {
  const parsed = paymentIntentSchema.safeParse(intent);
  if (!parsed.success) {
    throw new XrplPaymentBuildError("The Payment Intent is invalid.");
  }

  const asset = parsed.data.asset;
  if (
    asset.assetType !== "native" ||
    asset.currency !== "XRP" ||
    asset.issuer !== null ||
    parsed.data.amount.code !== "XRP" ||
    parsed.data.amount.scale !== 6
  ) {
    throw new XrplPaymentBuildError(
      "The XRP builder accepts only a native XRP Payment Intent.",
    );
  }

  return xrpPaymentTransactionSchema.parse({
    TransactionType: "Payment",
    Destination: parsed.data.destination,
    Amount: parsed.data.amount.units,
    SourceTag: parsed.data.sourceTag,
    InvoiceID: parsed.data.invoiceId,
    ...(parsed.data.destinationTag === null
      ? {}
      : { DestinationTag: parsed.data.destinationTag }),
  });
}
