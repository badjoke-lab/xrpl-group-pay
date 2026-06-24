export type AllocationPreview = {
  status: "incomplete" | "under" | "exact" | "over";
  totalDrops: bigint | null;
  allocatedDrops: bigint | null;
  differenceDrops: bigint | null;
};

function parseXrpToDrops(value: string, allowZero: boolean) {
  const trimmed = value.trim();
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(trimmed);
  if (!match) return null;

  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(6, "0"));
  const drops = whole * 1_000_000n + fraction;
  if (drops < 0n || (!allowZero && drops === 0n)) return null;
  return drops;
}

export function calculateAllocationPreview(input: {
  totalXrp: string;
  creatorShareXrp: string;
  participantAmountsXrp: string[];
}): AllocationPreview {
  const totalDrops = parseXrpToDrops(input.totalXrp, false);
  const creatorShareDrops = parseXrpToDrops(input.creatorShareXrp, true);
  const participantDrops = input.participantAmountsXrp.map((value) =>
    parseXrpToDrops(value, false),
  );

  if (
    totalDrops === null ||
    creatorShareDrops === null ||
    participantDrops.some((value) => value === null)
  ) {
    return {
      status: "incomplete",
      totalDrops,
      allocatedDrops: null,
      differenceDrops: null,
    };
  }

  const allocatedDrops = participantDrops.reduce(
    (sum, value) => sum + (value ?? 0n),
    creatorShareDrops,
  );
  const differenceDrops = totalDrops - allocatedDrops;

  return {
    status:
      differenceDrops === 0n
        ? "exact"
        : differenceDrops > 0n
          ? "under"
          : "over",
    totalDrops,
    allocatedDrops,
    differenceDrops,
  };
}

export function formatDropsAsXrp(drops: bigint) {
  const negative = drops < 0n;
  const absolute = negative ? -drops : drops;
  const whole = absolute / 1_000_000n;
  const fraction = (absolute % 1_000_000n)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}
