import {
  allocateBill,
  AllocationError,
  type AllocationInput,
} from "./allocation-engine";
import { decimalToUnits, MoneyAmountError } from "@/features/money/money";
import type { BillAllocationInput } from "./types";

export type AllocationFormStrategy =
  | "custom"
  | "equal"
  | "percentage"
  | "shares";

export type AllocationFormParticipant = {
  participantId: string;
  amount: string;
  percentage: string;
  shares: string;
};

export type AllocationFormPreview = {
  status: "incomplete" | "exact" | "needs_remainder" | "invalid";
  message: string;
  participantUnits: Record<string, string>;
  allocation: BillAllocationInput | null;
};

function incomplete(message: string): AllocationFormPreview {
  return {
    status: "incomplete",
    message,
    participantUnits: {},
    allocation: null,
  };
}

function invalid(message: string): AllocationFormPreview {
  return {
    status: "invalid",
    message,
    participantUnits: {},
    allocation: null,
  };
}

function parseDecimal(value: string, scale: number) {
  if (!value.trim()) return null;
  try {
    return decimalToUnits(value, scale);
  } catch (error) {
    if (error instanceof MoneyAmountError) return null;
    throw error;
  }
}

export function evaluateAllocationForm(input: {
  strategy: AllocationFormStrategy;
  totalAmount: string;
  creatorShareAmount: string;
  assetScale: number;
  participants: AllocationFormParticipant[];
}): AllocationFormPreview {
  const totalUnits = parseDecimal(input.totalAmount, input.assetScale);
  const creatorShareUnits = parseDecimal(
    input.creatorShareAmount,
    input.assetScale,
  );
  if (!totalUnits || creatorShareUnits === null) {
    return incomplete("Enter the Bill total and creator share.");
  }
  if (input.participants.length < 2) {
    return incomplete("At least two participants are required.");
  }

  const participantIds = input.participants.map(
    (participant) => participant.participantId,
  );
  let allocationInput: AllocationInput;
  let allocation: BillAllocationInput;

  if (input.strategy === "custom") {
    const participantUnits = input.participants.map((participant) => {
      const units = parseDecimal(participant.amount, input.assetScale);
      return units
        ? { participantId: participant.participantId, units }
        : null;
    });
    if (participantUnits.some((item) => item === null)) {
      return incomplete("Enter every participant amount.");
    }
    allocation = { strategy: "custom" };
    allocationInput = {
      strategy: "custom",
      totalUnits,
      creatorShareUnits,
      participantIds,
      participantUnits: participantUnits as Array<{
        participantId: string;
        units: string;
      }>,
    };
  } else if (input.strategy === "equal") {
    allocation = { strategy: "equal" };
    allocationInput = {
      strategy: "equal",
      totalUnits,
      creatorShareUnits,
      participantIds,
    };
  } else if (input.strategy === "percentage") {
    const percentages = input.participants.map((participant) => {
      const units = parseDecimal(participant.percentage, 2);
      return units
        ? { participantId: participant.participantId, units }
        : null;
    });
    if (percentages.some((item) => item === null)) {
      return incomplete("Enter every participant percentage.");
    }
    allocation = {
      strategy: "percentage",
      percentageScale: 2,
      percentages: percentages as Array<{
        participantId: string;
        units: string;
      }>,
    };
    allocationInput = {
      ...allocation,
      totalUnits,
      creatorShareUnits,
      participantIds,
    };
  } else {
    const shares = input.participants.map((participant) => {
      const value = participant.shares.trim();
      return /^[1-9]\d*$/.test(value)
        ? { participantId: participant.participantId, units: value }
        : null;
    });
    if (shares.some((item) => item === null)) {
      return incomplete("Enter a positive whole-number share for every participant.");
    }
    allocation = {
      strategy: "shares",
      shares: shares as Array<{ participantId: string; units: string }>,
    };
    allocationInput = {
      ...allocation,
      totalUnits,
      creatorShareUnits,
      participantIds,
    };
  }

  try {
    const result = allocateBill(allocationInput);
    return {
      status: "exact",
      message: "The server-authoritative allocation equals the Bill total.",
      participantUnits: Object.fromEntries(
        result.participantObligations.map((obligation) => [
          obligation.participantId,
          obligation.units,
        ]),
      ),
      allocation,
    };
  } catch (error) {
    if (error instanceof AllocationError) {
      if (error.message.startsWith("A remainder assignment is required")) {
        return {
          status: "needs_remainder",
          message:
            "This calculation leaves integer remainder units. Choose an explicit remainder rule before freezing the Bill.",
          participantUnits: {},
          allocation,
        };
      }
      return invalid(error.message);
    }
    throw error;
  }
}
