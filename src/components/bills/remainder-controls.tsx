"use client";

import type { RemainderAssignment } from "@/features/bills/allocation-engine";

export type RemainderParticipant = {
  participantId: string;
  label: string;
  manualUnits: string;
};

export type RemainderMode =
  | ""
  | "creator"
  | "first_participant"
  | "selected_participant"
  | "manual";

export function buildRemainderAssignment(input: {
  mode: RemainderMode;
  selectedParticipantId: string;
  participants: RemainderParticipant[];
}): RemainderAssignment | undefined {
  if (input.mode === "creator") return { kind: "creator" };
  if (input.mode === "first_participant") {
    return { kind: "first_participant" };
  }
  if (
    input.mode === "selected_participant" &&
    input.selectedParticipantId
  ) {
    return {
      kind: "selected_participant",
      participantId: input.selectedParticipantId,
    };
  }
  if (input.mode === "manual") {
    return {
      kind: "manual",
      increments: input.participants.map((participant) => ({
        participantId: participant.participantId,
        units: participant.manualUnits.trim() || "0",
      })),
    };
  }
  return undefined;
}

export function RemainderControls({
  remainderUnits,
  mode,
  selectedParticipantId,
  participants,
  onModeChange,
  onSelectedParticipantChange,
  onManualUnitsChange,
}: {
  remainderUnits: string;
  mode: RemainderMode;
  selectedParticipantId: string;
  participants: RemainderParticipant[];
  onModeChange(mode: RemainderMode): void;
  onSelectedParticipantChange(participantId: string): void;
  onManualUnitsChange(participantId: string, units: string): void;
}) {
  return (
    <fieldset className="mt-6 rounded-xl border border-action/30 bg-action/10 p-5 sm:p-6">
      <legend className="px-2 font-heading text-lg font-semibold text-action">
        Assign the remainder explicitly
      </legend>
      <p className="mt-1 text-sm leading-6 text-foreground">
        The calculation leaves <strong>{remainderUnits}</strong> smallest Asset
        unit{remainderUnits === "1" ? "" : "s"}. Group Pay will not discard or
        assign it silently.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <RemainderChoice
          value="creator"
          checked={mode === "creator"}
          label="Creator pays remainder"
          description="Add all remainder units to the creator share."
          onChange={() => onModeChange("creator")}
        />
        <RemainderChoice
          value="first_participant"
          checked={mode === "first_participant"}
          label="First participant pays remainder"
          description="Add all remainder units to participant 1."
          onChange={() => onModeChange("first_participant")}
        />
        <RemainderChoice
          value="selected_participant"
          checked={mode === "selected_participant"}
          label="Choose one participant"
          description="Add all remainder units to a selected participant."
          onChange={() => onModeChange("selected_participant")}
        />
        <RemainderChoice
          value="manual"
          checked={mode === "manual"}
          label="Distribute manually"
          description="Split only the remainder units across participants."
          onChange={() => onModeChange("manual")}
        />
      </div>

      {mode === "selected_participant" && (
        <label className="mt-5 block">
          <span className="text-sm font-semibold">Remainder participant</span>
          <select
            value={selectedParticipantId}
            onChange={(event) =>
              onSelectedParticipantChange(event.target.value)
            }
            className="mt-2 min-h-12 w-full rounded-md border border-border bg-background px-4 outline-none focus:border-brand focus:ring-3 focus:ring-focus/20"
          >
            <option value="">Select participant</option>
            {participants.map((participant, index) => (
              <option
                key={participant.participantId}
                value={participant.participantId}
              >
                {participant.label || `Participant ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}

      {mode === "manual" && (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-semibold">
            Manual remainder increments must total exactly {remainderUnits}.
          </p>
          {participants.map((participant, index) => (
            <label
              key={participant.participantId}
              className="grid gap-2 rounded-md border border-border bg-background p-4 sm:grid-cols-[1fr_10rem] sm:items-center"
            >
              <span className="text-sm font-semibold">
                {participant.label || `Participant ${index + 1}`}
              </span>
              <input
                aria-label={`Remainder units for ${participant.label || `participant ${index + 1}`}`}
                value={participant.manualUnits}
                onChange={(event) =>
                  onManualUnitsChange(
                    participant.participantId,
                    event.target.value,
                  )
                }
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                className="min-h-11 rounded-md border border-border bg-surface px-3 font-mono outline-none focus:border-brand focus:ring-3 focus:ring-focus/20"
              />
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function RemainderChoice({
  value,
  checked,
  label,
  description,
  onChange,
}: {
  value: string;
  checked: boolean;
  label: string;
  description: string;
  onChange(): void;
}) {
  return (
    <label
      className={`cursor-pointer rounded-lg border p-4 ${
        checked
          ? "border-brand bg-brand-subtle"
          : "border-border bg-background"
      }`}
    >
      <input
        type="radio"
        name="remainderMode"
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="font-semibold">{label}</span>
      <span className="mt-1 block text-sm leading-6 text-muted">
        {description}
      </span>
    </label>
  );
}
