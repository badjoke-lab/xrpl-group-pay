"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

import { CreatedBillShare } from "@/components/bills/created-bill-share";
import { TestnetBillReview } from "@/components/bills/testnet-bill-review";
import { Button } from "@/components/ui/button";
import {
  calculateAllocationPreview,
  formatDropsAsXrp,
} from "@/features/bills/allocation-preview";
import {
  BillReviewRequestError,
  requestBillReview,
} from "@/features/bills/review-bill-client";
import type {
  BillReview,
  CreateBillInput,
  CreatedBill,
} from "@/features/bills/types";

type ParticipantDraft = {
  id: string;
  label: string;
  expectedPayerAddress: string;
  amountXrp: string;
};

type BillDraft = {
  title: string;
  destinationAddress: string;
  destinationTag: string;
  totalXrp: string;
  creatorShareXrp: string;
  participants: ParticipantDraft[];
};

function participant(): ParticipantDraft {
  return {
    id: crypto.randomUUID(),
    label: "",
    expectedPayerAddress: "",
    amountXrp: "",
  };
}

function draft(): BillDraft {
  return {
    title: "",
    destinationAddress: "",
    destinationTag: "",
    totalXrp: "",
    creatorShareXrp: "",
    participants: [participant(), participant()],
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

function toInput(value: BillDraft): CreateBillInput {
  const destinationTag = value.destinationTag.trim();
  return {
    title: value.title,
    destinationAddress: value.destinationAddress,
    ...(destinationTag ? { destinationTag } : {}),
    totalXrp: value.totalXrp,
    creatorShareXrp: value.creatorShareXrp,
    participants: value.participants.map(
      ({ label, expectedPayerAddress, amountXrp }) => ({
        ...(label.trim() ? { label } : {}),
        expectedPayerAddress,
        amountXrp,
      }),
    ),
  };
}

export function TestnetBillForm() {
  const [billDraft, setBillDraft] = useState<BillDraft>(() => draft());
  const [review, setReview] = useState<BillReview | null>(null);
  const [created, setCreated] = useState<CreatedBill | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allocation = useMemo(
    () =>
      calculateAllocationPreview({
        totalXrp: billDraft.totalXrp,
        creatorShareXrp: billDraft.creatorShareXrp,
        participantAmountsXrp: billDraft.participants.map(
          (item) => item.amountXrp,
        ),
      }),
    [billDraft],
  );

  function updateBill(field: keyof Omit<BillDraft, "participants">, value: string) {
    setBillDraft((current) => ({ ...current, [field]: value }));
  }

  function updateParticipant(
    id: string,
    field: keyof Omit<ParticipantDraft, "id">,
    value: string,
  ) {
    setBillDraft((current) => ({
      ...current,
      participants: current.participants.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function removeParticipant(id: string) {
    setBillDraft((current) => ({
      ...current,
      participants:
        current.participants.length <= 2
          ? current.participants
          : current.participants.filter((item) => item.id !== id),
    }));
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewing(true);
    setError(null);
    try {
      setReview(await requestBillReview(toInput(billDraft)));
    } catch (cause) {
      setError(
        cause instanceof BillReviewRequestError
          ? cause.message
          : "The bill could not be reviewed.",
      );
    } finally {
      setReviewing(false);
    }
  }

  async function confirmCreation() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toInput(billDraft)),
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

  function reset() {
    setBillDraft(draft());
    setReview(null);
    setCreated(null);
    setError(null);
  }

  if (created) return <CreatedBillShare created={created} onReset={reset} />;

  if (review) {
    return (
      <TestnetBillReview
        review={review}
        creating={creating}
        error={error}
        onBack={() => {
          setReview(null);
          setError(null);
        }}
        onConfirm={() => void confirmCreation()}
      />
    );
  }

  return (
    <form
      onSubmit={submitReview}
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
            Enter the bill conditions first. Nothing is frozen until the review
            step is confirmed.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field
          label="Bill title"
          value={billDraft.title}
          onChange={(value) => updateBill("title", value)}
          placeholder="XRPL Meetup Dinner"
          required
        />
        <Field
          label="Creator destination address"
          value={billDraft.destinationAddress}
          onChange={(value) => updateBill("destinationAddress", value)}
          placeholder="r..."
          required
          mono
        />
        <Field
          label="Total"
          value={billDraft.totalXrp}
          onChange={(value) => updateBill("totalXrp", value)}
          placeholder="10"
          required
          suffix="XRP"
          inputMode="decimal"
        />
        <Field
          label="Creator share"
          value={billDraft.creatorShareXrp}
          onChange={(value) => updateBill("creatorShareXrp", value)}
          placeholder="2"
          required
          suffix="XRP"
          inputMode="decimal"
        />
        <Field
          label="Destination Tag"
          value={billDraft.destinationTag}
          onChange={(value) => updateBill("destinationTag", value)}
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
            setBillDraft((current) => ({
              ...current,
              participants: [...current.participants, participant()],
            }))
          }
          disabled={billDraft.participants.length >= 50}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add participant
        </Button>
      </div>

      <div className="mt-5 space-y-4">
        {billDraft.participants.map((item, index) => (
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
                disabled={billDraft.participants.length <= 2}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Label"
                value={item.label}
                onChange={(value) => updateParticipant(item.id, "label", value)}
                placeholder="Alex"
              />
              <Field
                label="Expected payer address"
                value={item.expectedPayerAddress}
                onChange={(value) =>
                  updateParticipant(item.id, "expectedPayerAddress", value)
                }
                placeholder="r..."
                required
                mono
              />
              <Field
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

      <AllocationStatus allocation={allocation} />

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="mt-7 w-full"
        disabled={reviewing || allocation.status !== "exact"}
      >
        {reviewing ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Validating bill review
          </>
        ) : (
          "Review bill before freezing"
        )}
      </Button>
    </form>
  );
}

function AllocationStatus({
  allocation,
}: {
  allocation: ReturnType<typeof calculateAllocationPreview>;
}) {
  const exact = allocation.status === "exact";
  const Icon = exact ? CheckCircle2 : CircleAlert;
  let message = "Enter the total, creator share, and every participant amount.";
  if (allocation.status === "under" && allocation.differenceDrops !== null) {
    message = `${formatDropsAsXrp(allocation.differenceDrops)} XRP remains to allocate.`;
  }
  if (allocation.status === "over" && allocation.differenceDrops !== null) {
    message = `${formatDropsAsXrp(-allocation.differenceDrops)} XRP is allocated above the bill total.`;
  }
  if (exact) message = "Creator share and participant amounts match the bill total.";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-6 flex items-start gap-3 rounded-lg border p-4 ${
        exact
          ? "border-success/25 bg-success/10 text-success"
          : "border-border bg-background text-muted"
      }`}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-semibold">
          {exact ? "Allocation exact" : "Allocation incomplete"}
        </p>
        <p className="mt-1 text-sm leading-6">{message}</p>
      </div>
    </div>
  );
}

function Field({
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
      <div className="mt-2 flex rounded-md border border-border bg-background focus-within:border-brand focus-within:ring-3 focus-within:ring-focus/20">
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
