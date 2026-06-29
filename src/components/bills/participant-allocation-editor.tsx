"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AllocationFormStrategy } from "@/features/bills/allocation-form";
import { useLocalization } from "@/features/localization/provider";
import { unitsToDecimal } from "@/features/money/money";

import { type ParticipantDraft, newParticipant } from "./bill-form-model";
import { BillFormField } from "./bill-form-controls";

export function ParticipantAllocationEditor({
  strategy,
  participants,
  assetSymbol,
  assetScale,
  calculatedUnits,
  onChange,
  onAdd,
  onRemove,
}: {
  strategy: AllocationFormStrategy;
  participants: ParticipantDraft[];
  assetSymbol: string;
  assetScale: number;
  calculatedUnits: Record<string, string>;
  onChange(
    participantId: string,
    field: keyof Omit<ParticipantDraft, "id">,
    value: string,
  ): void;
  onAdd(participant: ParticipantDraft): void;
  onRemove(participantId: string): void;
}) {
  const { t } = useLocalization();

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-heading text-xl font-semibold">
            {t("bill.participants.title")}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {t("bill.participants.minimum")}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onAdd(newParticipant())}
          disabled={participants.length >= 50}
        >
          <Plus aria-hidden="true" className="size-4" />
          {t("bill.participants.add")}
        </Button>
      </div>

      <div className="mt-5 space-y-4">
        {participants.map((item, index) => {
          const number = index + 1;
          return (
            <fieldset
              key={item.id}
              className="rounded-lg border border-border bg-background p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <legend className="font-heading font-semibold">
                  {t("bill.participant.number", { number })}
                </legend>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={t("bill.participant.remove", { number })}
                  onClick={() => onRemove(item.id)}
                  disabled={participants.length <= 2}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <BillFormField
                  label={t("bill.participant.label")}
                  value={item.label}
                  onChange={(value) => onChange(item.id, "label", value)}
                  placeholder="Alex"
                />
                <BillFormField
                  label={t("bill.participant.payer")}
                  value={item.expectedPayerAddress}
                  onChange={(value) =>
                    onChange(item.id, "expectedPayerAddress", value)
                  }
                  placeholder="r..."
                  required
                  mono
                />

                {strategy === "custom" && (
                  <BillFormField
                    label={t("bill.participant.amount")}
                    value={item.amount}
                    onChange={(value) => onChange(item.id, "amount", value)}
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
                    onChange={(value) => onChange(item.id, "percentage", value)}
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
                    onChange={(value) => onChange(item.id, "shares", value)}
                    placeholder="1"
                    required
                    inputMode="numeric"
                  />
                )}

                {strategy !== "custom" && calculatedUnits[item.id] && (
                  <div className="rounded-md border border-border bg-surface p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      {t("bill.participant.calculated")}
                    </p>
                    <p className="mt-2 font-heading text-lg font-semibold text-brand">
                      {unitsToDecimal(calculatedUnits[item.id], assetScale)}{" "}
                      {assetSymbol}
                    </p>
                  </div>
                )}
              </div>
            </fieldset>
          );
        })}
      </div>
    </section>
  );
}
