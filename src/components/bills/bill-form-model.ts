import type { RemainderAssignment } from "@/features/bills/allocation-engine";
import type { AllocationFormStrategy } from "@/features/bills/allocation-form";
import type { AllocationViewSummary } from "@/features/bills/allocation-view";
import type { CreateBillInput } from "@/features/bills/types";
import { decimalToUnits } from "@/features/money/money";

import type { RemainderMode } from "./remainder-controls";

export type SettlementAssetId =
  | "xrpl:testnet:xrp"
  | "xrpl:testnet:rlusd";

export type ParticipantDraft = {
  id: string;
  label: string;
  expectedPayerAddress: string;
  amount: string;
  percentage: string;
  shares: string;
  remainderUnits: string;
};

export type BillDraft = {
  title: string;
  destinationAddress: string;
  destinationTag: string;
  settlementAssetId: SettlementAssetId;
  totalAmount: string;
  creatorShareAmount: string;
  allocationStrategy: AllocationFormStrategy;
  remainderMode: RemainderMode;
  remainderParticipantId: string;
  participants: ParticipantDraft[];
};

export const ALLOCATION_STRATEGIES: Array<{
  id: AllocationFormStrategy;
  label: string;
  description: string;
}> = [
  {
    id: "custom",
    label: "Custom Amount",
    description: "Enter each participant obligation directly.",
  },
  {
    id: "equal",
    label: "Equal",
    description: "Split the participant portion evenly.",
  },
  {
    id: "percentage",
    label: "Percentage",
    description: "Assign exact percentages totaling 100%.",
  },
  {
    id: "shares",
    label: "Shares",
    description: "Use positive whole-number relative weights.",
  },
];

export function newParticipant(): ParticipantDraft {
  return {
    id: crypto.randomUUID(),
    label: "",
    expectedPayerAddress: "",
    amount: "",
    percentage: "",
    shares: "1",
    remainderUnits: "0",
  };
}

export function newBillDraft(): BillDraft {
  return {
    title: "",
    destinationAddress: "",
    destinationTag: "",
    settlementAssetId: "xrpl:testnet:xrp",
    totalAmount: "",
    creatorShareAmount: "",
    allocationStrategy: "custom",
    remainderMode: "",
    remainderParticipantId: "",
    participants: [newParticipant(), newParticipant()],
  };
}

export function strategyLabel(strategy: AllocationFormStrategy) {
  return (
    ALLOCATION_STRATEGIES.find((item) => item.id === strategy)?.label ??
    strategy
  );
}

export function participantDisplayLabel(
  draft: BillDraft,
  participantId: string,
) {
  const index = draft.participants.findIndex((item) => item.id === participantId);
  if (index < 0) return "Unknown participant";
  return draft.participants[index].label.trim() || `Participant ${index + 1}`;
}

export function createAllocationSummary(input: {
  draft: BillDraft;
  remainderUnits: string | null;
  appliedAssignment:
    | { kind: "none" }
    | { kind: "creator"; units: string }
    | { kind: "participant"; participantId: string; units: string }
    | {
        kind: "manual";
        increments: Array<{ participantId: string; units: string }>;
      }
    | null;
}): AllocationViewSummary {
  let remainderAssignmentLabel = "No remainder";
  if (input.appliedAssignment?.kind === "creator") {
    remainderAssignmentLabel = "Creator";
  } else if (input.appliedAssignment?.kind === "participant") {
    remainderAssignmentLabel = participantDisplayLabel(
      input.draft,
      input.appliedAssignment.participantId,
    );
  } else if (input.appliedAssignment?.kind === "manual") {
    remainderAssignmentLabel = "Manual participant distribution";
  }

  return {
    strategy: input.draft.allocationStrategy,
    strategyLabel: strategyLabel(input.draft.allocationStrategy),
    remainderUnits: input.remainderUnits ?? "0",
    remainderAssignmentLabel,
  };
}

export function billDraftToInput(input: {
  draft: BillDraft;
  remainderAssignment?: RemainderAssignment;
  includeRemainder: boolean;
}): CreateBillInput {
  const value = input.draft;
  const destinationTag = value.destinationTag.trim();
  const base = {
    title: value.title,
    destinationAddress: value.destinationAddress,
    ...(destinationTag ? { destinationTag } : {}),
    settlementAssetId: value.settlementAssetId,
    totalAmount: value.totalAmount,
    creatorShareAmount: value.creatorShareAmount,
  };
  const participants = value.participants.map((item) => ({
    participantId: item.id,
    ...(item.label.trim() ? { label: item.label } : {}),
    expectedPayerAddress: item.expectedPayerAddress,
    ...(value.allocationStrategy === "custom" ? { amount: item.amount } : {}),
  }));
  const remainder =
    input.includeRemainder && input.remainderAssignment
      ? { remainderAssignment: input.remainderAssignment }
      : {};

  if (value.allocationStrategy === "custom") {
    return { ...base, allocation: { strategy: "custom" }, participants };
  }
  if (value.allocationStrategy === "equal") {
    return {
      ...base,
      allocation: { strategy: "equal", ...remainder },
      participants,
    };
  }
  if (value.allocationStrategy === "percentage") {
    return {
      ...base,
      allocation: {
        strategy: "percentage",
        percentageScale: 2,
        percentages: value.participants.map((item) => ({
          participantId: item.id,
          units: decimalToUnits(item.percentage, 2),
        })),
        ...remainder,
      },
      participants,
    };
  }
  return {
    ...base,
    allocation: {
      strategy: "shares",
      shares: value.participants.map((item) => ({
        participantId: item.id,
        units: item.shares.trim(),
      })),
      ...remainder,
    },
    participants,
  };
}
