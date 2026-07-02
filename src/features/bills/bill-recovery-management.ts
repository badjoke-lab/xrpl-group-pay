import { z } from "zod";

import type { D1DatabaseLike } from "@/features/persistence/d1-types";

import { hashCapabilityToken } from "./capabilities";
import { loadBillProgressByToken, type BillProgress } from "./progress";

const capabilitySchema = z.string().regex(/^[a-f0-9]{64}$/i);
const slotPublicIdSchema = z.string().uuid();

const billActionRowSchema = z.object({
  id: z.string().min(1),
  public_id: z.string().uuid(),
  status: z.enum([
    "open",
    "partially_paid",
    "settled",
    "needs_review",
    "closed_incomplete",
  ]),
  closure_state: z.enum(["active", "closed_incomplete"]),
});

const slotActionRowSchema = z.object({
  id: z.string().min(1),
  public_id: z.string().uuid(),
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
  review_reason_code: z.string().min(1).nullable(),
  review_details_json: z.string().min(1).nullable(),
  retry_authorized_at: z.string().datetime().nullable(),
  retry_authorization_json: z.string().min(1).nullable(),
});

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

const reviewManagementRowSchema = z.object({
  public_id: z.string().uuid(),
  status: slotActionRowSchema.shape.status,
  review_reason_code: z.string().min(1).nullable(),
  review_details_json: z.string().min(1).nullable(),
  retry_authorized_at: z.string().datetime().nullable(),
});

export type BillReviewManagement = {
  progress: BillProgress;
  reviews: Array<{
    slotPublicId: string;
    status: z.infer<typeof slotActionRowSchema>["status"];
    reasonCode: string | null;
    details: z.infer<typeof reviewDetailsSchema> | null;
    retryAuthorizedAt: string | null;
  }>;
};

export class BillRecoveryNotFoundError extends Error {
  readonly code = "BILL_RECOVERY_NOT_FOUND" as const;

  constructor() {
    super("The Bill management capability is invalid or unavailable.");
    this.name = "BillRecoveryNotFoundError";
  }
}

export class BillRecoveryStateError extends Error {
  constructor(
    readonly code:
      | "REVIEW_NOT_ACTIONABLE"
      | "RETRY_CONFIRMATION_REQUIRED"
      | "BILL_ALREADY_SETTLED"
      | "BILL_ALREADY_CLOSED"
      | "CLOSURE_CONFIRMATION_REQUIRED",
    message: string,
  ) {
    super(message);
    this.name = "BillRecoveryStateError";
  }
}

export class BillRecoveryDatabaseError extends Error {
  readonly code = "BILL_RECOVERY_UNAVAILABLE" as const;

  constructor() {
    super("The Bill recovery action could not be completed safely.");
    this.name = "BillRecoveryDatabaseError";
  }
}

const SELECT_ADMIN_BILL = `
  SELECT id, public_id, status, closure_state
  FROM bills
  WHERE admin_token_hash = ?1
  LIMIT 1
`;

const SELECT_ADMIN_SLOT = `
  SELECT
    slots.id,
    slots.public_id,
    slots.status,
    slots.review_reason_code,
    slots.review_details_json,
    slots.retry_authorized_at,
    slots.retry_authorization_json
  FROM payment_slots AS slots
  INNER JOIN bills ON bills.id = slots.bill_id
  WHERE bills.admin_token_hash = ?1
    AND slots.public_id = ?2
  LIMIT 1
`;

const SELECT_REVIEW_ROWS = `
  SELECT
    slots.public_id,
    slots.status,
    slots.review_reason_code,
    slots.review_details_json,
    slots.retry_authorized_at
  FROM payment_slots AS slots
  INNER JOIN bills ON bills.id = slots.bill_id
  WHERE bills.admin_token_hash = ?1
    AND (
      slots.review_reason_code IS NOT NULL
      OR slots.retry_authorized_at IS NOT NULL
      OR slots.status IN ('needs_review', 'verification_failed')
    )
  ORDER BY slots.created_at ASC, slots.public_id ASC
`;

const INSERT_ACTION = `
  INSERT INTO bill_management_actions (
    id,
    bill_id,
    payment_slot_id,
    action_type,
    details_json,
    created_at
  ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
`;

const AUTHORIZE_RETRY = `
  UPDATE payment_slots
  SET
    status = 'unpaid',
    retry_authorized_at = ?1,
    retry_authorization_json = ?2,
    updated_at = ?1
  WHERE id = ?3
    AND status IN ('needs_review', 'verification_failed')
    AND EXISTS (
      SELECT 1 FROM bills
      WHERE bills.id = payment_slots.bill_id
        AND bills.closure_state = 'active'
        AND bills.status <> 'settled'
    )
`;

