import { z } from "zod";

import {
  ledgerVerificationProofSchema,
  type LedgerVerificationProof,
} from "@/features/payment-verification/types";

import type { D1DatabaseLike } from "./d1-types";

const receiptRowSchema = z.object({
  receipt_id: z.string().min(1),
  network: z.literal("testnet"),
  transaction_id: z.string().regex(/^[A-F0-9]{64}$/),
  invoice_id: z.string().regex(/^[A-F0-9]{64}$/),
  ledger_index: z.number().int().nonnegative(),
  sender: z.string().min(1),
  destination: z.string().min(1),
  amount_drops: z.string().regex(/^(?:0|[1-9]\d*)$/),
  delivered_amount_drops: z.string().regex(/^(?:0|[1-9]\d*)$/),
  source_tag: z.number().int().min(0).max(4_294_967_295),
  destination_tag: z.number().int().min(0).max(4_294_967_295).nullable(),
  verified_at: z.string().datetime(),
  recorded_at: z.string().datetime(),
  proof_digest: z.string().regex(/^[A-F0-9]{64}$/),
});

export const recordedPaymentReceiptSchema = z
  .object({
    receiptId: z.string().min(1),
    status: z.enum(["created", "existing"]),
    network: z.literal("testnet"),
    transactionId: z.string().regex(/^[A-F0-9]{64}$/),
    invoiceId: z.string().regex(/^[A-F0-9]{64}$/),
    recordedAt: z.string().datetime(),
    proofDigest: z.string().regex(/^[A-F0-9]{64}$/),
  })
  .strict();

export type RecordedPaymentReceipt = z.infer<
  typeof recordedPaymentReceiptSchema
>;

export class PaymentReceiptInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentReceiptInputError";
  }
}

export class PaymentReceiptConflictError extends Error {
  constructor(
    readonly code: "TRANSACTION_PROOF_CONFLICT" | "INVOICE_ALREADY_RECORDED",
    message: string,
  ) {
    super(message);
    this.name = "PaymentReceiptConflictError";
  }
}

export class PaymentReceiptDatabaseError extends Error {
  constructor() {
    super("The verified payment receipt could not be stored.");
    this.name = "PaymentReceiptDatabaseError";
  }
}

const INSERT_RECEIPT = `
  INSERT INTO verified_payment_receipts (
    receipt_id,
    network,
    transaction_id,
    invoice_id,
    ledger_index,
    sender,
    destination,
    amount_drops,
    delivered_amount_drops,
    source_tag,
    destination_tag,
    verified_at,
    recorded_at,
    proof_digest
  ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
  ON CONFLICT(network, transaction_id) DO NOTHING
`;

const SELECT_BY_TRANSACTION = `
  SELECT
    receipt_id,
    network,
    transaction_id,
    invoice_id,
    ledger_index,
    sender,
    destination,
    amount_drops,
    delivered_amount_drops,
    source_tag,
    destination_tag,
    verified_at,
    recorded_at,
    proof_digest
  FROM verified_payment_receipts
  WHERE network = ?1 AND transaction_id = ?2
  LIMIT 1
`;

const SELECT_BY_INVOICE = `
  SELECT
    receipt_id,
    network,
    transaction_id,
    invoice_id,
    ledger_index,
    sender,
    destination,
    amount_drops,
    delivered_amount_drops,
    source_tag,
    destination_tag,
    verified_at,
    recorded_at,
    proof_digest
  FROM verified_payment_receipts
  WHERE network = ?1 AND invoice_id = ?2
  LIMIT 1
`;

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (value) =>
    value.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase();
}

