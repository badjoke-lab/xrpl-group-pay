import { z } from "zod";

import { billProgressSchema } from "./progress";

const reviewDetailsSchema = z
  .object({
    kind: z.enum(["verification_mismatch", "multiple_validated_matches"]),
    transactionId: z.string().regex(/^[A-F0-9]{64}$/i).nullable(),
    transactionIds: z.array(z.string().regex(/^[A-F0-9]{64}$/i)).optional(),
    reasonCode: z.string().min(1),
    message: z.string().min(1),
    reviewedLedgerMin: z.number().int().nonnegative().optional(),
    reviewedLedgerMax: z.number().int().nonnegative().optional(),
    observedAt: z.string().datetime(),
  })
  .strict();

export const billReviewManagementSchema = z
  .object({
    progress: billProgressSchema,
    reviews: z.array(
      z
        .object({
          slotPublicId: z.string().uuid(),
          status: z.enum([
            "unpaid",
            "payload_created",
            "awaiting_signature",
            "rejected",
            "expired",
            "submitted",
            "validating",
            "paid",
            "verification_failed",
            "needs_review",
          ]),
          reasonCode: z.string().min(1).nullable(),
          details: reviewDetailsSchema.nullable(),
          retryAuthorizedAt: z.string().datetime().nullable(),
        })
        .strict(),
    ),
  })
  .strict();

export type BillReviewManagement = z.infer<typeof billReviewManagementSchema>;

export type BillRecoveryAction =
  | { action: "load"; adminToken: string }
  | {
      action: "authorize_retry";
      adminToken: string;
      slotPublicId: string;
      acknowledgePossiblePriorPayment: true;
      acknowledgeDoublePaymentRisk: true;
    }
  | {
      action: "close_incomplete";
      adminToken: string;
      reasonCode: "operator_closed_incomplete" | "collection_ended";
      confirmation: "CLOSE_INCOMPLETE";
      acknowledgeStopsPayments: true;
      acknowledgeNoAutomaticRefunds: true;
    };

export class BillRecoveryRequestError extends Error {
  constructor(
    message: string,
    readonly code = "BILL_RECOVERY_FAILED",
  ) {
    super(message);
    this.name = "BillRecoveryRequestError";
  }
}

export async function requestBillRecovery(
  input: BillRecoveryAction,
  fetcher: typeof fetch = fetch,
): Promise<BillReviewManagement> {
  let response: Response;
  try {
    response = await fetcher("/api/bills/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    throw new BillRecoveryRequestError(
      "Bill recovery is temporarily unavailable.",
      "BILL_RECOVERY_UNAVAILABLE",
    );
  }

  const body: unknown = await response.json().catch(() => null);
  const parsed = billReviewManagementSchema.safeParse(body);
  if (response.ok && parsed.success) return parsed.data;

  const error =
    body && typeof body === "object"
      ? (body as { error?: { code?: unknown; message?: unknown } }).error
      : undefined;
  throw new BillRecoveryRequestError(
    typeof error?.message === "string"
      ? error.message
      : "The Bill recovery response was invalid.",
    typeof error?.code === "string" ? error.code : undefined,
  );
}
