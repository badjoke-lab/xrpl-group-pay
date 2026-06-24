import { ZodError } from "zod";

import {
  BillInputError,
  prepareBillReview,
} from "@/features/bills/create-bill";
import {
  createBillInputSchema,
  type BillReview,
  type CreateBillInput,
} from "@/features/bills/types";

export const dynamic = "force-dynamic";

const MAX_BILL_REQUEST_BYTES = 32_768;

export type BillReviewRouteDependencies = {
  reviewBill(input: CreateBillInput): BillReview;
};

const defaultDependencies: BillReviewRouteDependencies = {
  reviewBill: prepareBillReview,
};

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function tooLarge() {
  return json(
    {
      error: {
        code: "BILL_REVIEW_REQUEST_TOO_LARGE",
        message: "The bill review request is too large.",
      },
    },
    413,
  );
}

export async function handleReviewBillRequest(
  request: Request,
  dependencies: BillReviewRouteDependencies = defaultDependencies,
) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Send the bill review as JSON.",
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
    return tooLarge();
  }

  let input: CreateBillInput;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BILL_REQUEST_BYTES) {
      return tooLarge();
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
          message: "The bill review request must contain valid JSON.",
        },
      },
      400,
    );
  }

  try {
    return json(dependencies.reviewBill(input), 200);
  } catch (error) {
    if (error instanceof BillInputError) {
      return json(
        { error: { code: "INVALID_BILL_INPUT", message: error.message } },
        400,
      );
    }
    return json(
      {
        error: {
          code: "BILL_REVIEW_FAILED",
          message: "The bill could not be reviewed.",
        },
      },
      500,
    );
  }
}

export function POST(request: Request) {
  return handleReviewBillRequest(request);
}
