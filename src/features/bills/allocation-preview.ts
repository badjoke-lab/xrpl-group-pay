import { decimalToUnits, MoneyAmountError, unitsToDecimal } from "@/features/money/money";

export type AssetAllocationPreview = {
  status: "incomplete" | "under" | "exact" | "over";
  totalUnits: bigint | null;
  allocatedUnits: bigint | null;
  differenceUnits: bigint | null;
  scale: number;
};

function parseDecimalUnits(value: string, scale: number, allowZero: boolean) {
  try {
    const units = BigInt(decimalToUnits(value, scale));
    if (!allowZero && units === 0n) return null;
    return units;
  } catch (error) {
    if (error instanceof MoneyAmountError) return null;
    throw error;
  }
}

export function calculateAssetAllocationPreview(input: {
  totalAmount: string;
  creatorShareAmount: string;
  participantAmounts: string[];
  scale: number;
}): AssetAllocationPreview {
  const totalUnits = parseDecimalUnits(input.totalAmount, input.scale, false);
  const creatorShareUnits = parseDecimalUnits(
    input.creatorShareAmount,
    input.scale,
    true,
  );
  const participantUnits = input.participantAmounts.map((value) =>
    parseDecimalUnits(value, input.scale, false),
  );

  if (
    totalUnits === null ||
    creatorShareUnits === null ||
    participantUnits.some((value) => value === null)
  ) {
    return {
      status: "incomplete",
      totalUnits,
      allocatedUnits: null,
      differenceUnits: null,
      scale: input.scale,
    };
  }

  const completeParticipantUnits = participantUnits as bigint[];
  const allocatedUnits = completeParticipantUnits.reduce(
    (sum, value) => sum + value,
    creatorShareUnits,
  );
  const differenceUnits = totalUnits - allocatedUnits;

  return {
    status:
      differenceUnits === 0n
        ? "exact"
        : differenceUnits > 0n
          ? "under"
          : "over",
    totalUnits,
    allocatedUnits,
    differenceUnits,
    scale: input.scale,
  };
}

export function formatAllocationUnits(units: bigint, scale: number) {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const formatted = unitsToDecimal(absolute.toString(), scale);
  return `${negative ? "-" : ""}${formatted}`;
}

export type AllocationPreview = {
  status: "incomplete" | "under" | "exact" | "over";
  totalDrops: bigint | null;
  allocatedDrops: bigint | null;
  differenceDrops: bigint | null;
};

export function calculateAllocationPreview(input: {
  totalXrp: string;
  creatorShareXrp: string;
  participantAmountsXrp: string[];
}): AllocationPreview {
  const preview = calculateAssetAllocationPreview({
    totalAmount: input.totalXrp,
    creatorShareAmount: input.creatorShareXrp,
    participantAmounts: input.participantAmountsXrp,
    scale: 6,
  });

  return {
    status: preview.status,
    totalDrops: preview.totalUnits,
    allocatedDrops: preview.allocatedUnits,
    differenceDrops: preview.differenceUnits,
  };
}

export function formatDropsAsXrp(drops: bigint) {
  return formatAllocationUnits(drops, 6);
}
