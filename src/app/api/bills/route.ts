import { ZodError } from "zod";

import {
  controlledMainnetAuthorizationFailure,
  type MainnetAcceptanceAuthorizer,
} from "@/config/mainnet-acceptance-http";
import {
  assertPaymentOperationAllowed,
  PaymentOperationsConfigurationError,
  PaymentOperationsHaltedError,
} from "@/config/payment-operations";
import {
  BillDatabaseError,
  BillInputError,
  createPublishedBill,
} from "@/features/bills/create-bill";
import type { CreateBillInput, CreatedBill } from "@/features/bills/types";
import { createBillInputSchema } from "@/features/bills/types";
import {
  getPaymentsDatabaseContext,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";

export const dynamic = "force-dynamic";

const MAX_BILL_REQUEST_BYTES = 32_768;

export type BillRouteDependencies = {
  authorize?: MainnetAcceptanceAuthorizer;
  createBill(input: CreateBillInput): Promise<CreatedBill>;
};

const defaultDependencies: BillRouteDependencies = {
  async createBill(input) {
    assertPaymentOperationAllowed(process.env, "create");
    const { database, target } = await getPaymentsDatabaseContext();
    return createPublishedBill(
      database,
      input,
      new Date(),
      undefined,
      target.network,
    );
  },
};

function json(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export async function handleCreateBillRequest(
  request: Request,
  dependencies: BillRouteDependencies = defaultDependencies,
) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Send the bill as JSON.",
        },
      },
      415,
    );
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_BILL_REQUEST_BYTES
  ) {
    return json(
      {
        error: {
          code: "BILL_REQUEST_TOO_LARGE",
          message: "The bill request is too large.",
        },
      },
      413,
    );
  }

  const authorizationFailure = await controlledMainnetAuthorizationFailure(
    request,
    dependencies.authorize,
  );
  if (authorizationFailure) return authorizationFailure;

  let input: CreateBillInput;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BILL_REQUEST_BYTES) {
      return json(
        {
          error: {
            code: "BILL_REQUEST_TOO_LARGE",
            message: "The bill request is too large.",
          },
        },
        413,
      );
    }
    input = createBillInputSchema.parse(JSON.parse(raw) as unknown);
  } catch (error) {
    if (error instanceof ZodError) {
      return json(
        {
          error: {
            code: "INVALID_BILL_INPUT",
            message: "Check the bill title, destination, total, and participants.",
          },
        },
        400,
      );
    }
    return json(
      {
        error: {
          code: "INVALID_JSON",
          message: "The bill request must contain valid JSON.",
        },
      },
      400,
    );
  }

  try {
    const created = await dependencies.createBill(input);
    return json(created, 201);
  } catch (error) {
    if (error instanceof PaymentOperationsHaltedError) {
      return json(
        {
          error: {
            code: error.code,
            operation: error.operation,
            mode: error.mode,
            message: error.message,
          },
        },
        503,
        { "Retry-After": "60" },
      );
    }
    if (error instanceof PaymentOperationsConfigurationError) {
      return json(
        {
          error: {
            code: "PAYMENT_OPERATIONS_UNAVAILABLE",
            message: error.message,
          },
        },
        503,
      );
    }
    if (error instanceof BillInputError) {
      return json(
        { error: { code: "INVALID_BILL_INPUT", message: error.message } },
        400,
      );
    }
    if (
      error instanceof PaymentsDatabaseUnavailableError ||
      error instanceof BillDatabaseError
    ) {
      return json(
        {
          error: {
            code: "BILL_STORAGE_UNAVAILABLE",
            message: error.message,
          },
        },
        503,
      );
    }
    return json(
      {
        error: {
          code: "BILL_CREATION_FAILED",
          message: "The bill could not be created.",
        },
      },
      500,
    );
  }
}

export function POST(request: Request) {
  return handleCreateBillRequest(request);
}
