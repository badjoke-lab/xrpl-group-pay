export type AllocationViewSummary = {
  strategy: "custom" | "equal" | "percentage" | "shares";
  strategyLabel: string;
  remainderUnits: string;
  remainderAssignmentLabel: string;
};
