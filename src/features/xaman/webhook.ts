import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const XAMAN_WEBHOOK_SIGNATURE_HEADER =
  "x-xumm-request-signature" as const;
export const XAMAN_WEBHOOK_TIMESTAMP_HEADER =
  "x-xumm-request-timestamp" as const;

const uuidSchema = z.string().uuid();

const xamanWebhookSchema = z
  .object({
    meta: z
      .object({
        application_uuidv4: uuidSchema,
        payload_uuidv4: uuidSchema,
      })
      .passthrough(),
    payloadResponse: z
      .object({
        payload_uuidv4: uuidSchema,
        signed: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .superRefine((value, context) => {
    const responsePayloadId = value.payloadResponse?.payload_uuidv4;
    if (
      responsePayloadId &&
      responsePayloadId !== value.meta.payload_uuidv4
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Xaman webhook payload identifiers do not match.",
      });
    }
  });

export type XamanWebhookNotification = z.infer<typeof xamanWebhookSchema>;

export class XamanWebhookConfigurationError extends Error {
  constructor() {
    super("Xaman webhook verification is not configured.");
    this.name = "XamanWebhookConfigurationError";
  }
}

export class XamanWebhookPayloadError extends Error {
  constructor(message = "The Xaman webhook payload is invalid.") {
    super(message);
    this.name = "XamanWebhookPayloadError";
  }
}

export function requireXamanWebhookSecret(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const secret = environment.XAMAN_API_SECRET?.trim();
  if (!secret || secret.length > 256) {
    throw new XamanWebhookConfigurationError();
  }
  return secret;
}

function xamanHmacKey(secret: string) {
  // Xaman's documented webhook signature contract removes the first hyphen
  // from the application secret before calculating the HMAC-SHA1 digest.
  return secret.replace("-", "");
}

export function createXamanWebhookSignature(
  secret: string,
  timestamp: string,
  payload: unknown,
) {
  if (!secret.trim() || !timestamp.trim()) {
    throw new XamanWebhookPayloadError(
      "Xaman webhook signature inputs are incomplete.",
    );
  }

  return createHmac("sha1", xamanHmacKey(secret.trim()))
    .update(timestamp + JSON.stringify(payload))
    .digest("hex");
}

export function verifyXamanWebhookSignature(input: {
  secret: string;
  timestamp: string;
  signature: string;
  payload: unknown;
}) {
  if (!/^[a-f0-9]{40}$/i.test(input.signature)) return false;

  const expected = Buffer.from(
    createXamanWebhookSignature(
      input.secret,
      input.timestamp,
      input.payload,
    ),
    "hex",
  );
  const received = Buffer.from(input.signature, "hex");

  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function parseXamanWebhookNotification(
  payload: unknown,
): XamanWebhookNotification {
  const parsed = xamanWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    throw new XamanWebhookPayloadError();
  }
  return parsed.data;
}
