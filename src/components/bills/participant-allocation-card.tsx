"use client";

import { ChevronDown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { publicEnv } from "@/config/public-env";
import type { AllocationFormStrategy } from "@/features/bills/allocation-form";
import { useLocalization } from "@/features/localization/provider";
import { unitsToDecimal } from "@/features/money/money";

import type { ParticipantDraft } from "./bill-form-model";
import { BillFormField } from "./bill-form-controls";
import { XrplAddressField } from "./xrpl-address-field";

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
        : null
      : calculatedUnits
        ? `${unitsToDecimal(calculatedUnits, assetScale)} ${assetSymbol}`
        : null;

  return (
    <details
      open={number === 1 ? true : undefined}
      className="group min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-background open:border-brand/50"
    >
      <summary className="flex min-w-0 cursor-pointer list-none items-center gap-2 px-3 py-4 sm:gap-3 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-bold text-brand sm:size-8 sm:text-sm">
          {number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-heading text-sm font-semibold sm:text-base">
            {title}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[11px] text-muted sm:text-xs">
            {item.expectedPayerAddress.trim() || t("bill.participant.payer")}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-right">
          {amount && (
            <span className="hidden text-sm font-semibold text-brand min-[360px]:block">
              {amount}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
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
          <XrplAddressField
            label={t("bill.participant.payer")}
            value={item.expectedPayerAddress}
            displayLabel={item.label}
            role="payer"
            network={publicEnv.NEXT_PUBLIC_APP_NETWORK}
            onChangeAddress={(value) => onChange("expectedPayerAddress", value)}
            onChangeDisplayLabel={(value) => onChange("label", value)}
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
