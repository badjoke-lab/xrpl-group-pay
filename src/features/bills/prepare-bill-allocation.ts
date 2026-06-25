import type { AssetDescriptor } from "@/features/assets/types";
import { decimalToUnits, MoneyAmountError } from "@/features/money/money";

import {
  allocateBill,
  AllocationError,
  type AllocationInput,
  type AllocationResult,
} from "./allocation-engine";
import type {
  BillAllocationInput,
  NormalizedCreateBillInput,
} from "./types";

export class BillAllocationPreparationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillAllocationPreparationError";
  }
}

export type PreparedBillAllocation = {
  participantIds: string[];
  contractInput: BillAllocationInput;
  result: AllocationResult;
};

function participantId(
  participant: NormalizedCreateBillInput["participants"][number],
  index: number,
) {
  return participant.participantId ?? `participant-${index + 1}`;
}

function parseParticipantUnits(asset: AssetDescriptor, value: string) {
  try {
    const units = decimalToUnits(value, asset.precision);
    if (units === "0") {
      throw new BillAllocationPreparationError(
        "Each participant amount must be greater than zero.",
      );
    }
    return units;
  } catch (error) {
    if (error instanceof BillAllocationPreparationError) throw error;
    if (error instanceof MoneyAmountError) {
      throw new BillAllocationPreparationError(
        `Each participant amount must use at most ${asset.precision} decimal places.`,
      );
    }
    throw error;
  }
}

function engineInput(input: {
  normalizedInput: NormalizedCreateBillInput;
  asset: AssetDescriptor;
  totalUnits: string;
  creatorShareUnits: string;
  participantIds: string[];
  contractInput: BillAllocationInput;
}): AllocationInput {
  const base = {
    totalUnits: input.totalUnits,
    creatorShareUnits: input.creatorShareUnits,
    participantIds: input.participantIds,
  };
  const allocation = input.contractInput;

  if (allocation.strategy === "custom") {
    return {
      ...base,
      strategy: "custom",
      participantUnits: input.normalizedInput.participants.map(
        (participant, index) => {
          if (participant.amount === undefined) {
            throw new BillAllocationPreparationError(
              "Every participant requires an amount for Custom Amount allocation.",
            );
          }
          return {
            participantId: input.participantIds[index],
            units: parseParticipantUnits(input.asset, participant.amount),
          };
        },
      ),
    };
  }

  if (
    input.normalizedInput.participants.some(
      (participant) => participant.amount !== undefined,
    )
  ) {
    throw new BillAllocationPreparationError(
      "Participant amount fields are only accepted for Custom Amount allocation.",
    );
  }

  if (allocation.strategy === "equal") {
    return {
      ...base,
      strategy: "equal",
      ...(allocation.remainderAssignment
        ? { remainderAssignment: allocation.remainderAssignment }
        : {}),
    };
  }
  if (allocation.strategy === "percentage") {
    return {
      ...base,
      strategy: "percentage",
      percentageScale: allocation.percentageScale,
      percentages: allocation.percentages,
      ...(allocation.remainderAssignment
        ? { remainderAssignment: allocation.remainderAssignment }
        : {}),
    };
  }
  return {
    ...base,
    strategy: "shares",
    shares: allocation.shares,
    ...(allocation.remainderAssignment
      ? { remainderAssignment: allocation.remainderAssignment }
      : {}),
  };
}

export function prepareBillAllocation(input: {
  normalizedInput: NormalizedCreateBillInput;
  asset: AssetDescriptor;
  totalUnits: string;
  creatorShareUnits: string;
}): PreparedBillAllocation {
  const participantIds = input.normalizedInput.participants.map(participantId);
  const contractInput = input.normalizedInput.allocation ?? {
    strategy: "custom" as const,
  };

  try {
    return {
      participantIds,
      contractInput,
      result: allocateBill(
        engineInput({
          ...input,
          participantIds,
          contractInput,
        }),
      ),
    };
  } catch (error) {
    if (error instanceof BillAllocationPreparationError) throw error;
    if (error instanceof AllocationError) {
      throw new BillAllocationPreparationError(error.message);
    }
    throw error;
  }
}
