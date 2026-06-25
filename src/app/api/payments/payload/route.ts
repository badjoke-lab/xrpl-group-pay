import { z } from "zod";

import {
  getXamanEnvironment,
  XamanConfigurationError,
} from "@/config/server-env";
import { createPersistedSlotPayload } from "@/features/bills/create-persisted-payload";
import {
  PaymentSlotNotFoundError,
  PaymentSlotStateError,
} from "@/features/bills/payment-slot";
import {
  getPaymentsDatabase,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";
import {
  ActiveRequestError,
  RequestPersistenceError,
} from "@/features/persistence/request-state-errors";
import { WalletProviderError } from "@/features/wallet-providers/types";
import { XamanApiError } from "@/features/xaman/client";
import { createXamanProvider } from "@/features/xaman/provider";

export const dynamic = "force-dynamic";

const inputSchema = z
  .object({
    paymentToken: z.string().regex(/^[a-f0-9]{64}$/i),
  })
  .strict();

export type SlotPayloadRouteDependencies = {
  createPayload(paymentToken: string): Promise<unknown>;
};

const defaultDependencies: SlotPayloadRouteDependencies = {
  async createPayload(paymentToken) {
    const database = await getPaymentsDatabase();
    const environment = getXamanEnvironment();
    const provider = createXamanProvider(environment);
    return createPersistedSlotPayload(database, paymentToken, {
      sourceTag: environment.XRPL_SOURCE_TAG,
      createHandoff: (intent) => provider.createHandoff(intent),
    });
  },
};

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function handleCreateSlotPayloadRequest(
  request: Request,
  dependencies: SlotPayloadRouteDependencies = defaultDependencies,
) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Send the payment capability as JSON.",
        },
      },
      415,
    );
  }

  let input: z.infer<typeof inputSchema>;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 256) {
      return json(
        {
          error: {
            code: "PAYLOAD_REQUEST_TOO_LARGE",
            message: "The payload request is too large.",
          },
        },
        413,
      );
    }
    input = inputSchema.parse(JSON.parse(raw) as unknown);
  } catch {
    return json(
      {
        error: {
          code: "INVALID_PAYMENT_CAPABILITY",
          message: "The payment link is invalid or unavailable.",
        },
      },
      404,
    );
  }

  try {
    return json(await dependencies.createPayload(input.paymentToken), 201);
  } catch (error) {
    if (error instanceof PaymentSlotNotFoundError) {
      return json(
        {
          error: {
            code: "PAYMENT_SLOT_NOT_FOUND",
            message: "The payment link is invalid or unavailable.",
          },
        },
        404,
      );
    }
    if (error instanceof PaymentSlotStateError) {
      return json(
        { error: { code: error.code, message: error.message } },
        409,
      );
    }
    if (error instanceof ActiveRequestError) {
      return json(
        {
          error: {
            code: "ACTIVE_HANDOFF_EXISTS",
            message: error.message,
          },
        },
        409,
      );
    }
    if (
      error instanceof PaymentsDatabaseUnavailableError ||
      error instanceof XamanConfigurationError ||
      error instanceof RequestPersistenceError
    ) {
      return json(
        {
          error: {
            code: "PAYMENT_SERVICE_UNAVAILABLE",
            message: error.message,
          },
        },
        503,
      );
    }
    if (error instanceof WalletProviderError) {
      return json(
        {
          error: {
            code: "WALLET_PROVIDER_ERROR",
            provider: error.providerId,
            reason: error.code,
            message: error.message,
          },
        },
        error.code === "UNSUPPORTED_INTENT" ? 422 : 502,
      );
    }
    if (error instanceof XamanApiError) {
      return json(
        { error: { code: "WALLET_PROVIDER_ERROR", message: error.message } },
        502,
      );
    }
    return json(
      {
        error: {
          code: "PAYLOAD_CREATION_FAILED",
          message: "The Wallet Handoff could not be created.",
        },
      },
      500,
    );
  }
}

export function POST(request: Request) {
  return handleCreateSlotPayloadRequest(request);
}
