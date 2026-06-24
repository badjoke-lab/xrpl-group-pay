import { z } from "zod";

import type { D1DatabaseLike } from "@/features/persistence/d1-types";

import { hashCapabilityToken } from "./capabilities";

const billStatusSchema = z.enum([
  "open",
  "partially_paid",
  "settled",
  "needs_review",
]);

export const paymentSlotProgressStatusSchema = z.enum([
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
]);

const billRowSchema = z.object({
  id: z.string().min(1),
  public_id: z.string().uuid(),
  title: z.string().min(1).max(100),
  network: z.literal("testnet"),
  destination_address: z.string().min(1),
  destination_tag: z.number().int().min(0).max(4_294_967_295).nullable(),
  total_drops: z.string().regex(/^[1-9]\d*$/),
  creator_share_drops: z.string().regex(/^(?:0|[1-9]\d*)$/),
  status: billStatusSchema,
  revision: z.number().int().min(1),
  frozen_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  access_role: z.enum(["public", "admin"]),
});

const slotRowSchema = z.object({
  public_id: z.string().uuid(),
  participant_label: z.string().max(60).nullable(),
  expected_payer_address: z.string().min(1),
  expected_amount_drops: z.string().regex(/^[1-9]\d*$/),
  invoice_id: z.string().regex(/^[A-F0-9]{64}$/),
  status: paymentSlotProgressStatusSchema,
  paid_tx_hash: z.string().regex(/^[A-F0-9]{64}$/).nullable(),
  paid_ledger_index: z.number().int().min(0).nullable(),
  paid_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime(),
});

export const billProgressSchema = z
  .object({
    access: z.enum(["public", "admin"]),
    bill: z
      .object({
        publicId: z.string().uuid(),
        title: z.string().min(1).max(100),
        network: z.literal("testnet"),
        destinationAddress: z.string().min(1),
        destinationTag: z.number().int().min(0).max(4_294_967_295).nullable(),
        totalDrops: z.string().regex(/^[1-9]\d*$/),
        creatorShareDrops: z.string().regex(/^(?:0|[1-9]\d*)$/),
        status: billStatusSchema,
        revision: z.number().int().min(1),
        frozenAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
      })
      .strict(),
    summary: z
      .object({
        participantCount: z.number().int().min(0),
        paidCount: z.number().int().min(0),
        pendingCount: z.number().int().min(0),
        reviewCount: z.number().int().min(0),
        expectedExternalDrops: z.string().regex(/^(?:0|[1-9]\d*)$/),
        paidDrops: z.string().regex(/^(?:0|[1-9]\d*)$/),
      })
      .strict(),
    slots: z.array(
      z
        .object({
          publicId: z.string().uuid(),
          participantLabel: z.string().max(60).nullable(),
          expectedPayerAddress: z.string().min(1).nullable(),
          expectedAmountDrops: z.string().regex(/^[1-9]\d*$/),
          invoiceId: z.string().regex(/^[A-F0-9]{64}$/).nullable(),
          status: paymentSlotProgressStatusSchema,
          paidTransactionId: z.string().regex(/^[A-F0-9]{64}$/).nullable(),
          paidLedgerIndex: z.number().int().min(0).nullable(),
          paidAt: z.string().datetime().nullable(),
          updatedAt: z.string().datetime(),
        })
        .strict(),
    ),
  })
  .strict();

export type BillProgress = z.infer<typeof billProgressSchema>;

export class BillProgressNotFoundError extends Error {
  constructor() {
    super("The bill progress link is invalid or unavailable.");
    this.name = "BillProgressNotFoundError";
  }
}

export class BillProgressDatabaseError extends Error {
  constructor() {
    super("The bill progress could not be loaded.");
    this.name = "BillProgressDatabaseError";
  }
}

const SELECT_BILL = `
  SELECT
    id,
    public_id,
    title,
    network,
    destination_address,
    destination_tag,
    total_drops,
    creator_share_drops,
    status,
    revision,
    frozen_at,
    updated_at,
    CASE WHEN admin_token_hash = ?1 THEN 'admin' ELSE 'public' END AS access_role
  FROM bills
  WHERE admin_token_hash = ?1 OR public_token_hash = ?1
  LIMIT 1
`;

