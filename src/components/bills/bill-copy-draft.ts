import type { XrplNetwork } from "@/features/assets/types";
import type { BillProgress } from "@/features/bills/progress";
import { formatMoneyAmount } from "@/features/money/money";

import { writeBillDraftSession } from "./bill-draft-session";
import {
  newBillDraft,
  newParticipant,
  type BillDraft,
  type SettlementAssetId,
} from "./bill-form-model";

export class BillCopyDraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillCopyDraftError";
  }
}

export function billProgressToCopyDraft(
  progress: BillProgress,
  idFactory: () => string = () => crypto.randomUUID(),
): BillDraft {
  if (progress.access !== "admin") {
    throw new BillCopyDraftError(
      "Only the private management capability can copy a Bill draft.",
    );
  }
  if (progress.slots.length < 2) {
    throw new BillCopyDraftError(
      "A copied Bill requires at least two frozen PaymentSlots.",
    );
  }
  const network: XrplNetwork = progress.bill.network;
  const draft = newBillDraft(network);
  const recipientFunded = formatMoneyAmount(
    progress.bill.recipientFundedAmount,
  );

  return {
    ...draft,
    paymentMode: progress.bill.paymentMode,
    recipientLabel: progress.bill.recipientLabel ?? "",
    recipientFundedEnabled:
      progress.bill.paymentMode === "representative" &&
      progress.bill.recipientFundedAmount.units !== "0",
    recipientFundedAmount: recipientFunded,
    creatorShareAmount: recipientFunded,
    title: progress.bill.title,
    destinationAddress: progress.bill.destinationAddress,
    destinationTag:
      progress.bill.destinationTag === null
        ? ""
        : String(progress.bill.destinationTag),
    settlementAssetId: progress.bill.asset.id as SettlementAssetId,
    totalAmount: formatMoneyAmount(progress.bill.totalAmount),
    allocationStrategy: "custom",
    remainderMode: "",
    remainderParticipantId: "",
    participants: progress.slots.map((slot) => {
      if (!slot.expectedPayerAddress) {
        throw new BillCopyDraftError(
          "The copied Bill is missing a management-only payer address.",
        );
      }
      return {
        ...newParticipant(idFactory()),
        label: slot.participantLabel ?? "",
        expectedPayerAddress: slot.expectedPayerAddress,
        amount: formatMoneyAmount(slot.expectedAmount),
      };
    }),
  };
}

export function prepareCopiedBillDraft(progress: BillProgress) {
  const draft = billProgressToCopyDraft(progress);
  writeBillDraftSession(
    progress.bill.network,
    draft,
    1,
    progress.bill.publicId,
  );
  return draft;
}
