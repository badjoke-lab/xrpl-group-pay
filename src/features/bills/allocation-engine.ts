import { moneyScaleSchema, moneyUnitsSchema } from "@/features/money/types";

export type AllocationStrategy =
  | "equal"
  | "percentage"
  | "shares"
  | "custom";

export type ParticipantUnits = {
  participantId: string;
  units: string;
};

export type RemainderAssignment =
  | { kind: "creator" }
  | { kind: "first_participant" }
  | { kind: "selected_participant"; participantId: string }
  | { kind: "manual"; increments: ParticipantUnits[] };

export type AppliedRemainderAssignment =
  | { kind: "none" }
  | { kind: "creator"; units: string }
  | { kind: "participant"; participantId: string; units: string }
  | { kind: "manual"; increments: ParticipantUnits[] };

type AllocationBase = {
  totalUnits: string;
  creatorShareUnits: string;
  participantIds: string[];
};

export type EqualAllocationInput = AllocationBase & {
  strategy: "equal";
  remainderAssignment?: RemainderAssignment;
};

export type PercentageAllocationInput = AllocationBase & {
  strategy: "percentage";
  percentageScale: number;
  percentages: ParticipantUnits[];
  remainderAssignment?: RemainderAssignment;
};

export type SharesAllocationInput = AllocationBase & {
  strategy: "shares";
  shares: ParticipantUnits[];
  remainderAssignment?: RemainderAssignment;
};

export type CustomAllocationInput = AllocationBase & {
  strategy: "custom";
  participantUnits: ParticipantUnits[];
};

export type AllocationInput =
  | EqualAllocationInput
  | PercentageAllocationInput
  | SharesAllocationInput
  | CustomAllocationInput;

export type AllocationResult = {
  strategy: AllocationStrategy;
  totalUnits: string;
  creatorShareUnits: string;
  distributableUnits: string;
  participantObligations: ParticipantUnits[];
  remainderUnits: string;
  remainderAssignment: AppliedRemainderAssignment;
  metadata: {
    participantCount: number;
    percentageScale?: number;
    weightTotal?: string;
  };
};

export class AllocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AllocationError";
  }
}

function requireUnits(value: string, label: string, allowZero: boolean) {
  const parsed = moneyUnitsSchema.safeParse(value);
  if (!parsed.success || (!allowZero && parsed.data === "0")) {
    throw new AllocationError(
      `${label} must be a canonical ${allowZero ? "non-negative" : "positive"} integer unit string.`,
    );
  }
  return BigInt(parsed.data);
}

function requireParticipantIds(participantIds: string[]) {
  if (participantIds.length === 0) {
    throw new AllocationError("At least one participant is required.");
  }

  const seen = new Set<string>();
  for (const participantId of participantIds) {
    if (
      participantId.length === 0 ||
      participantId !== participantId.trim()
    ) {
      throw new AllocationError("Participant IDs must be non-empty and canonical.");
    }
    if (seen.has(participantId)) {
      throw new AllocationError("Participant IDs must be unique.");
    }
    seen.add(participantId);
  }

  return participantIds;
}

function requireBase(input: AllocationBase) {
  const participantIds = requireParticipantIds(input.participantIds);
  const totalUnits = requireUnits(input.totalUnits, "Bill total", false);
  const creatorShareUnits = requireUnits(
    input.creatorShareUnits,
    "Creator share",
    true,
  );

  if (creatorShareUnits >= totalUnits) {
    throw new AllocationError(
      "Creator share must leave a positive amount for participants.",
    );
  }

  return {
    participantIds,
    totalUnits,
    creatorShareUnits,
    distributableUnits: totalUnits - creatorShareUnits,
  };
}

function requireParticipantValues(
  participantIds: string[],
  values: ParticipantUnits[],
  label: string,
  allowZero: boolean,
) {
  if (values.length !== participantIds.length) {
    throw new AllocationError(`${label} must cover every participant exactly once.`);
  }

  const expected = new Set(participantIds);
  const result = new Map<string, bigint>();
  for (const item of values) {
    if (!expected.has(item.participantId)) {
      throw new AllocationError(`${label} contains an unknown participant.`);
    }
    if (result.has(item.participantId)) {
      throw new AllocationError(`${label} contains a duplicate participant.`);
    }
    result.set(
      item.participantId,
      requireUnits(item.units, `${label} value`, allowZero),
    );
  }

  for (const participantId of participantIds) {
    if (!result.has(participantId)) {
      throw new AllocationError(`${label} must cover every participant exactly once.`);
    }
  }

  return result;
}

