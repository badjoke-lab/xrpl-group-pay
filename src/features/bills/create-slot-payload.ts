import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import type { XamanCreatePayloadResponse } from "@/features/xaman/schemas";

import {
  loadPaymentSlotByToken,
  PaymentSlotStateError,
  requirePayableSlot,
  type ResolvedPaymentSlot,
} from "./payment-slot";
import { buildStoredSlotPaymentPayload } from "./slot-payment-request";

export type StoredSlotPayload = {
  payloadId: string;
  status: "waiting";
  deepLink: string;
  qrPng: string;
  websocketUrl: string;
  slot: {
    publicId: string;
    billPublicId: string;
    billTitle: string;
    participantLabel: string | null;
    expectedPayerAddress: string;
    destinationAddress: string;
    destinationTag: number | null;
    amountDrops: string;
    invoiceId: string;
    network: "testnet";
  };
};

export type SlotPayloadDependencies = {
  sourceTag: number;
  createXamanPayload(
    request: ReturnType<typeof buildStoredSlotPaymentPayload>,
  ): Promise<XamanCreatePayloadResponse>;
  now?: () => Date;
};

const MARK_AWAITING_SIGNATURE = `
  UPDATE payment_slots
  SET status = 'awaiting_signature', updated_at = ?1
  WHERE id = ?2
    AND status IN (
      'unpaid',
      'payload_created',
      'awaiting_signature',
      'rejected',
      'expired',
      'verification_failed'
    )
    AND EXISTS (
      SELECT 1
      FROM bills
      WHERE bills.id = payment_slots.bill_id
        AND bills.status IN ('open', 'partially_paid')
    )
`;

async function markAwaitingSignature(
  database: D1DatabaseLike,
  slot: ResolvedPaymentSlot,
  timestamp: string,
) {
  const result = await database
    .prepare(MARK_AWAITING_SIGNATURE)
    .bind(timestamp, slot.slotId)
    .run();
  if (!result.success || (result.meta?.changes ?? 0) !== 1) {
    throw new PaymentSlotStateError(
      "BILL_NOT_PAYABLE",
      "This payment slot is not accepting a new Sign Request.",
    );
  }
}

export async function createStoredSlotPayload(
  database: D1DatabaseLike,
  paymentToken: string,
  dependencies: SlotPayloadDependencies,
): Promise<StoredSlotPayload> {
  const slot = requirePayableSlot(
    await loadPaymentSlotByToken(database, paymentToken),
  );
  const request = buildStoredSlotPaymentPayload(slot, dependencies.sourceTag);
  const payload = await dependencies.createXamanPayload(request);
  await markAwaitingSignature(
    database,
    slot,
    (dependencies.now?.() ?? new Date()).toISOString(),
  );

  return {
    payloadId: payload.uuid,
    status: "waiting",
    deepLink: payload.next.always,
    qrPng: payload.refs.qr_png,
    websocketUrl: payload.refs.websocket_status,
    slot: {
      publicId: slot.slotPublicId,
      billPublicId: slot.billPublicId,
      billTitle: slot.billTitle,
      participantLabel: slot.participantLabel,
      expectedPayerAddress: slot.expectedPayerAddress,
      destinationAddress: slot.destinationAddress,
      destinationTag: slot.destinationTag,
      amountDrops: slot.expectedAmountDrops,
      invoiceId: slot.invoiceId,
      network: slot.network,
    },
  };
}
