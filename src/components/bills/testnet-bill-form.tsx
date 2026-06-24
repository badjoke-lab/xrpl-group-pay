"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  LoaderCircle,
  Plus,
  Share2,
  Trash2,
  Users,
} from "lucide-react";

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
    throw new Error(body?.error?.message ?? "The shared bill could not be created.");
  }
  return body;
}

function paymentUrl(token: string) {
  return `${window.location.origin}/testnet/payment#token=${token}`;
}

export function TestnetBillForm() {
  const [participants, setParticipants] = useState<ParticipantDraft[]>([
    participant(),
    participant(),
  ]);
  const [created, setCreated] = useState<CreatedBill | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function updateParticipant(
    id: string,
    field: keyof Omit<ParticipantDraft, "id">,
    value: string,
  ) {
    setParticipants((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function removeParticipant(id: string) {
    setParticipants((current) =>
      current.length <= 2 ? current : current.filter((item) => item.id !== id),
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
      participants: participants.map(({ label, expectedPayerAddress, amountXrp }) => ({
        ...(label.trim() ? { label } : {}),
        expectedPayerAddress,
        amountXrp,
      })),
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
        cause instanceof Error ? cause.message : "The shared bill could not be created.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyLink(slotId: string, token: string) {
    await navigator.clipboard.writeText(paymentUrl(token));
    setCopied(slotId);
    window.setTimeout(() => setCopied(null), 1500);
  }

  if (created) {
    return (
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/10">
            <Check aria-hidden="true" className="size-6 text-success" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-success">
              Bill created
            </p>
            <h2 className="mt-2 font-heading text-3xl font-semibold">
              {created.bill.title}
            </h2>
            <p className="mt-2 leading-7 text-muted">
              The bill is frozen. Send each participant only their own payment link.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <Summary label="Total" value={`${created.bill.totalDrops} drops`} />
          <Summary label="Creator share" value={`${created.bill.creatorShareDrops} drops`} />
          <Summary label="Participants" value={String(created.slots.length)} />
        </div>

        <div className="mt-8 space-y-4">
          {created.slots.map((slot, index) => (
            <article key={slot.publicId} className="rounded-lg border border-border bg-background p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted">Participant {index + 1}</p>
                  <h3 className="mt-1 font-heading text-lg font-semibold">
                    {slot.participantLabel || "Unnamed participant"}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {slot.expectedPayerAddress}
                  </p>
                  <p className="mt-2 font-semibold text-brand">
                    {slot.expectedAmountDrops} drops
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void copyLink(slot.publicId, slot.paymentToken)}
                >
                  {copied === slot.publicId ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : (
                    <Copy aria-hidden="true" className="size-4" />
                  )}
                  {copied === slot.publicId ? "Copied" : "Copy payment link"}
                </Button>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-7 rounded-lg bg-brand-subtle p-4 text-sm leading-6 text-brand">
          <div className="flex gap-3">
            <Share2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <p>
              Payment capabilities stay in the URL fragment, so they are not sent to
              the server as part of the page request. Treat each link like a private
              invitation and share it only with its participant.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="mt-7"
          onClick={() => setCreated(null)}
        >
          Create another bill
        </Button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
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
            The creator share and participant amounts must equal the total exactly.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field label="Bill title" name="title" placeholder="XRPL Meetup Dinner" required />
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
          <p className="mt-1 text-sm text-muted">At least two payment slots are required.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setParticipants((current) => [...current, participant()])}
          disabled={participants.length >= 50}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add participant
        </Button>
      </div>

      <div className="mt-5 space-y-4">
        {participants.map((item, index) => (
          <fieldset key={item.id} className="rounded-lg border border-border bg-background p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <legend className="font-heading font-semibold">Participant {index + 1}</legend>
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
                onChange={(value) => updateParticipant(item.id, "label", value)}
                placeholder="Alex"
              />
              <ParticipantField
                label="Expected payer address"
                value={item.expectedPayerAddress}
                onChange={(value) => updateParticipant(item.id, "expectedPayerAddress", value)}
                placeholder="r..."
                required
                mono
              />
              <ParticipantField
                label="Assigned amount"
                value={item.amountXrp}
                onChange={(value) => updateParticipant(item.id, "amountXrp", value)}
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
        <p role="alert" className="mt-5 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
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

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-heading text-lg font-semibold">{value}</p>
    </div>
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
        {suffix && <span className="flex items-center border-l border-border px-4 text-sm font-semibold text-brand">{suffix}</span>}
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
        {suffix && <span className="flex items-center border-l border-border px-4 text-sm font-semibold text-brand">{suffix}</span>}
      </div>
    </label>
  );
}
