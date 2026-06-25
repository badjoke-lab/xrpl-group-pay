import { z } from "zod";

import {
  assetRegistry,
  getXrpAssetDescriptor,
} from "@/features/assets/registry";
import { assetDescriptorSchema } from "@/features/assets/types";
import { moneyAmountSchema } from "@/features/money/types";
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

const upperHex256Schema = z.string().regex(/^[A-F0-9]{64}$/);
const integerUnitsSchema = z.string().regex(/^(?:0|[1-9]\d*)$/);
const positiveUnitsSchema = z.string().regex(/^[1-9]\d*$/);

const billRowSchema = z.object({
  id: z.string().min(1),
  public_id: z.string().uuid(),
  title: z.string().min(1).max(100),
  network: z.literal("testnet"),
  destination_address: z.string().min(1),
  destination_tag: z.number().int().min(0).max(4_294_967_295).nullable(),
  total_drops: positiveUnitsSchema,
  creator_share_drops: integerUnitsSchema,
  settlement_asset_id: z.string().min(1).nullable().optional(),
  total_amount_units: positiveUnitsSchema.nullable().optional(),
  creator_share_amount_units: integerUnitsSchema.nullable().optional(),
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
  expected_amount_drops: positiveUnitsSchema,
  asset_id: z.string().min(1).nullable().optional(),
  expected_amount_units: positiveUnitsSchema.nullable().optional(),
  invoice_id: upperHex256Schema,
  status: paymentSlotProgressStatusSchema,
  paid_tx_hash: upperHex256Schema.nullable(),
  paid_ledger_index: z.number().int().min(0).nullable(),
  paid_at: z.string().datetime().nullable(),
  proof_digest: upperHex256Schema.nullable(),
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
        asset: assetDescriptorSchema,
        totalAmount: moneyAmountSchema,
        creatorShareAmount: moneyAmountSchema,
        totalDrops: positiveUnitsSchema.nullable(),
        creatorShareDrops: integerUnitsSchema.nullable(),
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
        expectedExternalAmount: moneyAmountSchema,
        paidAmount: moneyAmountSchema,
        expectedExternalDrops: integerUnitsSchema.nullable(),
        paidDrops: integerUnitsSchema.nullable(),
      })
      .strict(),
    slots: z.array(
      z
        .object({
          publicId: z.string().uuid(),
          participantLabel: z.string().max(60).nullable(),
          expectedPayerAddress: z.string().min(1).nullable(),
          asset: assetDescriptorSchema,
          expectedAmount: moneyAmountSchema,
          expectedAmountDrops: positiveUnitsSchema.nullable(),
          invoiceId: upperHex256Schema.nullable(),
          status: paymentSlotProgressStatusSchema,
          paidTransactionId: upperHex256Schema.nullable(),
          paidLedgerIndex: z.number().int().min(0).nullable(),
          paidAt: z.string().datetime().nullable(),
          proofToken: upperHex256Schema.nullable(),
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
    settlement_asset_id,
    total_amount_units,
    creator_share_amount_units,
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
    slots.public_id,
    slots.participant_label,
    slots.expected_payer_address,
    slots.expected_amount_drops,
    slots.asset_id,
    slots.expected_amount_units,
    slots.invoice_id,
    slots.status,
    slots.paid_tx_hash,
    slots.paid_ledger_index,
    slots.paid_at,
    CASE
      WHEN slots.asset_type = 'native' THEN records.legacy_proof_digest
      ELSE NULL
    END AS proof_digest,
    slots.updated_at
  FROM payment_slots AS slots
  LEFT JOIN verified_payment_records AS records
    ON records.network = 'testnet'
    AND records.transaction_id = slots.paid_tx_hash
  WHERE slots.bill_id = (
    SELECT id
    FROM bills
    WHERE admin_token_hash = ?1 OR public_token_hash = ?1
    LIMIT 1
  )
  ORDER BY slots.created_at ASC, slots.public_id ASC
`;

function isReviewStatus(status: z.infer<typeof paymentSlotProgressStatusSchema>) {
  return status === "needs_review" || status === "verification_failed";
}

function requireAsset(assetId: string | null | undefined) {
  try {
    return assetId
      ? assetRegistry.require(assetId)
      : getXrpAssetDescriptor("testnet");
  } catch {
    throw new BillProgressDatabaseError();
  }
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

    const asset = requireAsset(bill.data.settlement_asset_id);
    const totalUnits = bill.data.total_amount_units ?? bill.data.total_drops;
    const creatorShareUnits =
      bill.data.creator_share_amount_units ?? bill.data.creator_share_drops;

    const normalizedSlots = slots.data.map((slot) => {
      const slotAsset = requireAsset(slot.asset_id);
      if (slotAsset.id !== asset.id) throw new BillProgressDatabaseError();
      const expectedUnits =
        slot.expected_amount_units ?? slot.expected_amount_drops;
      if (
        slot.status === "paid" &&
        slotAsset.assetType === "native" &&
        slot.proof_digest === null
      ) {
        throw new BillProgressDatabaseError();
      }
      return { row: slot, asset: slotAsset, expectedUnits };
    });

    const expectedExternalUnits = normalizedSlots.reduce(
      (sum, slot) => sum + BigInt(slot.expectedUnits),
      0n,
    );
    const paidUnits = normalizedSlots.reduce(
      (sum, slot) =>
        slot.row.status === "paid"
          ? sum + BigInt(slot.expectedUnits)
          : sum,
      0n,
    );
    const paidCount = normalizedSlots.filter(
      (slot) => slot.row.status === "paid",
    ).length;
    const reviewCount = normalizedSlots.filter((slot) =>
      isReviewStatus(slot.row.status),
    ).length;
    const isAdmin = bill.data.access_role === "admin";
    const native = asset.assetType === "native";

    return billProgressSchema.parse({
      access: bill.data.access_role,
      bill: {
        publicId: bill.data.public_id,
        title: bill.data.title,
        network: bill.data.network,
        destinationAddress: bill.data.destination_address,
        destinationTag: bill.data.destination_tag,
        asset,
        totalAmount: {
          code: asset.symbol,
          units: totalUnits,
          scale: asset.precision,
        },
        creatorShareAmount: {
          code: asset.symbol,
          units: creatorShareUnits,
          scale: asset.precision,
        },
        totalDrops: native ? totalUnits : null,
        creatorShareDrops: native ? creatorShareUnits : null,
        status: bill.data.status,
        revision: bill.data.revision,
        frozenAt: bill.data.frozen_at,
        updatedAt: bill.data.updated_at,
      },
      summary: {
        participantCount: normalizedSlots.length,
        paidCount,
        pendingCount: normalizedSlots.length - paidCount - reviewCount,
        reviewCount,
        expectedExternalAmount: {
          code: asset.symbol,
          units: expectedExternalUnits.toString(),
          scale: asset.precision,
        },
        paidAmount: {
          code: asset.symbol,
          units: paidUnits.toString(),
          scale: asset.precision,
        },
        expectedExternalDrops: native
          ? expectedExternalUnits.toString()
          : null,
        paidDrops: native ? paidUnits.toString() : null,
      },
      slots: normalizedSlots.map(({ row, asset: slotAsset, expectedUnits }) => ({
        publicId: row.public_id,
        participantLabel: isAdmin ? row.participant_label : null,
        expectedPayerAddress: isAdmin ? row.expected_payer_address : null,
        asset: slotAsset,
        expectedAmount: {
          code: slotAsset.symbol,
          units: expectedUnits,
          scale: slotAsset.precision,
        },
        expectedAmountDrops:
          slotAsset.assetType === "native" ? expectedUnits : null,
        invoiceId: isAdmin ? row.invoice_id : null,
        status: row.status,
        paidTransactionId: row.paid_tx_hash,
        paidLedgerIndex: row.paid_ledger_index,
        paidAt: row.paid_at,
        proofToken: row.proof_digest,
        updatedAt: row.updated_at,
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
