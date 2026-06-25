import { z } from "zod";

import { assetDescriptorSchema } from "@/features/assets/types";
import { moneyAmountSchema } from "@/features/money/types";

export const BILL_SETTLEMENT_CONTRACT_VERSION =
  "xrpl-group-pay:bill-settlement:v1" as const;
export const PAYMENT_SLOT_CONTRACT_VERSION =
  "xrpl-group-pay:payment-slot:v1" as const;
export const VERIFIED_PAYMENT_CONTRACT_VERSION =
  "xrpl-group-pay:verified-payment:v1" as const;

const persistedAssetRowSchema = z.object({
  asset_id: z.string().min(1),
  asset_type: z.enum(["native", "issued"]),
  currency_code: z.string().min(1),
  issuer: z.string().min(1).nullable(),
  amount_scale: z.number().int().min(0).max(18),
});

export const persistedBillSettlementRowSchema = z.object({
  settlement_contract_version: z.literal(BILL_SETTLEMENT_CONTRACT_VERSION),
  settlement_asset_id: z.string().min(1),
  settlement_asset_type: z.enum(["native", "issued"]),
  settlement_currency: z.string().min(1),
  settlement_issuer: z.string().min(1).nullable(),
  settlement_amount_scale: z.number().int().min(0).max(18),
  total_amount_units: z.string().regex(/^[1-9]\d*$/),
  creator_share_amount_units: z.string().regex(/^(?:0|[1-9]\d*)$/),
});

export const persistedSlotObligationRowSchema = persistedAssetRowSchema.extend({
  payment_contract_version: z.literal(PAYMENT_SLOT_CONTRACT_VERSION),
  expected_amount_units: z.string().regex(/^[1-9]\d*$/),
});

export const persistedReceiptAssetRowSchema = persistedAssetRowSchema.extend({
  verified_payment_contract_version: z.literal(
    VERIFIED_PAYMENT_CONTRACT_VERSION,
  ),
  receipt_contract: z.enum([
    "xrpl-xrp-payment-v1",
    "xrpl-issued-payment-v1",
  ]),
  amount_units: z.string().regex(/^[1-9]\d*$/),
  delivered_amount_units: z.string().regex(/^[1-9]\d*$/),
  verified_payment_digest: z
    .string()
    .regex(/^[A-F0-9]{64}$/)
    .nullable(),
});

export type PersistedBillSettlementRow = z.infer<
  typeof persistedBillSettlementRowSchema
>;
export type PersistedSlotObligationRow = z.infer<
  typeof persistedSlotObligationRowSchema
>;
export type PersistedReceiptAssetRow = z.infer<
  typeof persistedReceiptAssetRowSchema
>;

export function assetDescriptorFromPersistedRow(
  network: "testnet" | "mainnet",
  row: z.infer<typeof persistedAssetRowSchema>,
) {
  return assetDescriptorSchema.parse({
    id: row.asset_id,
    paymentRail: "xrpl",
    network,
    assetType: row.asset_type,
    currency: row.currency_code,
    issuer: row.issuer,
    precision: row.amount_scale,
    symbol: row.currency_code === "524C555344000000000000000000000000000000"
      ? "RLUSD"
      : row.currency_code,
    verificationStrategy:
      row.asset_type === "native" ? "xrpl-xrp-v1" : "xrpl-issued-asset-v1",
    receiptContract:
      row.asset_type === "native"
        ? "xrpl-xrp-payment-v1"
        : "xrpl-issued-payment-v1",
  });
}

export function moneyAmountFromPersistedUnits(
  code: string,
  units: string,
  scale: number,
) {
  return moneyAmountSchema.parse({ code, units, scale });
}
