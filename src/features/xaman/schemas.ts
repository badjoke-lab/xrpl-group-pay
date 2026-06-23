import { z } from "zod";

export const createPaymentInputSchema = z.object({
  destination: z.string().trim().min(1),
  amountXrp: z.string().trim().min(1),
  destinationTag: z.union([z.string(), z.number()]).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

const xamanNextSchema = z.object({
  always: z.string().url(),
  no_push_msg_received: z.string().url().optional(),
}).passthrough();

const xamanRefsSchema = z.object({
  qr_png: z.string().url(),
  qr_matrix: z.string().optional(),
  qr_uri_quality_opts: z.array(z.string()).optional(),
  websocket_status: z.string().url(),
}).passthrough();

export const xamanCreatePayloadResponseSchema = z.object({
  uuid: z.string().uuid(),
  next: xamanNextSchema,
  refs: xamanRefsSchema,
  pushed: z.boolean().optional(),
}).passthrough();

export const xamanPayloadResponseSchema = z.object({
  meta: z.object({
    exists: z.boolean().optional(),
    uuid: z.string().uuid().optional(),
    resolved: z.boolean(),
    signed: z.boolean(),
    cancelled: z.boolean().optional().default(false),
    expired: z.boolean().optional().default(false),
    opened_by_deeplink: z.boolean().optional(),
  }).passthrough(),
  response: z.object({
    txid: z.string().nullable().optional(),
    hex: z.string().nullable().optional(),
    resolved_at: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

export type XamanCreatePayloadResponse = z.infer<
  typeof xamanCreatePayloadResponseSchema
>;
export type XamanPayloadResponse = z.infer<typeof xamanPayloadResponseSchema>;
