import {
  parseXamanWebhookNotification,
  requireXamanWebhookSecret,
  verifyXamanWebhookSignature,
  XAMAN_WEBHOOK_SIGNATURE_HEADER,
  XAMAN_WEBHOOK_TIMESTAMP_HEADER,
  XamanWebhookConfigurationError,
  XamanWebhookPayloadError,
  type XamanWebhookNotification,
} from "@/features/xaman/webhook";

export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BYTES = 64 * 1024;

export type XamanCallbackRouteDependencies = {
  readSecret(): string;
  accept(notification: XamanWebhookNotification): Promise<void> | void;
};

const defaultDependencies: XamanCallbackRouteDependencies = {
  readSecret: () => requireXamanWebhookSecret(),
  accept: () => undefined,
};

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

export async function handleXamanCallbackRequest(
  request: Request,
  dependencies: XamanCallbackRouteDependencies = defaultDependencies,
) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Xaman callbacks must be sent as JSON.",
        },
      },
      415,
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    return json(
      {
        error: {
          code: "XAMAN_WEBHOOK_TOO_LARGE",
          message: "The Xaman callback is too large.",
        },
      },
      413,
    );
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_WEBHOOK_BYTES) {
      return json(
        {
          error: {
            code: "XAMAN_WEBHOOK_TOO_LARGE",
            message: "The Xaman callback is too large.",
          },
        },
        413,
      );
    }
    payload = JSON.parse(raw) as unknown;
  } catch {
    return json(
      {
        error: {
          code: "INVALID_XAMAN_WEBHOOK",
          message: "The Xaman callback body is invalid.",
        },
      },
      400,
    );
  }

  const timestamp = request.headers.get(XAMAN_WEBHOOK_TIMESTAMP_HEADER) ?? "";
  const signature = request.headers.get(XAMAN_WEBHOOK_SIGNATURE_HEADER) ?? "";

  let secret: string;
  try {
    secret = dependencies.readSecret();
  } catch (error) {
    if (error instanceof XamanWebhookConfigurationError) {
      return json(
        {
          error: {
            code: "XAMAN_WEBHOOK_UNAVAILABLE",
            message: "Xaman callback verification is unavailable.",
          },
        },
        503,
      );
    }
    throw error;
  }

  if (
    !timestamp ||
    !signature ||
    !verifyXamanWebhookSignature({ secret, timestamp, signature, payload })
  ) {
    return json(
      {
        error: {
          code: "INVALID_XAMAN_SIGNATURE",
          message: "The Xaman callback signature is invalid.",
        },
      },
      401,
    );
  }

  let notification: XamanWebhookNotification;
  try {
    notification = parseXamanWebhookNotification(payload);
  } catch (error) {
    if (error instanceof XamanWebhookPayloadError) {
      return json(
        {
          error: {
            code: "INVALID_XAMAN_WEBHOOK",
            message: error.message,
          },
        },
        400,
      );
    }
    throw error;
  }

  try {
    await dependencies.accept(notification);
  } catch {
    return json(
      {
        error: {
          code: "XAMAN_WEBHOOK_PROCESSING_FAILED",
          message: "The Xaman callback could not be processed.",
        },
      },
      500,
    );
  }

  return json({ received: true }, 200);
}

export function POST(request: Request) {
  return handleXamanCallbackRequest(request);
}
