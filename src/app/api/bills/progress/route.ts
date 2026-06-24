import { z } from "zod";

import {
  BillProgressDatabaseError,
  BillProgressNotFoundError,
  loadBillProgressByToken,
  type BillProgress,
} from "@/features/bills/progress";
import {
  getPaymentsDatabase,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";

export const dynamic = "force-dynamic";

const MAX_PROGRESS_REQUEST_BYTES = 512;
const requestSchema = z
  .object({
    capabilityToken: z.string().regex(/^[a-f0-9]{64}$/i),
  })
  .strict();

export type BillProgressRouteDependencies = {
  loadProgress(capabilityToken: string): Promise<BillProgress>;
};

const defaultDependencies: BillProgressRouteDependencies = {
  async loadProgress(capabilityToken) {
    const database = await getPaymentsDatabase();
    return loadBillProgressByToken(database, capabilityToken);
  },
};

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function notFound() {
  return json(
    {
      error: {
        code: "BILL_PROGRESS_NOT_FOUND",
        message: "The bill progress link is invalid or unavailable.",
      },
    },
    404,
  );
}

function tooLarge() {
  return json(
    {
      error: {
        code: "BILL_PROGRESS_REQUEST_TOO_LARGE",
        message: "The bill progress request is too large.",
      },
    },
    413,
  );
}

export async function handleBillProgressRequest(
  request: Request,
  dependencies: BillProgressRouteDependencies = defaultDependencies,
) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Send the bill progress request as JSON.",
        },
      },
      415,
    );
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_PROGRESS_REQUEST_BYTES
  ) {
    return tooLarge();
  }

  let capabilityToken: string;
  try {
    const raw = await request.text();
    if (
      new TextEncoder().encode(raw).byteLength > MAX_PROGRESS_REQUEST_BYTES
    ) {
      return tooLarge();
    }
    capabilityToken = requestSchema.parse(JSON.parse(raw) as unknown)
      .capabilityToken;
  } catch {
    return notFound();
  }

  try {
    const progress = await dependencies.loadProgress(capabilityToken);
    return json(progress, 200);
  } catch (error) {
    if (error instanceof BillProgressNotFoundError) {
      return notFound();
    }
    if (
      error instanceof BillProgressDatabaseError ||
      error instanceof PaymentsDatabaseUnavailableError
    ) {
      return json(
        {
          error: {
            code: "BILL_PROGRESS_UNAVAILABLE",
            message: error.message,
          },
        },
        503,
      );
    }
    return json(
      {
        error: {
          code: "BILL_PROGRESS_FAILED",
          message: "The bill progress could not be loaded.",
        },
      },
      500,
    );
  }
}

export function POST(request: Request) {
  return handleBillProgressRequest(request);
}
