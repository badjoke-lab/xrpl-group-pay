import { z } from "zod";

import { PAYMENT_SLOT_CONTRACT_VERSION } from "@/features/persistence/asset-records";
import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import {
  recordedVerifiedPaymentSchema,
  type RecordedVerifiedPayment,
} from "@/features/persistence/record-verified-payment";
import { digestVerifiedPayment } from "@/features/persistence/verified-payment-digest";
import {
  verifiedPaymentSchema,
  type VerifiedPayment,
} from "@/features/payment-verification/verified-payment";

import {
  INSERT_ISSUED_SLOT_RECEIPT,
  MARK_ISSUED_SLOT_PAID,
  SELECT_ISSUED_SLOT_SETTLEMENT,
} from "./issued-slot-state-sql";
import type { ResolvedPaymentSlot } from "./payment-slot";
import {
  PaymentSlotSettlementConflictError,
  PaymentSlotSettlementDatabaseError,
} from "./settle-slot";
import { RECOMPUTE_BILL } from "./slot-state-sql";

const rowSchema = z.object({
  receipt_id: z.string().min(1),
  network: z.enum(["testnet", "mainnet"]),
  transaction_id: z.string().regex(/^[A-F0-9]{64}$/),
  invoice_id: z.string().regex(/^[A-F0-9]{64}$/),
  asset_id: z.string().min(1),
  recorded_at: z.string().datetime(),
  verified_payment_digest: z.string().regex(/^[A-F0-9]{64}$/),
  legacy_proof_digest: z.string().regex(/^[A-F0-9]{64}$/).nullable(),
  slot_public_id: z.string().uuid(),
  slot_status: z.literal("paid"),
  paid_tx_hash: z.string().regex(/^[A-F0-9]{64}$/),
  paid_at: z.string().datetime(),
  bill_public_id: z.string().uuid(),
  bill_status: z.enum(["partially_paid", "settled"]),
});

