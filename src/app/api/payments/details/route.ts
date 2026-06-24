import { z } from "zod";

import {
  getConfiguredSourceTag,
  SourceTagConfigurationError,
} from "@/config/source-tag";
import { loadPayablePaymentDetails } from "@/features/bills/payment-details";
import {
  PaymentSlotNotFoundError,
  PaymentSlotStateError,
} from "@/features/bills/payment-slot";
import {
  getPaymentsDatabase,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";

export const dynamic = "force-dynamic";

const inputSchema = z
  .object({
    paymentToken: z.string().regex(/^[a-f0-9]{64}$/i),
  })
  .strict();

export type PaymentDetailsRouteDependencies = {
  loadDetails(paymentToken: string): Promise<unknown>;
};

const defaultDependencies: PaymentDetailsRouteDependencies = {
  async loadDetails(paymentToken) {
    const database = await getPaymentsDatabase();
    return loadPayablePaymentDetails(
      database,
      paymentToken,
      getConfiguredSourceTag(),
    );
  },
};

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function handlePaymentDetailsRequest(
  request: Request,
  dependencies: PaymentDetailsRouteDependencies = defaultDependencies,
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
            code: "PAYMENT_DETAILS_REQUEST_TOO_LARGE",
            message: "The payment details request is too large.",
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
    return json(await dependencies.loadDetails(input.paymentToken), 200);
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
    if (
      error instanceof PaymentsDatabaseUnavailableError ||
      error instanceof SourceTagConfigurationError
    ) {
      return json(
        {
          error: {
            code: "PAYMENT_DETAILS_UNAVAILABLE",
            message: error.message,
          },
        },
        503,
      );
    }
    return json(
      {
        error: {
          code: "PAYMENT_DETAILS_FAILED",
          message: "The frozen payment details could not be loaded.",
        },
      },
      500,
    );
  }
}

export function POST(request: Request) {
  return handlePaymentDetailsRequest(request);
}
