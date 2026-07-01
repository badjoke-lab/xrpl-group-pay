"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AllocationFormStrategy } from "@/features/bills/allocation-form";
import { useLocalization } from "@/features/localization/provider";

import { type ParticipantDraft, newParticipant } from "./bill-form-model";
import { ParticipantAllocationCard } from "./participant-allocation-card";

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
    <section className="mt-10 min-w-0">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
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
          className="w-full sm:w-auto"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t("bill.participants.add")}
        </Button>
      </div>

      <div className="mt-5 min-w-0 space-y-3">
        {participants.map((item, index) => (
          <ParticipantAllocationCard
            key={item.id}
            item={item}
            number={index + 1}
            strategy={strategy}
            assetSymbol={assetSymbol}
            assetScale={assetScale}
            calculatedUnits={calculatedUnits[item.id]}
            removable={participants.length > 2}
            onChange={(field, value) => onChange(item.id, field, value)}
            onRemove={() => onRemove(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