export type SettledIssuedPaymentSlot = {
  receipt: RecordedVerifiedPayment;
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

function sameAsset(
  slot: ResolvedPaymentSlot,
  payment: VerifiedPayment,
): boolean {
  const asset = slot.asset;
  return (
    asset !== undefined &&
    asset.assetType === "issued" &&
    payment.asset.assetType === "issued" &&
    asset.id === payment.asset.id &&
    asset.paymentRail === payment.asset.paymentRail &&
    asset.network === payment.asset.network &&
    asset.currency === payment.asset.currency &&
    asset.issuer === payment.asset.issuer &&
    asset.precision === payment.asset.precision &&
    asset.symbol === payment.asset.symbol &&
    asset.verificationStrategy === payment.asset.verificationStrategy &&
    asset.receiptContract === payment.asset.receiptContract
  );
}

function assertPaymentMatchesSlot(
  slot: ResolvedPaymentSlot,
  payment: VerifiedPayment,
) {
  const expectedAmount = slot.expectedAmount;
  if (
    slot.paymentContractVersion !== PAYMENT_SLOT_CONTRACT_VERSION ||
    expectedAmount === undefined ||
    payment.asset.assetType !== "issued" ||
    !sameAsset(slot, payment) ||
    payment.network !== slot.network ||
    payment.sender !== slot.expectedPayerAddress ||
    payment.destination !== slot.destinationAddress ||
    payment.destinationTag !== slot.destinationTag ||
    payment.invoiceId !== slot.invoiceId ||
    payment.requestedAmount.code !== expectedAmount.code ||
    payment.requestedAmount.scale !== expectedAmount.scale ||
    payment.requestedAmount.units !== expectedAmount.units ||
    payment.deliveredAmount.code !== expectedAmount.code ||
    payment.deliveredAmount.scale !== expectedAmount.scale ||
    payment.deliveredAmount.units !== expectedAmount.units
  ) {
    throw new PaymentSlotSettlementConflictError(
      "SLOT_PROOF_MISMATCH",
      "The verified issued payment does not match the frozen payment slot.",
    );
  }

  if (
    slot.slotStatus === "paid" &&
    slot.paidTransactionId !== payment.transactionId
  ) {
    throw new PaymentSlotSettlementConflictError(
      "SLOT_ALREADY_PAID",
      "This payment slot already accepted another transaction.",
    );
  }
}

export async function settleVerifiedIssuedPaymentSlot(
  database: D1DatabaseLike,
  slot: ResolvedPaymentSlot,
  input: VerifiedPayment,
  now = new Date(),
): Promise<SettledIssuedPaymentSlot> {
  const payment = verifiedPaymentSchema.parse(input);
  assertPaymentMatchesSlot(slot, payment);

  const recordedAt = now.toISOString();
  const verifiedPaymentDigest = await digestVerifiedPayment(payment);
  const receiptId = payment.idempotencyKey;
  const asset = payment.asset;

  if (asset.assetType !== "issued") {
    throw new PaymentSlotSettlementConflictError(
      "SLOT_PROOF_MISMATCH",
      "The issued settlement path received a native Asset.",
    );
  }

  const statements = [
    database.prepare(INSERT_ISSUED_SLOT_RECEIPT).bind(
      receiptId,
      payment.contractVersion,
      payment.receiptContract,
      payment.network,
      payment.transactionId,
      payment.invoiceId,
      payment.ledgerIndex,
      payment.sender,
      payment.destination,
      asset.id,
      asset.assetType,
      asset.currency,
      asset.issuer,
      asset.precision,
      payment.requestedAmount.units,
      payment.deliveredAmount.units,
      payment.sourceTag,
      payment.destinationTag,
      payment.verifiedAt,
      recordedAt,
      verifiedPaymentDigest,
      null,
      slot.slotId,
      PAYMENT_SLOT_CONTRACT_VERSION,
    ),
    database.prepare(MARK_ISSUED_SLOT_PAID).bind(
      receiptId,
      payment.transactionId,
      payment.ledgerIndex,
      recordedAt,
      slot.slotId,
      payment.invoiceId,
      payment.sender,
      PAYMENT_SLOT_CONTRACT_VERSION,
      asset.id,
      asset.assetType,
      asset.currency,
      asset.issuer,
      asset.precision,
      payment.requestedAmount.units,
      payment.network,
      payment.destination,
      payment.destinationTag,
      verifiedPaymentDigest,
    ),
    database.prepare(RECOMPUTE_BILL).bind(recordedAt, slot.billId),
    database.prepare(SELECT_ISSUED_SLOT_SETTLEMENT).bind(slot.slotId),
  ];

  try {
    const [receiptWrite, slotWrite, billWrite, read] =
      await database.batch(statements);
    const parsed = rowSchema.safeParse(read?.results?.[0]);

    if (
      parsed.success &&
      parsed.data.paid_tx_hash !== payment.transactionId
    ) {
      throw new PaymentSlotSettlementConflictError(
        "SLOT_ALREADY_PAID",
        "This payment slot already accepted another transaction.",
      );
    }

    if (
      !receiptWrite?.success ||
      !slotWrite?.success ||
      !billWrite?.success ||
      !read?.success ||
      (slotWrite.meta?.changes ?? 0) !== 1 ||
      !parsed.success ||
      parsed.data.transaction_id !== payment.transactionId ||
      parsed.data.invoice_id !== payment.invoiceId ||
      parsed.data.asset_id !== asset.id ||
      parsed.data.verified_payment_digest !== verifiedPaymentDigest ||
      parsed.data.legacy_proof_digest !== null
    ) {
      throw new PaymentSlotSettlementDatabaseError();
    }

    return {
      receipt: recordedVerifiedPaymentSchema.parse({
        receiptId: parsed.data.receipt_id,
        status: (receiptWrite.meta?.changes ?? 0) > 0 ? "recorded" : "existing",
        network: parsed.data.network,
        transactionId: parsed.data.transaction_id,
        invoiceId: parsed.data.invoice_id,
        assetId: parsed.data.asset_id,
        recordedAt: parsed.data.recorded_at,
        verifiedPaymentDigest: parsed.data.verified_payment_digest,
        legacyProofDigest: parsed.data.legacy_proof_digest,
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