function sum(values: Iterable<bigint>) {
  let total = 0n;
  for (const value of values) total += value;
  return total;
}

function applyRemainder(input: {
  participantIds: string[];
  floorUnits: Map<string, bigint>;
  creatorShareUnits: bigint;
  remainderUnits: bigint;
  assignment?: RemainderAssignment;
}) {
  const participantUnits = new Map(input.floorUnits);
  let creatorShareUnits = input.creatorShareUnits;

  if (input.remainderUnits === 0n) {
    return {
      creatorShareUnits,
      participantUnits,
      applied: { kind: "none" } as AppliedRemainderAssignment,
    };
  }

  if (!input.assignment) {
    throw new AllocationError(
      "A remainder assignment is required when allocation leaves integer units undistributed.",
    );
  }

  if (input.assignment.kind === "creator") {
    creatorShareUnits += input.remainderUnits;
    return {
      creatorShareUnits,
      participantUnits,
      applied: {
        kind: "creator",
        units: input.remainderUnits.toString(),
      } as AppliedRemainderAssignment,
    };
  }

  if (input.assignment.kind === "first_participant") {
    const participantId = input.participantIds[0];
    participantUnits.set(
      participantId,
      (participantUnits.get(participantId) ?? 0n) + input.remainderUnits,
    );
    return {
      creatorShareUnits,
      participantUnits,
      applied: {
        kind: "participant",
        participantId,
        units: input.remainderUnits.toString(),
      } as AppliedRemainderAssignment,
    };
  }

  if (input.assignment.kind === "selected_participant") {
    if (!participantUnits.has(input.assignment.participantId)) {
      throw new AllocationError(
        "The selected remainder participant is not part of this allocation.",
      );
    }
    participantUnits.set(
      input.assignment.participantId,
      (participantUnits.get(input.assignment.participantId) ?? 0n) +
        input.remainderUnits,
    );
    return {
      creatorShareUnits,
      participantUnits,
      applied: {
        kind: "participant",
        participantId: input.assignment.participantId,
        units: input.remainderUnits.toString(),
      } as AppliedRemainderAssignment,
    };
  }

  const increments = requireParticipantValues(
    input.participantIds,
    input.assignment.increments,
    "Manual remainder increments",
    true,
  );
  if (sum(increments.values()) !== input.remainderUnits) {
    throw new AllocationError(
      "Manual remainder increments must equal the computed remainder exactly.",
    );
  }

  for (const participantId of input.participantIds) {
    participantUnits.set(
      participantId,
      (participantUnits.get(participantId) ?? 0n) +
        (increments.get(participantId) ?? 0n),
    );
  }

  return {
    creatorShareUnits,
    participantUnits,
    applied: {
      kind: "manual",
      increments: input.participantIds.map((participantId) => ({
        participantId,
        units: (increments.get(participantId) ?? 0n).toString(),
      })),
    } as AppliedRemainderAssignment,
  };
}

function finalize(input: {
  strategy: AllocationStrategy;
  participantIds: string[];
  totalUnits: bigint;
  originalCreatorShareUnits: bigint;
  distributableUnits: bigint;
  floorUnits: Map<string, bigint>;
  remainderUnits: bigint;
  assignment?: RemainderAssignment;
  metadata?: AllocationResult["metadata"];
}): AllocationResult {
  const applied = applyRemainder({
    participantIds: input.participantIds,
    floorUnits: input.floorUnits,
    creatorShareUnits: input.originalCreatorShareUnits,
    remainderUnits: input.remainderUnits,
    assignment: input.assignment,
  });

  const participantObligations = input.participantIds.map((participantId) => {
    const units = applied.participantUnits.get(participantId) ?? 0n;
    if (units <= 0n) {
      throw new AllocationError(
        "Every participant must receive a positive final obligation.",
      );
    }
    return { participantId, units: units.toString() };
  });

  const finalTotal =
    applied.creatorShareUnits +
    sum(participantObligations.map((item) => BigInt(item.units)));
  if (finalTotal !== input.totalUnits) {
    throw new AllocationError("The final allocation does not equal the Bill total.");
  }

  return {
    strategy: input.strategy,
    totalUnits: input.totalUnits.toString(),
    creatorShareUnits: applied.creatorShareUnits.toString(),
    distributableUnits: input.distributableUnits.toString(),
    participantObligations,
    remainderUnits: input.remainderUnits.toString(),
    remainderAssignment: applied.applied,
    metadata: input.metadata ?? {
      participantCount: input.participantIds.length,
    },
  };
}

