"use client";

import { ChevronDown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AllocationFormStrategy } from "@/features/bills/allocation-form";
import { useLocalization } from "@/features/localization/provider";
import { unitsToDecimal } from "@/features/money/money";

import type { ParticipantDraft } from "./bill-form-model";
import { BillFormField } from "./bill-form-controls";

export function ParticipantAllocationCard({
  item,
  number,
  strategy,
  assetSymbol,
  assetScale,
  calculatedUnits,
  removable,
  onChange,
  onRemove,
}: {
  item: ParticipantDraft;
  number: number;
  strategy: AllocationFormStrategy;
  assetSymbol: string;
  assetScale: number;
  calculatedUnits?: string;
  removable: boolean;
  onChange(
    field: keyof Omit<ParticipantDraft, "id">,
    value: string,
  ): void;
  onRemove(): void;
}) {
  const { t } = useLocalization();
  const title = item.label.trim() || t("bill.participant.number", { number });
  const amount =
    strategy === "custom"
      ? item.amount.trim()
        ? `${item.amount} ${assetSymbol}`
        : "—"
      : calculatedUnits
        ? `${unitsToDecimal(calculatedUnits, assetScale)} ${assetSymbol}`
        : "—";

  return (
    <details
      open={number === 1 ? true : undefined}
      className="group min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-background open:border-brand/50"
    >
      <summary className="flex min-w-0 cursor-pointer list-none items-center gap-3 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-sm font-bold text-brand">
          {number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-heading font-semibold">{title}</span>
          <span className="mt-0.5 block truncate font-mono text-xs text-muted">
            {item.expectedPayerAddress.trim() || t("bill.participant.payer")}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-sm font-semibold text-brand">{amount}</span>
          <ChevronDown
            aria-hidden="true"
            className="ml-auto mt-1 size-4 text-muted transition-transform group-open:rotate-180"
          />
        </span>
      </summary>

      <div className="border-t border-border px-4 pb-5 pt-4 sm:px-5">
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <BillFormField
            label={t("bill.participant.label")}
            value={item.label}
            onChange={(value) => onChange("label", value)}
            placeholder="Alex"
          />
          <BillFormField
            label={t("bill.participant.payer")}
            value={item.expectedPayerAddress}
            onChange={(value) => onChange("expectedPayerAddress", value)}
            placeholder="r..."
            required
            mono
          />

          {strategy === "custom" && (
            <BillFormField
              label={t("bill.participant.amount")}
              value={item.amount}
              onChange={(value) => onChange("amount", value)}
              placeholder="4"
              required
              suffix={assetSymbol}
              inputMode="decimal"
            />
          )}

          {strategy === "percentage" && (
            <BillFormField
              label={t("bill.participant.percentage")}
              value={item.percentage}
              onChange={(value) => onChange("percentage", value)}
              placeholder="50"
              required
              suffix="%"
              inputMode="decimal"
            />
          )}

          {strategy === "shares" && (
            <BillFormField
              label={t("bill.participant.shares")}
              value={item.shares}
              onChange={(value) => onChange("shares", value)}
              placeholder="1"
              required
              inputMode="numeric"
            />
          )}

          {strategy !== "custom" && calculatedUnits && (
            <div className="min-w-0 rounded-md border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {t("bill.participant.calculated")}
              </p>
              <p className="mt-2 break-words font-heading text-lg font-semibold text-brand">
                {unitsToDecimal(calculatedUnits, assetScale)} {assetSymbol}
              </p>
            </div>
          )}
        </div>

        {removable && (
          <Button
            type="button"
            variant="secondary"
            onClick={onRemove}
            className="mt-4 w-full text-danger sm:w-auto"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {t("bill.participant.remove", { number })}
          </Button>
        )}
      </div>
    </details>
  );
}
