import { z } from "zod";

const amountXrpSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,6})?$/, "Use an XRP amount with up to six decimals.");

const destinationTagSchema = z.union([
  z.number().int().min(0).max(4_294_967_295),
  z.string().trim().regex(/^\d+$/),
]);

const dropsSchema = z.string().regex(/^(?:0|[1-9]\d*)$/);
const positiveDropsSchema = z.string().regex(/^[1-9]\d*$/);

export const createBillInputSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    destinationAddress: z.string().trim().min(1),
    destinationTag: destinationTagSchema.optional(),
    totalXrp: amountXrpSchema,
    creatorShareXrp: amountXrpSchema,
    participants: z
      .array(
        z
          .object({
            label: z.string().trim().max(60).optional(),
            expectedPayerAddress: z.string().trim().min(1),
            amountXrp: amountXrpSchema,
          })
          .strict(),
      )
      .min(2)
      .max(50),
  })
  .strict();

export type CreateBillInput = z.infer<typeof createBillInputSchema>;

export const billReviewSchema = z
  .object({
    network: z.literal("testnet"),
    title: z.string().min(1).max(100),
    destinationAddress: z.string().min(1),
    destinationTag: z.number().int().min(0).max(4_294_967_295).nullable(),
    totalDrops: positiveDropsSchema,
    creatorShareDrops: dropsSchema,
    allocatedDrops: positiveDropsSchema,
    participants: z.array(
      z
        .object({
          participantLabel: z.string().max(60).nullable(),
          expectedPayerAddress: z.string().min(1),
          expectedAmountDrops: positiveDropsSchema,
        })
        .strict(),
    ),
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
        totalDrops: dropsSchema,
        creatorShareDrops: dropsSchema,
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
          expectedAmountDrops: positiveDropsSchema,
          invoiceId: z.string().regex(/^[A-F0-9]{64}$/),
          status: z.literal("unpaid"),
          paymentToken: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .strict(),
    ),
  })
  .strict();

export type CreatedBill = z.infer<typeof createdBillSchema>;
