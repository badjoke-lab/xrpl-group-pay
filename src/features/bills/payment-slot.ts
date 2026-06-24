import { z } from "zod";

import type { D1DatabaseLike } from "@/features/persistence/d1-types";

import { hashCapabilityToken } from "./capabilities";

const paymentSlotRowSchema = z.object({
  slot_id: z.string().min(1),
  slot_public_id: z.string().uuid(),
  bill_id: z.string().min(1),
  bill_public_id: z.string().uuid(),
  bill_title: z.string().min(1).max(100),
  network: z.literal("testnet"),
  destination_address: z.string().min(1),
  destination_tag: z.number().int().min(0).max(4_294_967_295).nullable(),
  participant_label: z.string().max(60).nullable(),
  expected_payer_address: z.string().min(1),
  expected_amount_drops: z.string().regex(/^[1-9]\d*$/),
  invoice_id: z.string().regex(/^[A-F0-9]{64}$/),
  slot_status: z.enum([
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
  bill_status: z.enum(["open", "partially_paid", "settled", "needs_review"]),
  paid_tx_hash: z.string().nullable(),
});

export type ResolvedPaymentSlot = {
  slotId: string;
  slotPublicId: string;
  billId: string;
  billPublicId: string;
  billTitle: string;
  network: "testnet";
  destinationAddress: string;
  destinationTag: number | null;
  participantLabel: string | null;
  expectedPayerAddress: string;
  expectedAmountDrops: string;
  invoiceId: string;
  slotStatus: z.infer<typeof paymentSlotRowSchema>["slot_status"];
  billStatus: z.infer<typeof paymentSlotRowSchema>["bill_status"];
  paidTransactionId: string | null;
};

export class PaymentSlotNotFoundError extends Error {
  constructor() {
    super("The payment link is invalid or unavailable.");
    this.name = "PaymentSlotNotFoundError";
  }
}

export class PaymentSlotStateError extends Error {
  constructor(
    readonly code: "SLOT_ALREADY_PAID" | "BILL_NOT_PAYABLE",
    message: string,
  ) {
    super(message);
    this.name = "PaymentSlotStateError";
  }
}

const SELECT_SLOT = `
  SELECT
    ps.id AS slot_id,
    ps.public_id AS slot_public_id,
    ps.bill_id AS bill_id,
    b.public_id AS bill_public_id,
    b.title AS bill_title,
    b.network AS network,
    b.destination_address AS destination_address,
    b.destination_tag AS destination_tag,
    ps.participant_label AS participant_label,
    ps.expected_payer_address AS expected_payer_address,
    ps.expected_amount_drops AS expected_amount_drops,
    ps.invoice_id AS invoice_id,
    ps.status AS slot_status,
    b.status AS bill_status,
    ps.paid_tx_hash AS paid_tx_hash
  FROM payment_slots ps
  INNER JOIN bills b ON b.id = ps.bill_id
  WHERE ps.public_token_hash = ?1
  LIMIT 1
`;

const payloadEligibleStatuses = new Set<ResolvedPaymentSlot["slotStatus"]>([
  "unpaid",
  "payload_created",
  "awaiting_signature",
  "rejected",
  "expired",
  "verification_failed",
]);

export async function loadPaymentSlotByToken(
  database: D1DatabaseLike,
  paymentToken: string,
): Promise<ResolvedPaymentSlot> {
  let tokenHash: string;
  try {
    tokenHash = await hashCapabilityToken(paymentToken);
  } catch {
    throw new PaymentSlotNotFoundError();
  }

  const row = await database.prepare(SELECT_SLOT).bind(tokenHash).first();
  const parsed = paymentSlotRowSchema.safeParse(row);
  if (!parsed.success) {
    throw new PaymentSlotNotFoundError();
  }

  return {
    slotId: parsed.data.slot_id,
    slotPublicId: parsed.data.slot_public_id,
    billId: parsed.data.bill_id,
    billPublicId: parsed.data.bill_public_id,
    billTitle: parsed.data.bill_title,
    network: parsed.data.network,
    destinationAddress: parsed.data.destination_address,
    destinationTag: parsed.data.destination_tag,
    participantLabel: parsed.data.participant_label,
    expectedPayerAddress: parsed.data.expected_payer_address,
    expectedAmountDrops: parsed.data.expected_amount_drops,
    invoiceId: parsed.data.invoice_id,
    slotStatus: parsed.data.slot_status,
    billStatus: parsed.data.bill_status,
    paidTransactionId: parsed.data.paid_tx_hash,
  };
}

export function requirePayableSlot(slot: ResolvedPaymentSlot) {
  if (slot.slotStatus === "paid") {
    throw new PaymentSlotStateError(
      "SLOT_ALREADY_PAID",
      "This payment slot is already paid.",
    );
  }
  if (
    !["open", "partially_paid"].includes(slot.billStatus) ||
    !payloadEligibleStatuses.has(slot.slotStatus)
  ) {
    throw new PaymentSlotStateError(
      "BILL_NOT_PAYABLE",
      "This payment slot is not accepting a new sign request.",
    );
  }
  return slot;
}
