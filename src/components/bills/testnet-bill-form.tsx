"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Coins,
  LoaderCircle,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

import { CreatedBillShare } from "@/components/bills/created-bill-share";
import { TestnetBillReview } from "@/components/bills/testnet-bill-review";
import { Button } from "@/components/ui/button";
import {
  getRlusdAssetDescriptor,
  getXrpAssetDescriptor,
} from "@/features/assets/registry";
import type { AssetDescriptor } from "@/features/assets/types";
import {
  type AllocationFormStrategy,
  evaluateAllocationForm,
} from "@/features/bills/allocation-form";
import {
  calculateAssetAllocationPreview,
  formatAllocationUnits,
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
import { decimalToUnits, unitsToDecimal } from "@/features/money/money";

const ASSETS = [
  getXrpAssetDescriptor("testnet"),
  getRlusdAssetDescriptor("testnet"),
] as const;

const STRATEGIES: Array<{
  id: AllocationFormStrategy;
  label: string;
  description: string;
}> = [
  {
    id: "custom",
    label: "Custom Amount",
    description: "Enter each participant obligation directly.",
  },
  {
    id: "equal",
    label: "Equal",
    description: "Split the participant portion evenly.",
  },
  {
    id: "percentage",
    label: "Percentage",
    description: "Assign exact percentages totaling 100%.",
  },
  {
    id: "shares",
    label: "Shares",
    description: "Use positive whole-number relative weights.",
  },
];

type ParticipantDraft = {
  id: string;
  label: string;
  expectedPayerAddress: string;
  amount: string;
  percentage: string;
  shares: string;
};

type SettlementAssetId = "xrpl:testnet:xrp" | "xrpl:testnet:rlusd";

type BillDraft = {
  title: string;
  destinationAddress: string;
  destinationTag: string;
  settlementAssetId: SettlementAssetId;
  totalAmount: string;
  creatorShareAmount: string;
  allocationStrategy: AllocationFormStrategy;
  participants: ParticipantDraft[];
};

function participant(): ParticipantDraft {
  return {
    id: crypto.randomUUID(),
    label: "",
    expectedPayerAddress: "",
    amount: "",
    percentage: "",
    shares: "1",
  };
}

function draft(): BillDraft {
  return {
    title: "",
    destinationAddress: "",
    destinationTag: "",
    settlementAssetId: "xrpl:testnet:xrp",
    totalAmount: "",
    creatorShareAmount: "",
    allocationStrategy: "custom",
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
  const base = {
    title: value.title,
    destinationAddress: value.destinationAddress,
    ...(destinationTag ? { destinationTag } : {}),
    settlementAssetId: value.settlementAssetId,
    totalAmount: value.totalAmount,
    creatorShareAmount: value.creatorShareAmount,
  };
  const participants = value.participants.map((item) => ({
    participantId: item.id,
    ...(item.label.trim() ? { label: item.label } : {}),
    expectedPayerAddress: item.expectedPayerAddress,
    ...(value.allocationStrategy === "custom" ? { amount: item.amount } : {}),
  }));

  if (value.allocationStrategy === "custom") {
    return { ...base, allocation: { strategy: "custom" }, participants };
  }
  if (value.allocationStrategy === "equal") {
    return { ...base, allocation: { strategy: "equal" }, participants };
  }
  if (value.allocationStrategy === "percentage") {
    return {
      ...base,
      allocation: {
        strategy: "percentage",
        percentageScale: 2,
        percentages: value.participants.map((item) => ({
          participantId: item.id,
          units: decimalToUnits(item.percentage, 2),
        })),
      },
      participants,
    };
  }
  return {
    ...base,
    allocation: {
      strategy: "shares",
      shares: value.participants.map((item) => ({
        participantId: item.id,
        units: item.shares.trim(),
      })),
    },
    participants,
  };
}

export function TestnetBillForm() {
  const [billDraft, setBillDraft] = useState<BillDraft>(() => draft());
  const [review, setReview] = useState<BillReview | null>(null);
  const [created, setCreated] = useState<CreatedBill | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAsset =
    ASSETS.find((asset) => asset.id === billDraft.settlementAssetId) ?? ASSETS[0];
  const customAllocation = useMemo(
    () =>
      calculateAssetAllocationPreview({
        totalAmount: billDraft.totalAmount,
        creatorShareAmount: billDraft.creatorShareAmount,
        participantAmounts: billDraft.participants.map((item) => item.amount),
        scale: selectedAsset.precision,
      }),
    [billDraft, selectedAsset.precision],
  );
  const strategyPreview = useMemo(
    () =>
      evaluateAllocationForm({
        strategy: billDraft.allocationStrategy,
        totalAmount: billDraft.totalAmount,
        creatorShareAmount: billDraft.creatorShareAmount,
        assetScale: selectedAsset.precision,
        participants: billDraft.participants.map((item) => ({
          participantId: item.id,
          amount: item.amount,
          percentage: item.percentage,
          shares: item.shares,
        })),
      }),
    [billDraft, selectedAsset.precision],
  );
  const canReview =
    billDraft.allocationStrategy === "custom"
      ? customAllocation.status === "exact"
      : strategyPreview.status === "exact";

  function updateBill(
    field: keyof Omit<BillDraft, "participants">,
    value: string,
  ) {
    setBillDraft((current) => ({ ...current, [field]: value }));
  }

  function selectAsset(asset: AssetDescriptor) {
    if (asset.id !== "xrpl:testnet:xrp" && asset.id !== "xrpl:testnet:rlusd") {
      return;
    }
    setBillDraft((current) => ({
      ...current,
      settlementAssetId: asset.id as SettlementAssetId,
    }));
  }

  function selectStrategy(strategy: AllocationFormStrategy) {
    setBillDraft((current) => ({
      ...current,
      allocationStrategy: strategy,
    }));
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
    if (!canReview) return;
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
            Choose one Settlement Asset for the Bill
          </h2>
          <p className="mt-2 leading-7 text-muted">
            Every participant pays the same frozen Asset. Nothing becomes payable
            until the review step is confirmed.
          </p>
        </div>
      </div>

      <fieldset className="mt-8">
        <legend className="text-sm font-semibold">Settlement Asset</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {ASSETS.map((asset) => (
            <ChoiceCard
              key={asset.id}
              name="settlementAsset"
              value={asset.id}
              checked={asset.id === selectedAsset.id}
              label={asset.symbol}
              description={
                asset.assetType === "native"
                  ? "Native XRP on XRPL Testnet"
                  : "Official Ripple USD issued on XRPL Testnet"
              }
              detail={
                asset.assetType === "issued" ? `Issuer ${asset.issuer}` : null
              }
              onChange={() => selectAsset(asset)}
            />
          ))}
        </div>
        {selectedAsset.assetType === "issued" && (
          <p className="mt-3 rounded-lg border border-action/25 bg-action/10 p-4 text-sm leading-6">
            The destination account must be ready to receive official RLUSD. The
            issuer and amount will be frozen with every participant slot.
          </p>
        )}
      </fieldset>

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
          value={billDraft.totalAmount}
          onChange={(value) => updateBill("totalAmount", value)}
          placeholder="10"
          required
          suffix={selectedAsset.symbol}
          inputMode="decimal"
        />
        <Field
          label="Creator share"
          value={billDraft.creatorShareAmount}
          onChange={(value) => updateBill("creatorShareAmount", value)}
          placeholder="2"
          required
          suffix={selectedAsset.symbol}
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

      <fieldset className="mt-10">
        <legend className="font-heading text-xl font-semibold">
          Allocation method
        </legend>
        <p className="mt-1 text-sm text-muted">
          The server recomputes the final obligations before the Bill is frozen.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {STRATEGIES.map((strategy) => (
            <ChoiceCard
              key={strategy.id}
              name="allocationStrategy"
              value={strategy.id}
              checked={billDraft.allocationStrategy === strategy.id}
              label={strategy.label}
              description={strategy.description}
              detail={null}
              onChange={() => selectStrategy(strategy.id)}
            />
          ))}
        </div>
      </fieldset>

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
              {billDraft.allocationStrategy === "custom" && (
                <Field
                  label="Assigned amount"
                  value={item.amount}
                  onChange={(value) => updateParticipant(item.id, "amount", value)}
                  placeholder="4"
                  required
                  suffix={selectedAsset.symbol}
                  inputMode="decimal"
                />
              )}
              {billDraft.allocationStrategy === "percentage" && (
                <Field
                  label="Percentage"
                  value={item.percentage}
                  onChange={(value) =>
                    updateParticipant(item.id, "percentage", value)
                  }
                  placeholder="50"
                  required
                  suffix="%"
                  inputMode="decimal"
                />
              )}
              {billDraft.allocationStrategy === "shares" && (
                <Field
                  label="Shares"
                  value={item.shares}
                  onChange={(value) => updateParticipant(item.id, "shares", value)}
                  placeholder="1"
                  required
                  inputMode="numeric"
                />
              )}
              {billDraft.allocationStrategy !== "custom" &&
                strategyPreview.status === "exact" && (
                  <div className="rounded-md border border-border bg-surface p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      Calculated obligation
                    </p>
                    <p className="mt-2 font-heading text-lg font-semibold text-brand">
                      {unitsToDecimal(
                        strategyPreview.participantUnits[item.id],
                        selectedAsset.precision,
                      )}{" "}
                      {selectedAsset.symbol}
                    </p>
                  </div>
                )}
            </div>
          </fieldset>
        ))}
      </div>

      <AllocationStatus
        strategy={billDraft.allocationStrategy}
        customAllocation={customAllocation}
        strategyPreview={strategyPreview}
        assetSymbol={selectedAsset.symbol}
      />

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
        disabled={reviewing || !canReview}
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

function ChoiceCard({
  name,
  value,
  checked,
  label,
  description,
  detail,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  description: string;
  detail: string | null;
  onChange(): void;
}) {
  return (
    <label
      className={`cursor-pointer rounded-xl border p-5 transition-colors ${
        checked
          ? "border-brand bg-brand-subtle"
          : "border-border bg-background hover:border-brand/50"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-lg font-semibold">{label}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
        <div
          className={`flex size-8 items-center justify-center rounded-full ${
            checked ? "bg-brand text-white" : "bg-surface text-muted"
          }`}
        >
          {checked ? (
            <CheckCircle2 aria-hidden="true" className="size-5" />
          ) : (
            <Coins aria-hidden="true" className="size-5" />
          )}
        </div>
      </div>
      {detail && (
        <p className="mt-3 break-all font-mono text-[11px] text-muted">
          {detail}
        </p>
      )}
    </label>
  );
}

function AllocationStatus({
  strategy,
  customAllocation,
  strategyPreview,
  assetSymbol,
}: {
  strategy: AllocationFormStrategy;
  customAllocation: ReturnType<typeof calculateAssetAllocationPreview>;
  strategyPreview: ReturnType<typeof evaluateAllocationForm>;
  assetSymbol: string;
}) {
  if (strategy !== "custom") {
    const exact = strategyPreview.status === "exact";
    return (
      <div
        role="status"
        aria-live="polite"
        className={`mt-6 flex items-start gap-3 rounded-lg border p-4 ${
          exact
            ? "border-success/25 bg-success/10 text-success"
            : strategyPreview.status === "needs_remainder"
              ? "border-action/25 bg-action/10 text-action"
              : "border-border bg-background text-muted"
        }`}
      >
        {exact ? (
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        ) : (
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        )}
        <div>
          <p className="font-semibold">
            {exact
              ? "Allocation exact"
              : strategyPreview.status === "needs_remainder"
                ? "Remainder rule required"
                : "Allocation incomplete"}
          </p>
          <p className="mt-1 text-sm leading-6">{strategyPreview.message}</p>
        </div>
      </div>
    );
  }

  const exact = customAllocation.status === "exact";
  let message = "Enter the total, creator share, and every participant amount.";
  if (
    customAllocation.status === "under" &&
    customAllocation.differenceUnits !== null
  ) {
    message = `${formatAllocationUnits(customAllocation.differenceUnits, customAllocation.scale)} ${assetSymbol} remains to allocate.`;
  }
  if (
    customAllocation.status === "over" &&
    customAllocation.differenceUnits !== null
  ) {
    message = `${formatAllocationUnits(-customAllocation.differenceUnits, customAllocation.scale)} ${assetSymbol} is allocated above the bill total.`;
  }
  if (exact) {
    message = `Creator share and participant amounts match the ${assetSymbol} total.`;
  }

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
      {exact ? (
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      ) : (
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      )}
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
