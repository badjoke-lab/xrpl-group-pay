import { isValidClassicAddress } from "xrpl";
import { z } from "zod";

import { unitsToDecimal } from "@/features/money/money";
import {
  paymentIntentSchema,
  type PaymentIntent,
} from "@/features/payment-intents/types";

import { XrplPaymentBuildError } from "./payment-builder";

const uint32Schema = z.number().int().min(0).max(4_294_967_295);
const positiveDecimalSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/)
  .refine((value) => /[1-9]/.test(value));

export const issuedPaymentTransactionSchema = z
  .object({
    TransactionType: z.literal("Payment"),
    Destination: z.string().refine(isValidClassicAddress),
    Amount: z
      .object({
        currency: z.string().regex(/^(?:[A-Z0-9]{3}|[A-F0-9]{40})$/),
        issuer: z.string().min(25).max(35),
        value: positiveDecimalSchema,
      })
      .strict(),
    SourceTag: uint32Schema,
    InvoiceID: z.string().regex(/^[A-F0-9]{64}$/),
    DestinationTag: uint32Schema.optional(),
  })
  .strict();

export type IssuedPaymentTransaction = z.infer<
  typeof issuedPaymentTransactionSchema
>;

export function buildIssuedPaymentTransaction(
  intent: PaymentIntent,
): IssuedPaymentTransaction {
  const parsed = paymentIntentSchema.safeParse(intent);
  if (!parsed.success) {
    throw new XrplPaymentBuildError("The Payment Intent is invalid.");
  }

  const asset = parsed.data.asset;
  if (asset.assetType !== "issued" || asset.issuer.length === 0) {
    throw new XrplPaymentBuildError(
      "The issued-asset builder requires a currency and issuer.",
    );
  }

  return issuedPaymentTransactionSchema.parse({
    TransactionType: "Payment",
    Destination: parsed.data.destination,
    Amount: {
      currency: asset.currency,
      issuer: asset.issuer,
      value: unitsToDecimal(
        parsed.data.amount.units,
        parsed.data.amount.scale,
      ),
    },
    SourceTag: parsed.data.sourceTag,
    InvoiceID: parsed.data.invoiceId,
    ...(parsed.data.destinationTag === null
      ? {}
      : { DestinationTag: parsed.data.destinationTag }),
  });
}
