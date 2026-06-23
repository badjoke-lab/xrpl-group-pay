import { z } from "zod";

import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import {
  recordedPaymentReceiptSchema,
  type RecordedPaymentReceipt,
} from "@/features/persistence/types";
import { digestVerifiedProof } from "@/features/persistence/digest-verified-proof";
import {
  normalizeVerifiedProof,
  VerifiedProofInputError,
} from "@/features/persistence/normalize-verified-proof";
import type { LedgerVerificationProof } from "@/features/payment-verification/types";

import type { ResolvedPaymentSlot } from "./payment-slot";
import { INSERT_SLOT_RECEIPT, SELECT_SLOT_SETTLEMENT } from "./receipt-write-sql";
import { MARK_SLOT_PAID, RECOMPUTE_BILL } from "./slot-state-sql";

const rowSchema = z.object({
  receipt_id: z.string().min(1),
  transaction_id: z.string().regex(/^[A-F0-9]{64}$/),
  invoice_id: z.string().regex(/^[A-F0-9]{64}$/),
  recorded_at: z.string().datetime(),
  proof_digest: z.string().regex(/^[A-F0-9]{64}$/),
  slot_public_id: z.string().uuid(),
  slot_status: z.literal("paid"),
  paid_tx_hash: z.string().regex(/^[A-F0-9]{64}$/),
  paid_at: z.string().datetime(),
  bill_public_id: z.string().uuid(),
  bill_status: z.enum(["partially_paid", "settled"]),
});

export type SettledPaymentSlot = {
  receipt: RecordedPaymentReceipt;
  slot: {
    publicId: string;
    status: "paid";
    paidTransactionId: string;
    paidAt: string;
  };
  bill: {
    publicId: string;
    status: "partially_paid" | "settled";
  };
};

export class PaymentSlotSettlementConflictError extends Error {
  constructor(
    readonly code: "SLOT_ALREADY_PAID" | "SLOT_PROOF_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "PaymentSlotSettlementConflictError";
  }
}

export class PaymentSlotSettlementDatabaseError extends Error {
  constructor() {
    super("The verified payment could not update its payment slot.");
    this.name = "PaymentSlotSettlementDatabaseError";
  }
}

function assertProofMatchesSlot(
  slot: ResolvedPaymentSlot,
  proof: LedgerVerificationProof,
) {
  if (
    proof.network !== slot.network ||
    proof.sender !== slot.expectedPayerAddress ||
    proof.destination !== slot.destinationAddress ||
    proof.destinationTag !== slot.destinationTag ||
    proof.amountDrops !== slot.expectedAmountDrops ||
    proof.deliveredAmountDrops !== slot.expectedAmountDrops ||
    proof.invoiceId !== slot.invoiceId
  ) {
    throw new PaymentSlotSettlementConflictError(
      "SLOT_PROOF_MISMATCH",
      "The verified ledger proof does not match the frozen payment slot.",
    );
  }

  if (
    slot.slotStatus === "paid" &&
    slot.paidTransactionId !== proof.transactionId
  ) {
    throw new PaymentSlotSettlementConflictError(
      "SLOT_ALREADY_PAID",
      "This payment slot already accepted another transaction.",
    );
  }
}

export async function settleVerifiedPaymentSlot(
  database: D1DatabaseLike,
  slot: ResolvedPaymentSlot,
  input: LedgerVerificationProof,
  now = new Date(),
): Promise<SettledPaymentSlot> {
  let proof: LedgerVerificationProof;
  try {
    proof = normalizeVerifiedProof(input);
  } catch (error) {
    if (error instanceof VerifiedProofInputError) {
      throw new PaymentSlotSettlementConflictError(
        "SLOT_PROOF_MISMATCH",
        error.message,
      );
    }
    throw error;
  }

  assertProofMatchesSlot(slot, proof);
  const recordedAt = now.toISOString();
  const proofDigest = await digestVerifiedProof(proof);
  const receiptId = proof.idempotencyKey;

  const statements = [
    database.prepare(INSERT_SLOT_RECEIPT).bind(
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
    ),
    database.prepare(MARK_SLOT_PAID).bind(
      receiptId,
      proof.transactionId,
      proof.ledgerIndex,
      recordedAt,
      slot.slotId,
      proof.invoiceId,
      proof.sender,
      proof.amountDrops,
      proofDigest,
    ),
    database.prepare(RECOMPUTE_BILL).bind(recordedAt, slot.billId),
    database.prepare(SELECT_SLOT_SETTLEMENT).bind(slot.slotId),
  ];

  try {
    const [receiptWrite, slotWrite, billWrite, read] =
      await database.batch(statements);
    const parsed = rowSchema.safeParse(read?.results?.[0]);

    if (
      !receiptWrite?.success ||
      !slotWrite?.success ||
      !billWrite?.success ||
      !read?.success ||
      (slotWrite.meta?.changes ?? 0) !== 1 ||
      !parsed.success ||
      parsed.data.transaction_id !== proof.transactionId ||
      parsed.data.invoice_id !== proof.invoiceId ||
      parsed.data.proof_digest !== proofDigest
    ) {
      throw new PaymentSlotSettlementDatabaseError();
    }

    return {
      receipt: recordedPaymentReceiptSchema.parse({
        receiptId: parsed.data.receipt_id,
        status: (receiptWrite.meta?.changes ?? 0) > 0 ? "created" : "existing",
        network: "testnet",
        transactionId: parsed.data.transaction_id,
        invoiceId: parsed.data.invoice_id,
        recordedAt: parsed.data.recorded_at,
        proofDigest: parsed.data.proof_digest,
      }),
      slot: {
        publicId: parsed.data.slot_public_id,
        status: "paid",
        paidTransactionId: parsed.data.paid_tx_hash,
        paidAt: parsed.data.paid_at,
      },
      bill: {
        publicId: parsed.data.bill_public_id,
        status: parsed.data.bill_status,
      },
    };
  } catch (error) {
    if (error instanceof PaymentSlotSettlementConflictError) {
      throw error;
    }
    throw new PaymentSlotSettlementDatabaseError();
  }
}
