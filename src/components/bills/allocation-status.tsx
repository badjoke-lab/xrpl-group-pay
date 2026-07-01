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

const REMAINDER_INSTRUCTION = {
  en: "Choose exactly who receives the remaining smallest Asset units.",
  ja: "残った最小資産単位を誰に割り当てるか明示してください。",
  ko: "남은 최소 자산 단위를 누구에게 배정할지 명확히 선택하세요.",
} as const;

const STRATEGY_INCOMPLETE = {
  equal: {
    en: "Enter the bill total to calculate each participant share.",
    ja: "請求合計を入力すると、参加者ごとの負担額が計算されます。",
    ko: "청구 총액을 입력하면 참가자별 부담액이 계산됩니다.",
  },
  percentage: {
    en: "Enter the bill total and percentages that add up to 100%.",
    ja: "請求合計と、合計100%になる参加者ごとの割合を入力してください。",
    ko: "청구 총액과 합계가 100%인 참가자별 비율을 입력하세요.",
  },
  shares: {
    en: "Enter the bill total and a positive share for every participant.",
    ja: "請求合計と、各参加者の正の比率を入力してください。",
    ko: "청구 총액과 각 참가자의 양수 비율을 입력하세요.",
  },
} as const;

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
  const { locale, t } = useLocalization();

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
              ? REMAINDER_INSTRUCTION[locale]
              : STRATEGY_INCOMPLETE[strategy][locale]
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
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 break-words text-sm leading-6">{message}</p>
      </div>
    </div>
  );
}
