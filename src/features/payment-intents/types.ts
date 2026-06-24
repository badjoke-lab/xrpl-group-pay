import { isValidClassicAddress } from "xrpl";
import { z } from "zod";

import { assetDescriptorSchema } from "@/features/assets/types";
import { moneyAmountSchema } from "@/features/money/types";

const uint32Schema = z.number().int().min(0).max(4_294_967_295);
const hash256Schema = z.string().regex(/^[A-F0-9]{64}$/);
const classicAddressSchema = z.string().refine(isValidClassicAddress);

export const paymentIntentSchema = z
  .object({
    intentId: z.string().min(1).max(200),
    paymentSlotId: z.string().min(1).max(200),
    paymentRail: z.literal("xrpl"),
    network: z.enum(["testnet", "mainnet"]),
    asset: assetDescriptorSchema,
    amount: moneyAmountSchema,
    destination: classicAddressSchema,
    destinationTag: uint32Schema.nullable(),
    sourceTag: uint32Schema,
    invoiceId: hash256Schema,
    expectedPayer: classicAddressSchema,
    expiresAt: z.string().datetime(),
    revision: z.number().int().min(1),
  })
  .strict()
  .superRefine((intent, context) => {
    if (intent.asset.paymentRail !== intent.paymentRail) {
      context.addIssue({
        code: "custom",
        path: ["asset", "paymentRail"],
        message: "Asset and Payment Intent rails must match.",
      });
    }
    if (intent.asset.network !== intent.network) {
      context.addIssue({
        code: "custom",
        path: ["asset", "network"],
        message: "Asset and Payment Intent networks must match.",
      });
    }
    if (intent.amount.code !== intent.asset.symbol) {
      context.addIssue({
        code: "custom",
        path: ["amount", "code"],
        message: "Amount code must match the selected Asset.",
      });
    }
    if (intent.amount.scale !== intent.asset.precision) {
      context.addIssue({
        code: "custom",
        path: ["amount", "scale"],
        message: "Amount scale must match the selected Asset precision.",
      });
    }
    if (BigInt(intent.amount.units) <= 0n) {
      context.addIssue({
        code: "custom",
        path: ["amount", "units"],
        message: "Payment Intent amount must be greater than zero.",
      });
    }
  });

export type PaymentIntent = z.infer<typeof paymentIntentSchema>;