const RECOMPUTE_BILL_STATUS = `
  UPDATE bills
  SET
    status = CASE
      WHEN EXISTS (
        SELECT 1 FROM payment_slots
        WHERE payment_slots.bill_id = bills.id
          AND payment_slots.status IN ('needs_review', 'verification_failed')
      ) THEN 'needs_review'
      WHEN NOT EXISTS (
        SELECT 1 FROM payment_slots
        WHERE payment_slots.bill_id = bills.id
          AND payment_slots.status <> 'paid'
      ) THEN 'settled'
      WHEN EXISTS (
        SELECT 1 FROM payment_slots
        WHERE payment_slots.bill_id = bills.id
          AND payment_slots.status = 'paid'
      ) THEN 'partially_paid'
      ELSE 'open'
    END,
    updated_at = ?1
  WHERE id = ?2
    AND closure_state = 'active'
`;

const CLOSE_BILL = `
  UPDATE bills
  SET
    closure_state = 'closed_incomplete',
    status = 'closed_incomplete',
    closed_at = ?1,
    closure_reason_code = ?2,
    updated_at = ?1
  WHERE id = ?3
    AND closure_state = 'active'
    AND status <> 'settled'
`;

const CLOSE_UNPAID_SLOTS = `
  UPDATE payment_slots
  SET closed_at = ?1, updated_at = ?1
  WHERE bill_id = ?2
    AND status <> 'paid'
`;

async function hashAdminCapability(adminToken: string) {
  if (!capabilitySchema.safeParse(adminToken).success) {
    throw new BillRecoveryNotFoundError();
  }
  try {
    return await hashCapabilityToken(adminToken);
  } catch {
    throw new BillRecoveryNotFoundError();
  }
}

async function loadAdminBill(
  database: D1DatabaseLike,
  tokenHash: string,
) {
  const row = await database
    .prepare(SELECT_ADMIN_BILL)
    .bind(tokenHash)
    .first();
  const parsed = billActionRowSchema.safeParse(row);
  if (!parsed.success) throw new BillRecoveryNotFoundError();
  return parsed.data;
}

