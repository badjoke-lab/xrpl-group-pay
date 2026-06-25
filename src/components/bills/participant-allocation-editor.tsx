"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AllocationFormStrategy } from "@/features/bills/allocation-form";
import { unitsToDecimal } from "@/features/money/money";

import {
  type ParticipantDraft,
  newParticipant,
} from "./bill-form-model";
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
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-heading text-xl font-semibold">Participants</h3>
          <p className="mt-1 text-sm text-muted">
            At least two payment slots are required.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onAdd(newParticipant())}
          disabled={participants.length >= 50}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add participant
        </Button>
      </div>

      <div className="mt-5 space-y-4">
        {participants.map((item, index) => (
          <fieldset
            key={item.id}
            className="rounded-lg border border-border bg-background p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <legend className="font-heading font-semibold">
                Participant {index + 1}
              </legend>
              <Button
                type="button"
                variant="secondary"
                aria-label={`Remove participant ${index + 1}`}
                onClick={() => onRemove(item.id)}
                disabled={participants.length <= 2}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <BillFormField
                label="Label"
                value={item.label}
                onChange={(value) => onChange(item.id, "label", value)}
                placeholder="Alex"
              />
              <BillFormField
                label="Expected payer address"
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
                  label="Assigned amount"
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
                  label="Percentage"
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
                  label="Shares"
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
                    Calculated obligation
                  </p>
                  <p className="mt-2 font-heading text-lg font-semibold text-brand">
                    {unitsToDecimal(calculatedUnits[item.id], assetScale)}{" "}
                    {assetSymbol}
                  </p>
                </div>
              )}
            </div>
          </fieldset>
        ))}
      </div>
    </section>
  );
}
