"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";

import type { AllocationFormStrategy } from "@/features/bills/allocation-form";
import { formatAllocationUnits } from "@/features/bills/allocation-preview";

export type CustomAllocationStatus = {
  status: "incomplete" | "under" | "exact" | "over";
  differenceUnits: bigint | null;
  scale: number;
};

export type StrategyAllocationStatus = {
  status: "incomplete" | "exact" | "needs_remainder" | "invalid";
  message: string;
};

export function AllocationStatus({
  strategy,
  customAllocation,
  strategyPreview,
  assetSymbol,
}: {
  strategy: AllocationFormStrategy;
  customAllocation: CustomAllocationStatus;
  strategyPreview: StrategyAllocationStatus;
  assetSymbol: string;
}) {
  if (strategy !== "custom") {
    const exact = strategyPreview.status === "exact";
    return (
      <StatusBox
        exact={exact}
        warning={strategyPreview.status === "needs_remainder"}
        title={
          exact
            ? "Allocation exact"
            : strategyPreview.status === "needs_remainder"
              ? "Remainder rule required"
              : "Allocation incomplete"
        }
        message={strategyPreview.message}
      />
    );
  }

  const exact = customAllocation.status === "exact";
  let message = "Enter the total, creator share, and every participant amount.";
  if (
    customAllocation.status === "under" &&
    customAllocation.differenceUnits !== null
  ) {
    message = `${formatAllocationUnits(customAllocation.differenceUnits, customAllocation.scale)} ${assetSymbol} remains to allocate.`;
  }
  if (
    customAllocation.status === "over" &&
    customAllocation.differenceUnits !== null
  ) {
    message = `${formatAllocationUnits(-customAllocation.differenceUnits, customAllocation.scale)} ${assetSymbol} is allocated above the bill total.`;
  }
  if (exact) {
    message = `Creator share and participant amounts match the ${assetSymbol} total.`;
  }

  return (
    <StatusBox
      exact={exact}
      warning={false}
      title={exact ? "Allocation exact" : "Allocation incomplete"}
      message={message}
    />
  );
}

function StatusBox({
  exact,
  warning,
  title,
  message,
}: {
  exact: boolean;
  warning: boolean;
  title: string;
  message: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-6 flex items-start gap-3 rounded-lg border p-4 ${
        exact
          ? "border-success/25 bg-success/10 text-success"
          : warning
            ? "border-action/25 bg-action/10 text-action"
            : "border-border bg-background text-muted"
      }`}
    >
      {exact ? (
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      ) : (
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      )}
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6">{message}</p>
      </div>
    </div>
  );
}
