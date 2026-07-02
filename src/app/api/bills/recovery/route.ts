import { z } from "zod";

import {
  authorizeReviewedSlotRetry,
  BillRecoveryDatabaseError,
  BillRecoveryNotFoundError,
  BillRecoveryStateError,
  closeBillIncomplete,
  loadBillReviewManagement,
} from "@/features/bills/bill-recovery-management";
import {
  getPaymentsDatabase,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";

export const dynamic = "force-dynamic";

const capabilitySchema = z.string().regex(/^[a-f0-9]{64}$/i);

const inputSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("load"),
      adminToken: capabilitySchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("authorize_retry"),
      adminToken: capabilitySchema,
      slotPublicId: z.string().uuid(),
      acknowledgePossiblePriorPayment: z.literal(true),
      acknowledgeDoublePaymentRisk: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("close_incomplete"),
      adminToken: capabilitySchema,
      reasonCode: z.enum(["operator_closed_incomplete", "collection_ended"]),
      confirmation: z.literal("CLOSE_INCOMPLETE"),
      acknowledgeStopsPayments: z.literal(true),
      acknowledgeNoAutomaticRefunds: z.literal(true),
    })
    .strict(),
]);

type RecoveryActionInput = z.infer<typeof inputSchema>;

export type BillRecoveryRouteDependencies = {
  execute(input: RecoveryActionInput): Promise<unknown>;
};

const defaultDependencies: BillRecoveryRouteDependencies = {
  async execute(input) {
    const database = await getPaymentsDatabase();
    if (input.action === "load") {
      return loadBillReviewManagement(database, input.adminToken);
    }
    if (input.action === "authorize_retry") {
      return authorizeReviewedSlotRetry(database, input);
    }
    return closeBillIncomplete(database, input);
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

export async function handleBillRecoveryRequest(
  request: Request,
  dependencies: BillRecoveryRouteDependencies = defaultDependencies,
) {
  if (
    !(request.headers.get("content-type") ?? "")
      .toLowerCase()
      .startsWith("application/json")
  ) {
    return json(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Send the Bill recovery action as JSON.",
        },
      },
      415,
    );
  }

  let input: RecoveryActionInput;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 2_048) {
      return json(
        {
          error: {
            code: "BILL_RECOVERY_REQUEST_TOO_LARGE",
            message: "The Bill recovery request is too large.",
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
          code: "INVALID_BILL_RECOVERY_ACTION",
          message: "The Bill recovery action is invalid or incomplete.",
        },
      },
      400,
    );
  }

  try {
    return json(await dependencies.execute(input), 200);
  } catch (error) {
    if (error instanceof BillRecoveryNotFoundError) {
      return json(
        { error: { code: error.code, message: error.message } },
        404,
      );
    }
    if (error instanceof BillRecoveryStateError) {
      return json(
        { error: { code: error.code, message: error.message } },
        error.code.endsWith("CONFIRMATION_REQUIRED") ? 422 : 409,
      );
    }
    if (
      error instanceof BillRecoveryDatabaseError ||
      error instanceof PaymentsDatabaseUnavailableError
    ) {
      return json(
        {
          error: {
            code: "BILL_RECOVERY_UNAVAILABLE",
            message: error.message,
          },
        },
        503,
        { "Retry-After": "15" },
      );
    }
    return json(
      {
        error: {
          code: "BILL_RECOVERY_FAILED",
          message: "The Bill recovery action could not be completed.",
        },
      },
      500,
    );
  }
}

export function POST(request: Request) {
  return handleBillRecoveryRequest(request);
}
