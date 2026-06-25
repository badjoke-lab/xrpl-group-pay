import { z } from "zod";

import { xrplNetworkSchema } from "@/features/assets/types";
import {
  assetDescriptorFromPersistedRow,
  moneyAmountFromPersistedUnits,
  PAYMENT_SLOT_CONTRACT_VERSION,
} from "@/features/persistence/asset-records";

export const slotStatusSchema = z.enum([
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

export const billStatusSchema = z.enum([
  "open",
  "partially_paid",
  "settled",
  "needs_review",
]);

export const paymentSlotRecordSchema = z.object({
  slot_id: z.string().min(1),
  slot_public_id: z.string().uuid(),
  bill_id: z.string().min(1),
  bill_public_id: z.string().uuid(),
  bill_title: z.string().min(1).max(100),
  network: xrplNetworkSchema,
  destination_address: z.string().min(1),
  destination_tag: z.number().int().min(0).max(4_294_967_295).nullable(),
  participant_label: z.string().max(60).nullable(),
  expected_payer_address: z.string().min(1),
  expected_amount_drops: z.string().regex(/^[1-9]\d*$/),
  payment_contract_version: z
    .literal(PAYMENT_SLOT_CONTRACT_VERSION)
    .optional()
    .default(PAYMENT_SLOT_CONTRACT_VERSION),
  asset_id: z.string().min(1).optional().default("xrpl:testnet:xrp"),
  asset_type: z.enum(["native", "issued"]).optional().default("native"),
  currency_code: z.string().min(1).optional().default("XRP"),
  issuer: z.string().min(1).nullable().optional().default(null),
  amount_scale: z.number().int().min(0).max(18).optional().default(6),
  expected_amount_units: z.string().regex(/^[1-9]\d*$/).optional(),
  invoice_id: z.string().regex(/^[A-F0-9]{64}$/),
  slot_status: slotStatusSchema,
  bill_status: billStatusSchema,
  paid_tx_hash: z.string().nullable(),
});

export const SELECT_PAYMENT_SLOT = `
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
    ps.payment_contract_version AS payment_contract_version,
    ps.asset_id AS asset_id,
    ps.asset_type AS asset_type,
    ps.currency_code AS currency_code,
    ps.issuer AS issuer,
    ps.amount_scale AS amount_scale,
    ps.expected_amount_units AS expected_amount_units,
    ps.invoice_id AS invoice_id,
    ps.status AS slot_status,
    b.status AS bill_status,
    ps.paid_tx_hash AS paid_tx_hash
  FROM payment_slots ps
  INNER JOIN bills b ON b.id = ps.bill_id
  WHERE ps.public_token_hash = ?1
  LIMIT 1
`;

export function normalizePaymentSlotRecord(
  input: z.infer<typeof paymentSlotRecordSchema>,
) {
  const asset = assetDescriptorFromPersistedRow(input.network, {
    asset_id: input.asset_id,
    asset_type: input.asset_type,
    currency_code: input.currency_code,
    issuer: input.issuer,
    amount_scale: input.amount_scale,
  });
  const amountUnits = input.expected_amount_units ?? input.expected_amount_drops;
  const expectedAmount = moneyAmountFromPersistedUnits(
    asset.symbol,
    amountUnits,
    asset.precision,
  );
  return { asset, amountUnits, expectedAmount };
}
