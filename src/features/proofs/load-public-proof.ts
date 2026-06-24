import { z } from "zod";

import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import { digestVerifiedProof } from "@/features/persistence/digest-verified-proof";

import {
  publicTransactionProofSchema,
  type PublicTransactionProof,
} from "./types";

const proofTokenSchema = z.string().regex(/^[A-F0-9]{64}$/i);

const receiptRowSchema = z.object({
  network: z.literal("testnet"),
  transaction_id: z.string().regex(/^[A-F0-9]{64}$/),
  ledger_index: z.number().int().min(0),
  sender: z.string().min(1),
  destination: z.string().min(1),
  amount_drops: z.string().regex(/^(?:0|[1-9]\d*)$/),
  delivered_amount_drops: z.string().regex(/^(?:0|[1-9]\d*)$/),
  source_tag: z.number().int().min(0).max(4_294_967_295),
  destination_tag: z.number().int().min(0).max(4_294_967_295).nullable(),
  invoice_id: z.string().regex(/^[A-F0-9]{64}$/),
  verified_at: z.string().datetime(),
  recorded_at: z.string().datetime(),
  proof_digest: z.string().regex(/^[A-F0-9]{64}$/),
});

const SELECT_PUBLIC_PROOF = `
  SELECT
    network,
    transaction_id,
    ledger_index,
    sender,
    destination,
    amount_drops,
    delivered_amount_drops,
    source_tag,
    destination_tag,
    invoice_id,
    verified_at,
    recorded_at,
    proof_digest
  FROM verified_payment_receipts
  WHERE proof_digest = ?1
  LIMIT 1
`;

export class PublicProofNotFoundError extends Error {
  constructor() {
    super("The transaction proof is invalid or unavailable.");
    this.name = "PublicProofNotFoundError";
  }
}

export class PublicProofDatabaseError extends Error {
  constructor() {
    super("The transaction proof could not be loaded.");
    this.name = "PublicProofDatabaseError";
  }
}

export async function loadPublicProofByToken(
  database: D1DatabaseLike,
  proofToken: string,
): Promise<PublicTransactionProof> {
  const parsedToken = proofTokenSchema.safeParse(proofToken);
  if (!parsedToken.success) throw new PublicProofNotFoundError();

  try {
    const row = await database
      .prepare(SELECT_PUBLIC_PROOF)
      .bind(parsedToken.data.toUpperCase())
      .first();
    if (!row) throw new PublicProofNotFoundError();

    const parsedRow = receiptRowSchema.safeParse(row);
    if (!parsedRow.success) throw new PublicProofDatabaseError();

    const verifiedProof = {
      network: parsedRow.data.network,
      transactionId: parsedRow.data.transaction_id,
      ledgerIndex: parsedRow.data.ledger_index,
      sender: parsedRow.data.sender,
      destination: parsedRow.data.destination,
      amountDrops: parsedRow.data.amount_drops,
      deliveredAmountDrops: parsedRow.data.delivered_amount_drops,
      sourceTag: parsedRow.data.source_tag,
      destinationTag: parsedRow.data.destination_tag,
      invoiceId: parsedRow.data.invoice_id,
      idempotencyKey: `testnet:${parsedRow.data.transaction_id}` as const,
      verifiedAt: parsedRow.data.verified_at,
    };
    const calculatedDigest = await digestVerifiedProof(verifiedProof);
    if (calculatedDigest !== parsedRow.data.proof_digest) {
      throw new PublicProofDatabaseError();
    }

    return publicTransactionProofSchema.parse({
      network: verifiedProof.network,
      validationStatus: "validated",
      transactionResult: "tesSUCCESS",
      transactionId: verifiedProof.transactionId,
      ledgerIndex: verifiedProof.ledgerIndex,
      sender: verifiedProof.sender,
      destination: verifiedProof.destination,
      amountDrops: verifiedProof.amountDrops,
      deliveredAmountDrops: verifiedProof.deliveredAmountDrops,
      sourceTag: verifiedProof.sourceTag,
      destinationTag: verifiedProof.destinationTag,
      invoiceId: verifiedProof.invoiceId,
      verifiedAt: verifiedProof.verifiedAt,
      recordedAt: parsedRow.data.recorded_at,
      proofDigest: parsedRow.data.proof_digest,
    });
  } catch (error) {
    if (
      error instanceof PublicProofNotFoundError ||
      error instanceof PublicProofDatabaseError
    ) {
      throw error;
    }
    throw new PublicProofDatabaseError();
  }
}