const SELECT_SLOTS = `
  SELECT
    public_id,
    participant_label,
    expected_payer_address,
    expected_amount_drops,
    invoice_id,
    status,
    paid_tx_hash,
    paid_ledger_index,
    paid_at,
    updated_at
  FROM payment_slots
  WHERE bill_id = (
    SELECT id
    FROM bills
    WHERE admin_token_hash = ?1 OR public_token_hash = ?1
    LIMIT 1
  )
  ORDER BY created_at ASC, public_id ASC
`;

function isReviewStatus(status: z.infer<typeof paymentSlotProgressStatusSchema>) {
  return status === "needs_review" || status === "verification_failed";
}

export async function loadBillProgressByToken(
  database: D1DatabaseLike,
  capabilityToken: string,
): Promise<BillProgress> {
  let tokenHash: string;
  try {
    tokenHash = await hashCapabilityToken(capabilityToken);
  } catch {
    throw new BillProgressNotFoundError();
  }

  try {
    const [billResult, slotsResult] = await database.batch([
      database.prepare(SELECT_BILL).bind(tokenHash),
      database.prepare(SELECT_SLOTS).bind(tokenHash),
    ]);

    if (!billResult?.success || !slotsResult?.success) {
      throw new BillProgressDatabaseError();
    }

    const bill = billRowSchema.safeParse(billResult.results?.[0]);
    if (!bill.success) {
      if (!billResult.results?.[0]) throw new BillProgressNotFoundError();
      throw new BillProgressDatabaseError();
    }

    const slots = z.array(slotRowSchema).safeParse(slotsResult.results ?? []);
    if (!slots.success) throw new BillProgressDatabaseError();

    const expectedExternalDrops = slots.data.reduce(
      (sum, slot) => sum + BigInt(slot.expected_amount_drops),
      0n,
    );
    const paidDrops = slots.data.reduce(
      (sum, slot) =>
        slot.status === "paid"
          ? sum + BigInt(slot.expected_amount_drops)
          : sum,
      0n,
    );
    const paidCount = slots.data.filter((slot) => slot.status === "paid").length;
    const reviewCount = slots.data.filter((slot) =>
      isReviewStatus(slot.status),
    ).length;
    const isAdmin = bill.data.access_role === "admin";

    return billProgressSchema.parse({
      access: bill.data.access_role,
      bill: {
        publicId: bill.data.public_id,
        title: bill.data.title,
        network: bill.data.network,
        destinationAddress: bill.data.destination_address,
        destinationTag: bill.data.destination_tag,
        totalDrops: bill.data.total_drops,
        creatorShareDrops: bill.data.creator_share_drops,
        status: bill.data.status,
        revision: bill.data.revision,
        frozenAt: bill.data.frozen_at,
        updatedAt: bill.data.updated_at,
      },
      summary: {
        participantCount: slots.data.length,
        paidCount,
        pendingCount: slots.data.length - paidCount - reviewCount,
        reviewCount,
        expectedExternalDrops: expectedExternalDrops.toString(),
        paidDrops: paidDrops.toString(),
      },
      slots: slots.data.map((slot) => ({
        publicId: slot.public_id,
        participantLabel: isAdmin ? slot.participant_label : null,
        expectedPayerAddress: isAdmin ? slot.expected_payer_address : null,
        expectedAmountDrops: slot.expected_amount_drops,
        invoiceId: isAdmin ? slot.invoice_id : null,
        status: slot.status,
        paidTransactionId: slot.paid_tx_hash,
        paidLedgerIndex: slot.paid_ledger_index,
        paidAt: slot.paid_at,
        updatedAt: slot.updated_at,
      })),
    });
  } catch (error) {
    if (
      error instanceof BillProgressNotFoundError ||
      error instanceof BillProgressDatabaseError
    ) {
      throw error;
    }
    throw new BillProgressDatabaseError();
  }
}
