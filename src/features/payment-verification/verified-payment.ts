import { z } from "zod";

import { getXrpAssetDescriptor } from "@/features/assets/registry";
import { assetDescriptorSchema } from "@/features/assets/types";
import { moneyAmountSchema } from "@/features/money/types";

import {
  ledgerVerificationProofSchema,
  type LedgerVerificationProof,
} from "./types";

const hash256Schema = z.string().regex(/^[A-F0-9]{64}$/);
const uint32Schema = z.number().int().min(0).max(4_294_967_295);

export const VERIFIED_PAYMENT_CONTRACT_VERSION =
  "xrpl-group-pay:verified-payment:v1" as const;

export const verifiedPaymentSchema = z
  .object({
    contractVersion: z.literal(VERIFIED_PAYMENT_CONTRACT_VERSION),
    receiptContract: z.enum([
      "xrpl-xrp-payment-v1",
      "xrpl-issued-payment-v1",
    ]),
    network: z.enum(["testnet", "mainnet"]),
    transactionId: hash256Schema,
    ledgerIndex: z.number().int().nonnegative(),
    sender: z.string().min(1),
    destination: z.string().min(1),
    asset: assetDescriptorSchema,
    requestedAmount: moneyAmountSchema,
    deliveredAmount: moneyAmountSchema,
    sourceTag: uint32Schema,
    destinationTag: uint32Schema.nullable(),
    invoiceId: hash256Schema,
    idempotencyKey: z.string().min(1),
    verifiedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((payment, context) => {
    if (payment.asset.network !== payment.network) {
      context.addIssue({
        code: "custom",
        path: ["asset", "network"],
        message: "Asset and verified payment networks must match.",
      });
    }
    if (payment.receiptContract !== payment.asset.receiptContract) {
      context.addIssue({
        code: "custom",
        path: ["receiptContract"],
        message: "Receipt contract must match the Asset descriptor.",
      });
    }
    for (const field of ["requestedAmount", "deliveredAmount"] as const) {
      const amount = payment[field];
      if (
        amount.code !== payment.asset.symbol ||
        amount.scale !== payment.asset.precision
      ) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Amount identity must match the Asset descriptor.",
        });
      }
    }
    const expectedKey = `${payment.network}:${payment.transactionId}`;
    if (payment.idempotencyKey !== expectedKey) {
      context.addIssue({
        code: "custom",
        path: ["idempotencyKey"],
        message: "Idempotency key must match the network and transaction.",
      });
    }
  });

export type VerifiedPayment = z.infer<typeof verifiedPaymentSchema>;

export function verifiedPaymentFromXrpProof(
  input: LedgerVerificationProof,
): VerifiedPayment {
  const proof = ledgerVerificationProofSchema.parse(input);
  const asset = getXrpAssetDescriptor(proof.network);

  return verifiedPaymentSchema.parse({
    contractVersion: VERIFIED_PAYMENT_CONTRACT_VERSION,
    receiptContract: asset.receiptContract,
    network: proof.network,
    transactionId: proof.transactionId.toUpperCase(),
    ledgerIndex: proof.ledgerIndex,
    sender: proof.sender,
    destination: proof.destination,
    asset,
    requestedAmount: {
      code: asset.symbol,
      units: proof.amountDrops,
      scale: asset.precision,
    },
    deliveredAmount: {
      code: asset.symbol,
      units: proof.deliveredAmountDrops,
      scale: asset.precision,
    },
    sourceTag: proof.sourceTag,
    destinationTag: proof.destinationTag,
    invoiceId: proof.invoiceId.toUpperCase(),
    idempotencyKey: `${proof.network}:${proof.transactionId.toUpperCase()}`,
    verifiedAt: proof.verifiedAt,
  });
}
