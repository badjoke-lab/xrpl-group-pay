import { z } from "zod";

import { assetDescriptorSchema } from "@/features/assets/types";
import { moneyAmountSchema } from "@/features/money/types";

export const testnetSettlementAssetIdSchema = z.enum([
  "xrpl:testnet:xrp",
  "xrpl:testnet:rlusd",
]);

const decimalAmountSchema = z
  .string()
  .trim()
  .regex(
    /^\d+(?:\.\d{1,6})?$/,
    "Use an amount with up to six decimal places.",
  );

const destinationTagSchema = z.union([
  z.number().int().min(0).max(4_294_967_295),
  z.string().trim().regex(/^\d+$/),
]);

const dropsSchema = z.string().regex(/^(?:0|[1-9]\d*)$/);
const positiveDropsSchema = z.string().regex(/^[1-9]\d*$/);
const participantInputSchema = z
  .object({
    label: z.string().trim().max(60).optional(),
    expectedPayerAddress: z.string().trim().min(1),
    amount: decimalAmountSchema,
  })
  .strict();

const canonicalCreateBillInputSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    destinationAddress: z.string().trim().min(1),
    destinationTag: destinationTagSchema.optional(),
    settlementAssetId: testnetSettlementAssetIdSchema,
    totalAmount: decimalAmountSchema,
    creatorShareAmount: decimalAmountSchema,
    participants: z.array(participantInputSchema).min(2).max(50),
  })
  .strict();

const legacyXrpCreateBillInputSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    destinationAddress: z.string().trim().min(1),
    destinationTag: destinationTagSchema.optional(),
    totalXrp: decimalAmountSchema,
    creatorShareXrp: decimalAmountSchema,
    participants: z
      .array(
        z
          .object({
            label: z.string().trim().max(60).optional(),
            expectedPayerAddress: z.string().trim().min(1),
            amountXrp: decimalAmountSchema,
          })
          .strict(),
      )
      .min(2)
      .max(50),
  })
  .strict()
  .transform((input) => ({
    title: input.title,
    destinationAddress: input.destinationAddress,
    ...(input.destinationTag === undefined
      ? {}
      : { destinationTag: input.destinationTag }),
    settlementAssetId: "xrpl:testnet:xrp" as const,
    totalAmount: input.totalXrp,
    creatorShareAmount: input.creatorShareXrp,
    participants: input.participants.map((participant) => ({
      ...(participant.label === undefined ? {} : { label: participant.label }),
      expectedPayerAddress: participant.expectedPayerAddress,
      amount: participant.amountXrp,
    })),
  }));

export const createBillInputSchema = z.union([
  canonicalCreateBillInputSchema,
  legacyXrpCreateBillInputSchema,
]);

export type CreateBillInput = z.output<typeof createBillInputSchema>;

const reviewedParticipantSchema = z
  .object({
    participantLabel: z.string().max(60).nullable(),
    expectedPayerAddress: z.string().min(1),
    expectedAmount: moneyAmountSchema,
    expectedAmountDrops: positiveDropsSchema.nullable(),
  })
  .strict();

export const billReviewSchema = z
  .object({
    network: z.literal("testnet"),
    title: z.string().min(1).max(100),
    destinationAddress: z.string().min(1),
    destinationTag: z.number().int().min(0).max(4_294_967_295).nullable(),
    asset: assetDescriptorSchema,
    totalAmount: moneyAmountSchema,
    creatorShareAmount: moneyAmountSchema,
    allocatedAmount: moneyAmountSchema,
    totalDrops: positiveDropsSchema.nullable(),
    creatorShareDrops: dropsSchema.nullable(),
    allocatedDrops: positiveDropsSchema.nullable(),
    participants: z.array(reviewedParticipantSchema),
  })
  .strict();

export type BillReview = z.infer<typeof billReviewSchema>;

export const createdBillSchema = z
  .object({
    bill: z
      .object({
        publicId: z.string().uuid(),
        title: z.string().min(1).max(100),
        network: z.literal("testnet"),
        destinationAddress: z.string().min(1),
        destinationTag: z.number().int().min(0).max(4_294_967_295).nullable(),
        asset: assetDescriptorSchema,
        totalAmount: moneyAmountSchema,
        creatorShareAmount: moneyAmountSchema,
        totalDrops: dropsSchema.nullable(),
        creatorShareDrops: dropsSchema.nullable(),
        status: z.literal("open"),
        revision: z.literal(1),
        frozenAt: z.string().datetime(),
        createdAt: z.string().datetime(),
      })
      .strict(),
    capabilities: z
      .object({
        publicToken: z.string().regex(/^[a-f0-9]{64}$/),
        adminToken: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict(),
    slots: z.array(
      z
        .object({
          publicId: z.string().uuid(),
          participantLabel: z.string().max(60).nullable(),
          expectedPayerAddress: z.string().min(1),
          asset: assetDescriptorSchema,
          expectedAmount: moneyAmountSchema,
          expectedAmountDrops: positiveDropsSchema.nullable(),
          invoiceId: z.string().regex(/^[A-F0-9]{64}$/),
          status: z.literal("unpaid"),
          paymentToken: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .strict(),
    ),
  })
  .strict();

export type CreatedBill = z.infer<typeof createdBillSchema>;
