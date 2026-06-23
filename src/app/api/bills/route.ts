import { ZodError } from "zod";

import {
  BillDatabaseError,
  BillInputError,
  createPublishedBill,
} from "@/features/bills/create-bill";
import type { CreateBillInput, CreatedBill } from "@/features/bills/types";
import { createBillInputSchema } from "@/features/bills/types";
import {
  getPaymentsDatabase,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";

export const dynamic = "force-dynamic";

const MAX_BILL_REQUEST_BYTES = 32_768;

export type BillRouteDependencies = {
  createBill(input: CreateBillInput): Promise<CreatedBill>;
};

const defaultDependencies: BillRouteDependencies = {
  async createBill(input) {
    const database = await getPaymentsDatabase();
    return createPublishedBill(database, input);
  },
};

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
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
