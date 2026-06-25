import { z } from "zod";

import type { D1DatabaseLike } from "./d1-types";
import type { VerifiedPayment } from "@/features/payment-verification/verified-payment";

const hashSchema = z.string().regex(/^[A-F0-9]{64}$/);

export const verifiedPaymentRecordRowSchema = z.object({
  receipt_id: z.string().min(1),
  verified_payment_contract_version: z.literal(
    "xrpl-group-pay:verified-payment:v1",
  ),
  receipt_contract: z.enum([
    "xrpl-xrp-payment-v1",
    "xrpl-issued-payment-v1",
  ]),
  network: z.enum(["testnet", "mainnet"]),
  transaction_id: hashSchema,
  invoice_id: hashSchema,
  asset_id: z.string().min(1),
  amount_units: z.string().regex(/^[1-9]\d*$/),
  delivered_amount_units: z.string().regex(/^[1-9]\d*$/),
  recorded_at: z.string().datetime(),
  verified_payment_digest: hashSchema,
  legacy_proof_digest: hashSchema.nullable(),
});

export type VerifiedPaymentRecordRow = z.infer<
  typeof verifiedPaymentRecordRowSchema
>;

export const INSERT_VERIFIED_PAYMENT_RECORD = `
  INSERT INTO verified_payment_records (
    receipt_id,
    verified_payment_contract_version,
    receipt_contract,
    network,
    transaction_id,
    invoice_id,
    ledger_index,
    sender,
    destination,
    asset_id,
    asset_type,
    currency_code,
    issuer,
    amount_scale,
    amount_units,
    delivered_amount_units,
    source_tag,
    destination_tag,
    verified_at,
    recorded_at,
    verified_payment_digest,
    legacy_proof_digest
  ) VALUES (
    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11,
    ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22
  )
  ON CONFLICT(receipt_id) DO UPDATE SET
    verified_payment_digest = excluded.verified_payment_digest,
    legacy_proof_digest = COALESCE(
      verified_payment_records.legacy_proof_digest,
      excluded.legacy_proof_digest
    )
  WHERE verified_payment_records.verified_payment_digest IS NULL
    AND verified_payment_records.verified_payment_contract_version = excluded.verified_payment_contract_version
    AND verified_payment_records.receipt_contract = excluded.receipt_contract
    AND verified_payment_records.network = excluded.network
    AND verified_payment_records.transaction_id = excluded.transaction_id
    AND verified_payment_records.invoice_id = excluded.invoice_id
    AND verified_payment_records.ledger_index = excluded.ledger_index
    AND verified_payment_records.sender = excluded.sender
    AND verified_payment_records.destination = excluded.destination
    AND verified_payment_records.asset_id = excluded.asset_id
    AND verified_payment_records.asset_type = excluded.asset_type
    AND verified_payment_records.currency_code = excluded.currency_code
    AND verified_payment_records.issuer IS excluded.issuer
    AND verified_payment_records.amount_scale = excluded.amount_scale
    AND verified_payment_records.amount_units = excluded.amount_units
    AND verified_payment_records.delivered_amount_units = excluded.delivered_amount_units
    AND verified_payment_records.source_tag = excluded.source_tag
    AND verified_payment_records.destination_tag IS excluded.destination_tag
    AND verified_payment_records.verified_at = excluded.verified_at
`;

export const SELECT_VERIFIED_PAYMENT_RECORD = `
  SELECT
    receipt_id,
    verified_payment_contract_version,
    receipt_contract,
    network,
    transaction_id,
    invoice_id,
    asset_id,
    amount_units,
    delivered_amount_units,
    recorded_at,
    verified_payment_digest,
    legacy_proof_digest
  FROM verified_payment_records
  WHERE receipt_id = ?1
  LIMIT 1
`;

export function prepareVerifiedPaymentRecordInsert(
  database: D1DatabaseLike,
  payment: VerifiedPayment,
  recordedAt: string,
  verifiedPaymentDigest: string,
  legacyProofDigest: string | null,
) {
  return database.prepare(INSERT_VERIFIED_PAYMENT_RECORD).bind(
    payment.idempotencyKey,
    payment.contractVersion,
    payment.receiptContract,
    payment.network,
    payment.transactionId,
    payment.invoiceId,
    payment.ledgerIndex,
    payment.sender,
    payment.destination,
    payment.asset.id,
    payment.asset.assetType,
    payment.asset.currency,
    payment.asset.issuer,
    payment.asset.precision,
    payment.requestedAmount.units,
    payment.deliveredAmount.units,
    payment.sourceTag,
    payment.destinationTag,
    payment.verifiedAt,
    recordedAt,
    verifiedPaymentDigest,
    legacyProofDigest,
  );
}
