import { z } from "zod";

import {
  getXamanEnvironment,
  XamanConfigurationError,
} from "@/config/server-env";
import {
  getPaymentsDatabase,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";
import { RequestPersistenceError } from "@/features/persistence/request-state-errors";
import { XamanApiError, XamanClient } from "@/features/xaman/client";
import {
  synchronizeXamanPayload,
  UnknownXamanPayloadError,
} from "@/features/xaman/payload-lifecycle";

export const dynamic = "force-dynamic";

const payloadIdSchema = z.string().uuid();

function errorResponse(message: string, code: string, status: number) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export type XamanPayloadStatusRouteDependencies = {
  synchronize(payloadId: string): Promise<{
    payload: {
      meta: {
        resolved: boolean;
        signed: boolean;
        expired: boolean;
        cancelled: boolean;
      };
    };
    publicStatus: {
      status: "waiting" | "submitted" | "rejected" | "expired";
      txid: string | null;
    };
  }>;
};

const defaultDependencies: XamanPayloadStatusRouteDependencies = {
  async synchronize(payloadId) {
    const database = await getPaymentsDatabase();
    const environment = getXamanEnvironment();
    const client = new XamanClient(environment);
    return synchronizeXamanPayload(
      database,
      payloadId,
      (id) => client.getPayload(id),
    );
  },
};

export async function handleXamanPayloadStatusRequest(
  context: { params: Promise<{ payloadId: string }> },
  dependencies: XamanPayloadStatusRouteDependencies = defaultDependencies,
) {
  try {
    const { payloadId } = await context.params;
    payloadIdSchema.parse(payloadId);

    const synchronized = await dependencies.synchronize(payloadId);
    const payload = synchronized.payload;

    return Response.json(
      {
        payloadId,
        ...synchronized.publicStatus,
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

    if (error instanceof UnknownXamanPayloadError) {
      return errorResponse(
        "The Xaman payload is invalid or unavailable.",
        "PAYLOAD_NOT_FOUND",
        404,
      );
    }

    if (error instanceof XamanConfigurationError) {
      return errorResponse(error.message, "XAMAN_NOT_CONFIGURED", 503);
    }

    if (error instanceof XamanApiError) {
      return errorResponse(error.message, "XAMAN_API_ERROR", 502);
    }

    if (
      error instanceof PaymentsDatabaseUnavailableError ||
      error instanceof RequestPersistenceError
    ) {
      return errorResponse(
        error.message,
        "PAYLOAD_STATUS_PERSISTENCE_FAILED",
        503,
      );
    }

    return errorResponse(
      "The Xaman payload status could not be loaded.",
      "PAYLOAD_STATUS_FAILED",
      500,
    );
  }
}

export function GET(
  _request: Request,
  context: { params: Promise<{ payloadId: string }> },
) {
  return handleXamanPayloadStatusRequest(context);
}
