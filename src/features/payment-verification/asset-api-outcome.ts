import { z } from "zod";

import { recordedVerifiedPaymentSchema } from "@/features/persistence/record-verified-payment";

import { paymentVerificationApiOutcomeSchema } from "./types";
import { verifiedPaymentSchema } from "./verified-payment";

const recordedIssuedVerifiedOutcomeSchema = z
  .object({
    status: z.literal("verified"),
    payment: verifiedPaymentSchema,
    receipt: recordedVerifiedPaymentSchema,
  })
  .strict()
  .superRefine((outcome, context) => {
    if (outcome.payment.asset.assetType !== "issued") {
      context.addIssue({
        code: "custom",
        path: ["payment", "asset", "assetType"],
        message: "The generic endpoint outcome requires an issued Asset.",
      });
    }
    if (outcome.receipt.network !== outcome.payment.network) {
      context.addIssue({
        code: "custom",
        path: ["receipt", "network"],
        message: "Receipt and verified payment networks must match.",
      });
    }
    if (outcome.receipt.transactionId !== outcome.payment.transactionId) {
      context.addIssue({
        code: "custom",
        path: ["receipt", "transactionId"],
        message: "Receipt and verified payment transactions must match.",
      });
    }
    if (outcome.receipt.invoiceId !== outcome.payment.invoiceId) {
      context.addIssue({
        code: "custom",
        path: ["receipt", "invoiceId"],
        message: "Receipt and verified payment InvoiceIDs must match.",
      });
    }
    if (outcome.receipt.assetId !== outcome.payment.asset.id) {
      context.addIssue({
        code: "custom",
        path: ["receipt", "assetId"],
        message: "Receipt and verified payment Assets must match.",
      });
    }
  });

export const assetPaymentVerificationApiOutcomeSchema = z.union([
  paymentVerificationApiOutcomeSchema,
  recordedIssuedVerifiedOutcomeSchema,
]);

export type AssetPaymentVerificationApiOutcome = z.infer<
  typeof assetPaymentVerificationApiOutcomeSchema
>;
