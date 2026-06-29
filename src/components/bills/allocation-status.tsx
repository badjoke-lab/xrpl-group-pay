"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";

import type { AllocationFormStrategy } from "@/features/bills/allocation-form";
import { formatAllocationUnits } from "@/features/bills/allocation-preview";
import { useLocalization } from "@/features/localization/provider";

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
  const { t } = useLocalization();

  if (strategy !== "custom") {
    const exact = strategyPreview.status === "exact";
    const needsRemainder = strategyPreview.status === "needs_remainder";
    return (
      <StatusBox
        exact={exact}
        warning={needsRemainder}
        title={
          exact
            ? t("bill.status.exact")
            : needsRemainder
              ? t("bill.status.remainder")
              : t("bill.status.incomplete")
        }
        message={
          exact
            ? t("bill.status.matches", { asset: assetSymbol })
            : needsRemainder
              ? t("bill.status.remainder")
              : t("bill.status.enterAll")
        }
      />
    );
  }

  const exact = customAllocation.status === "exact";
  let message = t("bill.status.enterAll");
  if (
    customAllocation.status === "under" &&
    customAllocation.differenceUnits !== null
  ) {
    message = t("bill.status.remaining", {
      amount: formatAllocationUnits(
        customAllocation.differenceUnits,
        customAllocation.scale,
      ),
      asset: assetSymbol,
    });
  }
  if (
    customAllocation.status === "over" &&
    customAllocation.differenceUnits !== null
  ) {
    message = t("bill.status.over", {
      amount: formatAllocationUnits(
        -customAllocation.differenceUnits,
        customAllocation.scale,
      ),
      asset: assetSymbol,
    });
  }
  if (exact) {
    message = t("bill.status.matches", { asset: assetSymbol });
  }

  return (
    <StatusBox
      exact={exact}
      warning={false}
      title={exact ? t("bill.status.exact") : t("bill.status.incomplete")}
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
