import { z } from "zod";

import {
  verifiedPaymentSchema,
  type VerifiedPayment,
} from "@/features/payment-verification/verified-payment";

import type { D1DatabaseLike } from "./d1-types";
import { digestVerifiedPayment } from "./verified-payment-digest";
import {
  prepareVerifiedPaymentRecordInsert,
  SELECT_VERIFIED_PAYMENT_RECORD,
  verifiedPaymentRecordRowSchema,
} from "./verified-payment-record";

export const recordedVerifiedPaymentSchema = z
  .object({
    receiptId: z.string().min(1),
    status: z.enum(["recorded", "existing"]),
    network: z.enum(["testnet", "mainnet"]),
    transactionId: z.string().regex(/^[A-F0-9]{64}$/),
    invoiceId: z.string().regex(/^[A-F0-9]{64}$/),
    assetId: z.string().min(1),
    recordedAt: z.string().datetime(),
    verifiedPaymentDigest: z.string().regex(/^[A-F0-9]{64}$/),
    legacyProofDigest: z.string().regex(/^[A-F0-9]{64}$/).nullable(),
  })
  .strict();

export type RecordedVerifiedPayment = z.infer<
  typeof recordedVerifiedPaymentSchema
>;

export class VerifiedPaymentRecordError extends Error {
  constructor(message = "The verified payment could not be recorded.") {
    super(message);
    this.name = "VerifiedPaymentRecordError";
  }
}

export async function recordVerifiedPayment(
  database: D1DatabaseLike,
  input: VerifiedPayment,
  options: {
    recordedAt?: Date;
    legacyProofDigest?: string | null;
  } = {},
): Promise<RecordedVerifiedPayment> {
  const payment = verifiedPaymentSchema.parse(input);
  const recordedAt = (options.recordedAt ?? new Date()).toISOString();
  const legacyProofDigest = options.legacyProofDigest ?? null;
  const verifiedPaymentDigest = await digestVerifiedPayment(payment);

  const statements = [
    prepareVerifiedPaymentRecordInsert(
      database,
      payment,
      recordedAt,
      verifiedPaymentDigest,
      legacyProofDigest,
    ),
    database
      .prepare(SELECT_VERIFIED_PAYMENT_RECORD)
      .bind(payment.idempotencyKey),
  ];

  try {
    const [write, read] = await database.batch(statements);
    const row = verifiedPaymentRecordRowSchema.safeParse(read?.results?.[0]);

    if (
      !write?.success ||
      !read?.success ||
      !row.success ||
      row.data.transaction_id !== payment.transactionId ||
      row.data.invoice_id !== payment.invoiceId ||
      row.data.asset_id !== payment.asset.id ||
      row.data.amount_units !== payment.requestedAmount.units ||
      row.data.delivered_amount_units !== payment.deliveredAmount.units ||
      row.data.verified_payment_digest !== verifiedPaymentDigest ||
      row.data.legacy_proof_digest !== legacyProofDigest
    ) {
      throw new VerifiedPaymentRecordError();
    }

    return recordedVerifiedPaymentSchema.parse({
      receiptId: row.data.receipt_id,
      status: (write.meta?.changes ?? 0) > 0 ? "recorded" : "existing",
      network: row.data.network,
      transactionId: row.data.transaction_id,
      invoiceId: row.data.invoice_id,
      assetId: row.data.asset_id,
      recordedAt: row.data.recorded_at,
      verifiedPaymentDigest: row.data.verified_payment_digest,
      legacyProofDigest: row.data.legacy_proof_digest,
    });
  } catch (error) {
    if (error instanceof VerifiedPaymentRecordError) throw error;
    throw new VerifiedPaymentRecordError();
  }
}