async function digestProof(proof: LedgerVerificationProof) {
  const canonical = JSON.stringify({
    network: proof.network,
    transactionId: proof.transactionId,
    ledgerIndex: proof.ledgerIndex,
    sender: proof.sender,
    destination: proof.destination,
    amountDrops: proof.amountDrops,
    deliveredAmountDrops: proof.deliveredAmountDrops,
    sourceTag: proof.sourceTag,
    destinationTag: proof.destinationTag,
    invoiceId: proof.invoiceId,
    verifiedAt: proof.verifiedAt,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return bytesToHex(digest);
}

function normalizeProof(input: LedgerVerificationProof): LedgerVerificationProof {
  const parsed = ledgerVerificationProofSchema.parse(input);
  const transactionId = parsed.transactionId.toUpperCase();
  const invoiceId = parsed.invoiceId.toUpperCase();
  const idempotencyKey = `${parsed.network}:${transactionId}`;

  if (parsed.idempotencyKey.toLowerCase() !== idempotencyKey.toLowerCase()) {
    throw new PaymentReceiptInputError(
      "The verification idempotency key does not match its transaction.",
    );
  }

  return {
    ...parsed,
    transactionId,
    invoiceId,
    idempotencyKey,
  };
}

function toReceipt(
  row: z.infer<typeof receiptRowSchema>,
  status: RecordedPaymentReceipt["status"],
): RecordedPaymentReceipt {
  return recordedPaymentReceiptSchema.parse({
    receiptId: row.receipt_id,
    status,
    network: row.network,
    transactionId: row.transaction_id,
    invoiceId: row.invoice_id,
    recordedAt: row.recorded_at,
    proofDigest: row.proof_digest,
  });
}

async function findInvoiceConflict(
  database: D1DatabaseLike,
  proof: LedgerVerificationProof,
) {
  const candidate = await database
    .prepare(SELECT_BY_INVOICE)
    .bind(proof.network, proof.invoiceId)
    .first();
  const parsed = receiptRowSchema.safeParse(candidate);

  if (
    parsed.success &&
    parsed.data.transaction_id !== proof.transactionId
  ) {
    throw new PaymentReceiptConflictError(
      "INVOICE_ALREADY_RECORDED",
      "This InvoiceID is already attached to another verified transaction.",
    );
  }
}

export async function recordVerifiedPayment(
  database: D1DatabaseLike,
  input: LedgerVerificationProof,
  now = new Date(),
): Promise<RecordedPaymentReceipt> {
  const proof = normalizeProof(input);
  const recordedAt = now.toISOString();
  const proofDigest = await digestProof(proof);
  const receiptId = proof.idempotencyKey;

  const insert = database
    .prepare(INSERT_RECEIPT)
    .bind(
      receiptId,
      proof.network,
      proof.transactionId,
      proof.invoiceId,
      proof.ledgerIndex,
      proof.sender,
      proof.destination,
      proof.amountDrops,
      proof.deliveredAmountDrops,
      proof.sourceTag,
      proof.destinationTag,
      proof.verifiedAt,
      recordedAt,
      proofDigest,
    );
  const read = database
    .prepare(SELECT_BY_TRANSACTION)
    .bind(proof.network, proof.transactionId);

  try {
    const [insertResult, readResult] = await database.batch([insert, read]);
    const parsedRow = receiptRowSchema.safeParse(readResult?.results?.[0]);

    if (!insertResult?.success || !readResult?.success || !parsedRow.success) {
      throw new PaymentReceiptDatabaseError();
    }

    if (parsedRow.data.proof_digest !== proofDigest) {
      throw new PaymentReceiptConflictError(
        "TRANSACTION_PROOF_CONFLICT",
        "This transaction ID is already stored with different verified facts.",
      );
    }

    return toReceipt(
      parsedRow.data,
      (insertResult.meta?.changes ?? 0) > 0 ? "created" : "existing",
    );
  } catch (error) {
    if (
      error instanceof PaymentReceiptConflictError ||
      error instanceof PaymentReceiptInputError
    ) {
      throw error;
    }

    try {
      await findInvoiceConflict(database, proof);
    } catch (conflict) {
      if (conflict instanceof PaymentReceiptConflictError) {
        throw conflict;
      }
    }

    throw new PaymentReceiptDatabaseError();
  }
}
