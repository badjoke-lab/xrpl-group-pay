"use client";

import { useState } from "react";
import { LoaderCircle, Plus, Trash2, Users } from "lucide-react";

import { CreatedBillShare } from "@/components/bills/created-bill-share";
import { Button } from "@/components/ui/button";
import type { CreatedBill } from "@/features/bills/types";

type ParticipantDraft = {
  id: string;
  label: string;
  expectedPayerAddress: string;
  amountXrp: string;
};

function participant(): ParticipantDraft {
  return {
    id: crypto.randomUUID(),
    label: "",
    expectedPayerAddress: "",
    amountXrp: "",
  };
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      body?.error?.message ?? "The shared bill could not be created.",
    );
  }
  return body;
}

export function TestnetBillForm() {
  const [participants, setParticipants] = useState<ParticipantDraft[]>([
    participant(),
    participant(),
  ]);
  const [created, setCreated] = useState<CreatedBill | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateParticipant(
    id: string,
    field: keyof Omit<ParticipantDraft, "id">,
    value: string,
  ) {
    setParticipants((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }

  function removeParticipant(id: string) {
    setParticipants((current) =>
      current.length <= 2
        ? current
        : current.filter((item) => item.id !== id),
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const destinationTag = String(form.get("destinationTag") ?? "").trim();
    const input = {
      title: String(form.get("title") ?? ""),
      destinationAddress: String(form.get("destinationAddress") ?? ""),
      ...(destinationTag ? { destinationTag } : {}),
      totalXrp: String(form.get("totalXrp") ?? ""),
      creatorShareXrp: String(form.get("creatorShareXrp") ?? ""),
      participants: participants.map(
        ({ label, expectedPayerAddress, amountXrp }) => ({
          ...(label.trim() ? { label } : {}),
          expectedPayerAddress,
          amountXrp,
        }),
      ),
    };

    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
      });
      setCreated((await readJson(response)) as CreatedBill);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The shared bill could not be created.",
      );
    } finally {
      setCreating(false);
    }
  }

  if (created) {
    return (
      <CreatedBillShare created={created} onReset={() => setCreated(null)} />
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-subtle">
          <Users aria-hidden="true" className="size-6 text-brand" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
            Shared bill
          </p>
          <h2 className="mt-2 font-heading text-3xl font-semibold">
            Assign each participant an XRP share
          </h2>
          <p className="mt-2 leading-7 text-muted">
            The creator share and participant amounts must equal the total
            exactly.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field
          label="Bill title"
          name="title"
          placeholder="XRPL Meetup Dinner"
          required
        />
        <Field
          label="Creator destination address"
          name="destinationAddress"
          placeholder="r..."
          required
          mono
        />
        <Field
          label="Total"
          name="totalXrp"
          placeholder="10"
          required
          suffix="XRP"
          inputMode="decimal"
        />
        <Field
          label="Creator share"
          name="creatorShareXrp"
          placeholder="2"
          required
          suffix="XRP"
          inputMode="decimal"
        />
        <Field
          label="Destination Tag"
          name="destinationTag"
          placeholder="Optional"
          inputMode="numeric"
        />
      </div>

      <div className="mt-10 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-heading text-xl font-semibold">Participants</h3>
          <p className="mt-1 text-sm text-muted">
            At least two payment slots are required.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setParticipants((current) => [...current, participant()])
          }
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
                onClick={() => removeParticipant(item.id)}
                disabled={participants.length <= 2}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ParticipantField
                label="Label"
                value={item.label}
                onChange={(value) =>
                  updateParticipant(item.id, "label", value)
                }
                placeholder="Alex"
              />
              <ParticipantField
                label="Expected payer address"
                value={item.expectedPayerAddress}
                onChange={(value) =>
                  updateParticipant(item.id, "expectedPayerAddress", value)
                }
                placeholder="r..."
                required
                mono
              />
              <ParticipantField
                label="Assigned amount"
                value={item.amountXrp}
                onChange={(value) =>
                  updateParticipant(item.id, "amountXrp", value)
                }
                placeholder="4"
                required
                suffix="XRP"
                inputMode="decimal"
              />
            </div>
          </fieldset>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <Button type="submit" className="mt-7 w-full" disabled={creating}>
        {creating ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Freezing bill and payment slots
          </>
        ) : (
          "Create participant payment links"
        )}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  required = false,
  mono = false,
  suffix,
  inputMode,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  mono?: boolean;
  suffix?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-2 flex rounded-md border border-border bg-background focus-within:border-brand focus-within:ring-3 focus-within:ring-focus/20">
        <input
          name={name}
          required={required}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete="off"
          className={`min-h-12 min-w-0 flex-1 bg-transparent px-4 outline-none ${mono ? "font-mono text-sm" : ""}`}
        />
        {suffix && (
          <span className="flex items-center border-l border-border px-4 text-sm font-semibold text-brand">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function ParticipantField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  mono = false,
  suffix,
  inputMode,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  placeholder: string;
  required?: boolean;
  mono?: boolean;
  suffix?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-2 flex rounded-md border border-border bg-surface focus-within:border-brand focus-within:ring-3 focus-within:ring-focus/20">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete="off"
          className={`min-h-12 min-w-0 flex-1 bg-transparent px-4 outline-none ${mono ? "font-mono text-sm" : ""}`}
        />
        {suffix && (
          <span className="flex items-center border-l border-border px-4 text-sm font-semibold text-brand">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}
