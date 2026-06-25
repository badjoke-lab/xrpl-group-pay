import type {
  AllocationResult,
  RemainderAssignment,
} from "./allocation-engine";
import type { BillAllocationInput } from "./types";

export const BILL_ALLOCATION_CONTRACT_VERSION =
  "xrpl-group-pay:bill-allocation:v1" as const;

export const INSERT_BILL_ALLOCATION = `
  INSERT INTO bill_allocations (
    bill_id,
    contract_version,
    strategy,
    revision,
    weight_scale,
    weight_total_units,
    remainder_units,
    remainder_kind,
    remainder_participant_id,
    created_at
  ) VALUES (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, ?9)
`;

export const INSERT_BILL_ALLOCATION_PARTICIPANT = `
  INSERT INTO bill_allocation_participants (
    bill_id,
    payment_slot_id,
    participant_id,
    input_units,
    base_amount_units,
    remainder_increment_units,
    final_amount_units,
    created_at
  ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
`;

export type PreparedAllocationPersistence = {
  strategy: BillAllocationInput["strategy"];
  weightScale: number | null;
  weightTotalUnits: string | null;
  remainderUnits: string;
  remainderKind:
    | "none"
    | "creator"
    | "first_participant"
    | "selected_participant"
    | "manual";
  remainderParticipantId: string | null;
  participants: Array<{
    participantId: string;
    inputUnits: string | null;
    baseAmountUnits: string;
    remainderIncrementUnits: string;
    finalAmountUnits: string;
  }>;
};

function participantInputUnits(
  allocation: BillAllocationInput,
  participantId: string,
  finalAmountUnits: string,
) {
  if (allocation.strategy === "custom") return finalAmountUnits;
  if (allocation.strategy === "equal") return null;
  const values =
    allocation.strategy === "percentage"
      ? allocation.percentages
      : allocation.shares;
  return values.find((item) => item.participantId === participantId)?.units ?? null;
}

function originalRemainderAssignment(
  allocation: BillAllocationInput,
): RemainderAssignment | undefined {
  return allocation.strategy === "custom"
    ? undefined
    : allocation.remainderAssignment;
}

function remainderIdentity(
  allocation: BillAllocationInput,
  result: AllocationResult,
  participantIds: string[],
) {
  if (result.remainderUnits === "0") {
    return { kind: "none" as const, participantId: null };
  }

  const assignment = originalRemainderAssignment(allocation);
  if (!assignment) {
    throw new Error("A non-zero allocation remainder must have an assignment.");
  }
  if (assignment.kind === "creator") {
    return { kind: "creator" as const, participantId: null };
  }
  if (assignment.kind === "first_participant") {
    return {
      kind: "first_participant" as const,
      participantId: participantIds[0],
    };
  }
  if (assignment.kind === "selected_participant") {
    return {
      kind: "selected_participant" as const,
      participantId: assignment.participantId,
    };
  }
  return { kind: "manual" as const, participantId: null };
}

function remainderIncrements(result: AllocationResult) {
  const increments = new Map<string, bigint>();
  if (result.remainderAssignment.kind === "participant") {
    increments.set(
      result.remainderAssignment.participantId,
      BigInt(result.remainderAssignment.units),
    );
  } else if (result.remainderAssignment.kind === "manual") {
    for (const item of result.remainderAssignment.increments) {
      increments.set(item.participantId, BigInt(item.units));
    }
  }
  return increments;
}

export function prepareAllocationPersistence(input: {
  allocationInput: BillAllocationInput;
  result: AllocationResult;
  participantIds: string[];
}): PreparedAllocationPersistence {
  const { allocationInput, result, participantIds } = input;
  const finalUnits = new Map(
    result.participantObligations.map((item) => [
      item.participantId,
      BigInt(item.units),
    ]),
  );
  const increments = remainderIncrements(result);
  const remainder = remainderIdentity(allocationInput, result, participantIds);

  let weightScale: number | null = null;
  let weightTotalUnits: string | null = null;
  if (allocationInput.strategy === "percentage") {
    weightScale = allocationInput.percentageScale;
    weightTotalUnits = result.metadata.weightTotal ?? null;
  } else if (allocationInput.strategy === "shares") {
    weightTotalUnits = result.metadata.weightTotal ?? null;
  }

  return {
    strategy: allocationInput.strategy,
    weightScale,
    weightTotalUnits,
    remainderUnits: result.remainderUnits,
    remainderKind: remainder.kind,
    remainderParticipantId: remainder.participantId,
    participants: participantIds.map((participantId) => {
      const finalAmount = finalUnits.get(participantId);
      if (finalAmount === undefined) {
        throw new Error("Allocation persistence is missing a participant result.");
      }
      const remainderIncrement = increments.get(participantId) ?? 0n;
      const baseAmount = finalAmount - remainderIncrement;
      if (baseAmount < 0n) {
        throw new Error("Allocation remainder exceeds the final obligation.");
      }
      return {
        participantId,
        inputUnits: participantInputUnits(
          allocationInput,
          participantId,
          finalAmount.toString(),
        ),
        baseAmountUnits: baseAmount.toString(),
        remainderIncrementUnits: remainderIncrement.toString(),
        finalAmountUnits: finalAmount.toString(),
      };
    }),
  };
}
