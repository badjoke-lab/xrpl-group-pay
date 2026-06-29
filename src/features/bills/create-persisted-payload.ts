import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import {
  hasPriorRequest,
  persistRequestState,
  requireNoActiveRequest,
} from "@/features/persistence/request-state-store";
import {
  WalletProviderError,
  type WalletHandoff,
} from "@/features/wallet-providers/types";

import type { StoredSlotPayload } from "./create-slot-payload";
import {
  loadPaymentSlotByToken,
  requirePayableSlot,
  type ResolvedPaymentSlot,
} from "./payment-slot";
import { paymentDetailsFromSlot } from "./payment-details";
import { PaymentReconciliationUnavailableError } from "./reconcile-replacement-payment";
import { buildStoredSlotPaymentIntent } from "./slot-payment-request";

export type PersistedPayloadDependencies = {
  sourceTag: number;
  createHandoff(
    intent: ReturnType<typeof buildStoredSlotPaymentIntent>,
  ): Promise<WalletHandoff>;
  reconcileReplacement?(
    database: D1DatabaseLike,
    slot: ResolvedPaymentSlot,
    now: Date,
  ): Promise<void>;
  now?: () => Date;
};

function requireParticipantHandoffFields(handoff: WalletHandoff) {
  const deepLink = handoff.mobileUri ?? handoff.browserUri;
  if (!deepLink || !handoff.qrImageUrl || !handoff.statusChannel) {
    throw new WalletProviderError(
      handoff.providerId,
      "INVALID_PROVIDER_RESPONSE",
      "The Wallet Handoff is missing participant-facing launch or status data.",
      502,
    );
  }

  return {
    deepLink,
    qrPng: handoff.qrImageUrl,
    websocketUrl: handoff.statusChannel,
  };
}

export async function createPersistedSlotPayload(
  database: D1DatabaseLike,
  capability: string,
  dependencies: PersistedPayloadDependencies,
): Promise<StoredSlotPayload> {
  const now = dependencies.now?.() ?? new Date();
  const slot = requirePayableSlot(
    await loadPaymentSlotByToken(database, capability),
  );

  await requireNoActiveRequest(database, slot.slotId, now);

  if (await hasPriorRequest(database, slot.slotId)) {
    if (!dependencies.reconcileReplacement) {
      throw new PaymentReconciliationUnavailableError(
        "Replacement payment reconciliation is not configured.",
      );
    }
    await dependencies.reconcileReplacement(database, slot, now);
  }

  const intent = buildStoredSlotPaymentIntent(
    slot,
    dependencies.sourceTag,
    now,
  );
  const handoff = await dependencies.createHandoff(intent);
  const participantHandoff = requireParticipantHandoffFields(handoff);

  await persistRequestState(
    database,
    slot.slotId,
    intent,
    {
      providerId: handoff.providerId,
      requestId: handoff.requestId,
      status: handoff.status,
      expiresAt: handoff.expiresAt,
      transactionId: handoff.transactionId,
    },
    now,
  );

  return {
    payloadId: handoff.requestId,
    status: "waiting",
    ...participantHandoff,
    slot: {
      publicId: slot.slotPublicId,
      billPublicId: slot.billPublicId,
      ...paymentDetailsFromSlot(slot, dependencies.sourceTag),
    },
  };
}
