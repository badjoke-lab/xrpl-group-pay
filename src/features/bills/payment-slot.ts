import type { z } from "zod";
import type {
  AssetDescriptor,
  XrplNetwork,
} from "@/features/assets/types";
import type { MoneyAmount } from "@/features/money/types";
import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import { PAYMENT_SLOT_CONTRACT_VERSION } from "@/features/persistence/asset-records";
import { hashCapabilityToken } from "./capabilities";
import {
  billStatusSchema,
  normalizePaymentSlotRecord,
  paymentSlotRecordSchema,
  SELECT_PAYMENT_SLOT,
  slotStatusSchema,
} from "./payment-slot-record";

export type ResolvedPaymentSlot = {
  slotId: string;
  slotPublicId: string;
  billId: string;
  billPublicId: string;
  billTitle: string;
  network: XrplNetwork;
  destinationAddress: string;
  destinationTag: number | null;
  participantLabel: string | null;
  expectedPayerAddress: string;
  expectedAmountDrops: string;
  paymentContractVersion?: typeof PAYMENT_SLOT_CONTRACT_VERSION;
  asset?: AssetDescriptor;
  expectedAmount?: MoneyAmount;
  invoiceId: string;
  slotStatus: z.infer<typeof slotStatusSchema>;
  billStatus: z.infer<typeof billStatusSchema>;
  paidTransactionId: string | null;
};

export class PaymentSlotNotFoundError extends Error {
  constructor() {
    super("The payment link is invalid or unavailable.");
    this.name = "PaymentSlotNotFoundError";
  }
}

export class PaymentSlotStateError extends Error {
  constructor(
    readonly code: "SLOT_ALREADY_PAID" | "BILL_NOT_PAYABLE",
    message: string,
  ) {
    super(message);
    this.name = "PaymentSlotStateError";
  }
}

const payloadEligibleStatuses = new Set<ResolvedPaymentSlot["slotStatus"]>([
  "unpaid",
  "payload_created",
  "awaiting_signature",
  "rejected",
  "expired",
  "verification_failed",
]);

export async function loadPaymentSlotByToken(
  database: D1DatabaseLike,
  paymentToken: string,
): Promise<ResolvedPaymentSlot> {
  let tokenHash: string;
  try {
    tokenHash = await hashCapabilityToken(paymentToken);
  } catch {
    throw new PaymentSlotNotFoundError();
  }
  const row = await database.prepare(SELECT_PAYMENT_SLOT).bind(tokenHash).first();
  const parsed = paymentSlotRecordSchema.safeParse(row);
  if (!parsed.success) throw new PaymentSlotNotFoundError();
  const normalized = normalizePaymentSlotRecord(parsed.data);
  return {
    slotId: parsed.data.slot_id,
    slotPublicId: parsed.data.slot_public_id,
    billId: parsed.data.bill_id,
    billPublicId: parsed.data.bill_public_id,
    billTitle: parsed.data.bill_title,
    network: parsed.data.network,
    destinationAddress: parsed.data.destination_address,
    destinationTag: parsed.data.destination_tag,
    participantLabel: parsed.data.participant_label,
    expectedPayerAddress: parsed.data.expected_payer_address,
    expectedAmountDrops: normalized.amountUnits,
    paymentContractVersion: parsed.data.payment_contract_version,
    asset: normalized.asset,
    expectedAmount: normalized.expectedAmount,
    invoiceId: parsed.data.invoice_id,
    slotStatus: parsed.data.slot_status,
    billStatus: parsed.data.bill_status,
    paidTransactionId: parsed.data.paid_tx_hash,
  };
}

export function requirePayableSlot(slot: ResolvedPaymentSlot) {
  if (slot.slotStatus === "paid") {
    throw new PaymentSlotStateError("SLOT_ALREADY_PAID", "This payment slot is already paid.");
  }
  if (!["open", "partially_paid"].includes(slot.billStatus) || !payloadEligibleStatuses.has(slot.slotStatus)) {
    throw new PaymentSlotStateError("BILL_NOT_PAYABLE", "This payment slot is not accepting a new sign request.");
  }
  return slot;
}