function allocateWeighted(input: {
  strategy: "percentage" | "shares";
  base: ReturnType<typeof requireBase>;
  weights: Map<string, bigint>;
  denominator: bigint;
  assignment?: RemainderAssignment;
  metadata: AllocationResult["metadata"];
}) {
  const floorUnits = new Map<string, bigint>();
  for (const participantId of input.base.participantIds) {
    const weight = input.weights.get(participantId) ?? 0n;
    floorUnits.set(
      participantId,
      (input.base.distributableUnits * weight) / input.denominator,
    );
  }
  const remainderUnits =
    input.base.distributableUnits - sum(floorUnits.values());

  return finalize({
    strategy: input.strategy,
    participantIds: input.base.participantIds,
    totalUnits: input.base.totalUnits,
    originalCreatorShareUnits: input.base.creatorShareUnits,
    distributableUnits: input.base.distributableUnits,
    floorUnits,
    remainderUnits,
    assignment: input.assignment,
    metadata: input.metadata,
  });
}

export function allocateBill(input: AllocationInput): AllocationResult {
  const base = requireBase(input);

  if (input.strategy === "custom") {
    const participantUnits = requireParticipantValues(
      base.participantIds,
      input.participantUnits,
      "Custom allocation",
      false,
    );
    if (
      base.creatorShareUnits + sum(participantUnits.values()) !==
      base.totalUnits
    ) {
      throw new AllocationError(
        "Creator share and custom participant amounts must equal the Bill total.",
      );
    }

    return finalize({
      strategy: "custom",
      participantIds: base.participantIds,
      totalUnits: base.totalUnits,
      originalCreatorShareUnits: base.creatorShareUnits,
      distributableUnits: base.distributableUnits,
      floorUnits: participantUnits,
      remainderUnits: 0n,
      metadata: { participantCount: base.participantIds.length },
    });
  }

  if (input.strategy === "equal") {
    const participantCount = BigInt(base.participantIds.length);
    const each = base.distributableUnits / participantCount;
    const floorUnits = new Map(
      base.participantIds.map((participantId) => [participantId, each]),
    );

    return finalize({
      strategy: "equal",
      participantIds: base.participantIds,
      totalUnits: base.totalUnits,
      originalCreatorShareUnits: base.creatorShareUnits,
      distributableUnits: base.distributableUnits,
      floorUnits,
      remainderUnits: base.distributableUnits % participantCount,
      assignment: input.remainderAssignment,
      metadata: { participantCount: base.participantIds.length },
    });
  }

  if (input.strategy === "shares") {
    const shares = requireParticipantValues(
      base.participantIds,
      input.shares,
      "Share allocation",
      false,
    );
    const weightTotal = sum(shares.values());
    return allocateWeighted({
      strategy: "shares",
      base,
      weights: shares,
      denominator: weightTotal,
      assignment: input.remainderAssignment,
      metadata: {
        participantCount: base.participantIds.length,
        weightTotal: weightTotal.toString(),
      },
    });
  }

  const percentageScale = moneyScaleSchema.safeParse(input.percentageScale);
  if (!percentageScale.success) {
    throw new AllocationError("Percentage scale is outside the supported range.");
  }
  const percentages = requireParticipantValues(
    base.participantIds,
    input.percentages,
    "Percentage allocation",
    false,
  );
  const denominator = 100n * 10n ** BigInt(percentageScale.data);
  if (sum(percentages.values()) !== denominator) {
    throw new AllocationError("Participant percentages must total exactly 100%.");
  }

  return allocateWeighted({
    strategy: "percentage",
    base,
    weights: percentages,
    denominator,
    assignment: input.remainderAssignment,
    metadata: {
      participantCount: base.participantIds.length,
      percentageScale: percentageScale.data,
      weightTotal: denominator.toString(),
    },
  });
}
