import { z } from "zod";

const uint32 = z
  .number()
  .int()
  .min(0)
  .max(4_294_967_295);

const uint32Text = z
  .string()
  .trim()
  .max(10)
  .regex(/^\d+$/);

const httpsUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === "https:");

const websocketUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === "wss:");

export const createPaymentInputSchema = z
  .object({
    destination: z.string().trim().min(1).max(80),
    amountXrp: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/),
    destinationTag: z.union([uint32Text, uint32]).optional(),
  })
  .strict();

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

const xamanNextSchema = z
  .object({
    always: httpsUrl,
    no_push_msg_received: httpsUrl.optional(),
  })
  .passthrough();

const xamanRefsSchema = z
  .object({
    qr_png: httpsUrl,
    qr_matrix: z.string().optional(),
    qr_uri_quality_opts: z.array(z.string()).optional(),
    websocket_status: websocketUrl,
  })
  .passthrough();

export const xamanCreatePayloadResponseSchema = z
  .object({
    uuid: z.string().uuid(),
    next: xamanNextSchema,
    refs: xamanRefsSchema,
    pushed: z.boolean().optional(),
  })
  .passthrough();

export const xamanPayloadResponseSchema = z
  .object({
    meta: z
      .object({
        exists: z.boolean().optional(),
        uuid: z.string().uuid().optional(),
        resolved: z.boolean(),
        signed: z.boolean(),
        cancelled: z.boolean().optional().default(false),
        expired: z.boolean().optional().default(false),
        opened_by_deeplink: z.boolean().optional(),
      })
      .passthrough(),
    response: z
      .object({
        txid: z
          .string()
          .regex(/^[A-F0-9]{64}$/i)
          .nullable()
          .optional(),
        hex: z.string().nullable().optional(),
        resolved_at: z.string().nullable().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type XamanCreatePayloadResponse = z.infer<
  typeof xamanCreatePayloadResponseSchema
>;
export type XamanPayloadResponse = z.infer<typeof xamanPayloadResponseSchema>;
