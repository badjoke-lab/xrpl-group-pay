import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import {
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
} from "./payment-slot";
import { buildStoredSlotPaymentIntent } from "./slot-payment-request";

export type PersistedPayloadDependencies = {
  sourceTag: number;
  createHandoff(
    intent: ReturnType<typeof buildStoredSlotPaymentIntent>,
  ): Promise<WalletHandoff>;
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
      billTitle: slot.billTitle,
      participantLabel: slot.participantLabel,
      expectedPayerAddress: slot.expectedPayerAddress,
      destinationAddress: slot.destinationAddress,
      destinationTag: slot.destinationTag,
      amountDrops: slot.expectedAmountDrops,
      sourceTag: dependencies.sourceTag,
      invoiceId: slot.invoiceId,
      network: slot.network,
    },
  };
}