function parseReviewDetails(value: string | null) {
  if (!value) return null;
  try {
    const parsed = reviewDetailsSchema.safeParse(JSON.parse(value) as unknown);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function loadBillReviewManagement(
  database: D1DatabaseLike,
  adminToken: string,
): Promise<BillReviewManagement> {
  const tokenHash = await hashAdminCapability(adminToken);
  const progress = await loadBillProgressByToken(database, adminToken);
  if (progress.access !== "admin") throw new BillRecoveryNotFoundError();

  try {
    const [result] = await database.batch([
      database.prepare(SELECT_REVIEW_ROWS).bind(tokenHash),
    ]);
    if (!result?.success) throw new BillRecoveryDatabaseError();
    const rows = z
      .array(reviewManagementRowSchema)
      .safeParse(result.results ?? []);
    if (!rows.success) throw new BillRecoveryDatabaseError();
    return {
      progress,
      reviews: rows.data.map((row) => ({
        slotPublicId: row.public_id,
        status: row.status,
        reasonCode: row.review_reason_code,
        details: parseReviewDetails(row.review_details_json),
        retryAuthorizedAt: row.retry_authorized_at,
      })),
    };
  } catch (error) {
    if (
      error instanceof BillRecoveryNotFoundError ||
      error instanceof BillRecoveryDatabaseError
    ) {
      throw error;
    }
    throw new BillRecoveryDatabaseError();
  }
}

export async function authorizeReviewedSlotRetry(
  database: D1DatabaseLike,
  input: {
    adminToken: string;
    slotPublicId: string;
    acknowledgePossiblePriorPayment: boolean;
    acknowledgeDoublePaymentRisk: boolean;
  },
  now = new Date(),
) {
  if (
    input.acknowledgePossiblePriorPayment !== true ||
    input.acknowledgeDoublePaymentRisk !== true
  ) {
    throw new BillRecoveryStateError(
      "RETRY_CONFIRMATION_REQUIRED",
      "Both prior-payment and repeated-payment warnings must be acknowledged.",
    );
  }
  if (!slotPublicIdSchema.safeParse(input.slotPublicId).success) {
    throw new BillRecoveryNotFoundError();
  }

  const tokenHash = await hashAdminCapability(input.adminToken);
  const bill = await loadAdminBill(database, tokenHash);
  if (bill.closure_state === "closed_incomplete") {
    throw new BillRecoveryStateError(
      "BILL_ALREADY_CLOSED",
      "This Bill is closed and cannot authorize another Payment.",
    );
  }
  if (bill.status === "settled") {
    throw new BillRecoveryStateError(
      "BILL_ALREADY_SETTLED",
      "This Bill is already settled.",
    );
  }

  const slotRow = await database
    .prepare(SELECT_ADMIN_SLOT)
    .bind(tokenHash, input.slotPublicId)
    .first();
  const slot = slotActionRowSchema.safeParse(slotRow);
  if (!slot.success) throw new BillRecoveryNotFoundError();
  if (!['needs_review', 'verification_failed'].includes(slot.data.status)) {
    throw new BillRecoveryStateError(
      "REVIEW_NOT_ACTIONABLE",
      "This PaymentSlot is not waiting for retry authorization.",
    );
  }

  const timestamp = now.toISOString();
  const authorization = JSON.stringify({
    acknowledgePossiblePriorPayment: true,
    acknowledgeDoublePaymentRisk: true,
    priorReviewReasonCode: slot.data.review_reason_code,
    authorizedAt: timestamp,
  });
  const actionDetails = JSON.stringify({
    slotPublicId: slot.data.public_id,
    priorStatus: slot.data.status,
    priorReviewReasonCode: slot.data.review_reason_code,
    warningsAcknowledged: true,
  });
  const statements = [
    database
      .prepare(INSERT_ACTION)
      .bind(
        crypto.randomUUID(),
        bill.id,
        slot.data.id,
        "retry_authorized",
        actionDetails,
        timestamp,
      ),
    database
      .prepare(AUTHORIZE_RETRY)
      .bind(timestamp, authorization, slot.data.id),
    database.prepare(RECOMPUTE_BILL_STATUS).bind(timestamp, bill.id),
  ];

  try {
    const results = await database.batch(statements);
    if (
      results.length !== statements.length ||
      results.some((result) => !result.success) ||
      (results[0].meta?.changes ?? 0) !== 1 ||
      (results[1].meta?.changes ?? 0) !== 1 ||
      (results[2].meta?.changes ?? 0) !== 1
    ) {
      throw new BillRecoveryDatabaseError();
    }
    return loadBillReviewManagement(database, input.adminToken);
  } catch (error) {
    if (
      error instanceof BillRecoveryNotFoundError ||
      error instanceof BillRecoveryStateError ||
      error instanceof BillRecoveryDatabaseError
    ) {
      throw error;
    }
    throw new BillRecoveryDatabaseError();
  }
}

export async function closeBillIncomplete(
  database: D1DatabaseLike,
  input: {
    adminToken: string;
    reasonCode: "operator_closed_incomplete" | "collection_ended";
    confirmation: string;
    acknowledgeStopsPayments: boolean;
    acknowledgeNoAutomaticRefunds: boolean;
  },
  now = new Date(),
) {
  if (
    input.confirmation !== "CLOSE_INCOMPLETE" ||
    input.acknowledgeStopsPayments !== true ||
    input.acknowledgeNoAutomaticRefunds !== true
  ) {
    throw new BillRecoveryStateError(
      "CLOSURE_CONFIRMATION_REQUIRED",
      "Closure requires the exact confirmation and both safety acknowledgements.",
    );
  }

  const tokenHash = await hashAdminCapability(input.adminToken);
  const bill = await loadAdminBill(database, tokenHash);
  if (bill.closure_state === "closed_incomplete") {
    throw new BillRecoveryStateError(
      "BILL_ALREADY_CLOSED",
      "This Bill is already closed incomplete.",
    );
  }
  if (bill.status === "settled") {
    throw new BillRecoveryStateError(
      "BILL_ALREADY_SETTLED",
      "A settled Bill cannot be closed incomplete.",
    );
  }

  const timestamp = now.toISOString();
  const details = JSON.stringify({
    reasonCode: input.reasonCode,
    stopsNewPayments: true,
    automaticRefundsProvided: false,
    closedAt: timestamp,
  });
  const statements = [
    database
      .prepare(INSERT_ACTION)
      .bind(
        crypto.randomUUID(),
        bill.id,
        null,
        "closed_incomplete",
        details,
        timestamp,
      ),
    database
      .prepare(CLOSE_BILL)
      .bind(timestamp, input.reasonCode, bill.id),
    database.prepare(CLOSE_UNPAID_SLOTS).bind(timestamp, bill.id),
  ];

  try {
    const results = await database.batch(statements);
    if (
      results.length !== statements.length ||
      results.some((result) => !result.success) ||
      (results[0].meta?.changes ?? 0) !== 1 ||
      (results[1].meta?.changes ?? 0) !== 1
    ) {
      throw new BillRecoveryDatabaseError();
    }
    return loadBillReviewManagement(database, input.adminToken);
  } catch (error) {
    if (
      error instanceof BillRecoveryNotFoundError ||
      error instanceof BillRecoveryStateError ||
      error instanceof BillRecoveryDatabaseError
    ) {
      throw error;
    }
    throw new BillRecoveryDatabaseError();
  }
}
