import { z } from "zod";

import {
  getXamanEnvironment,
  XamanConfigurationError,
} from "@/config/server-env";
import { XamanApiError, XamanClient } from "@/features/xaman/client";
import { normalizeXamanStatus } from "@/features/xaman/status";

export const dynamic = "force-dynamic";

const payloadIdSchema = z.string().uuid();

function errorResponse(message: string, code: string, status: number) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ payloadId: string }> },
) {
  try {
    const { payloadId } = await context.params;
    payloadIdSchema.parse(payloadId);

    const environment = getXamanEnvironment();
    const payload = await new XamanClient(environment).getPayload(payloadId);
    const normalized = normalizeXamanStatus(payload);

    return Response.json(
      {
        payloadId,
        ...normalized,
        resolved: payload.meta.resolved,
        signed: payload.meta.signed,
        expired: payload.meta.expired,
        cancelled: payload.meta.cancelled,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(
        "Invalid payload identifier.",
        "INVALID_PAYLOAD_ID",
        400,
      );
    }

    if (error instanceof XamanConfigurationError) {
      return errorResponse(error.message, "XAMAN_NOT_CONFIGURED", 503);
    }

    if (error instanceof XamanApiError) {
      return errorResponse(error.message, "XAMAN_API_ERROR", 502);
    }

    return errorResponse(
      "The Xaman payload status could not be loaded.",
      "PAYLOAD_STATUS_FAILED",
      500,
    );
  }
}
