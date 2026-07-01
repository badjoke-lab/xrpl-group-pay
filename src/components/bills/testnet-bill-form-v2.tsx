"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { publicEnv } from "@/config/public-env";
import {
  getRlusdAssetDescriptor,
  getXrpAssetDescriptor,
} from "@/features/assets/registry";
import type { AssetDescriptor } from "@/features/assets/types";
import type { AllocationFormStrategy } from "@/features/bills/allocation-form";
import { evaluateAllocationForm } from "@/features/bills/allocation-form";
import { calculateAssetAllocationPreview } from "@/features/bills/allocation-preview";
import {
  BillReviewRequestError,
  requestBillReview,
} from "@/features/bills/review-bill-client";
import type { BillReview, CreatedBill } from "@/features/bills/types";
import { useLocalization } from "@/features/localization/provider";

import { AllocationStatus } from "./allocation-status";
import {
  billDraftToInput,
  createAllocationSummary,
  newBillDraft,
  type BillDraft,
  type ParticipantDraft,
  type SettlementAssetId,
} from "./bill-form-model";
import {
  AllocationSelection,
  AssetSelection,
  BillIdentityFields,
} from "./bill-form-sections";
import { CreatedBillShare } from "./created-bill-share";
import { ParticipantAllocationEditor } from "./participant-allocation-editor";
import {
  buildRemainderAssignment,
  RemainderControls,
} from "./remainder-controls";
import { TestnetBillReview } from "./testnet-bill-review";

const NETWORK = publicEnv.NEXT_PUBLIC_APP_NETWORK;
const ASSETS = [
  getXrpAssetDescriptor(NETWORK),
  getRlusdAssetDescriptor(NETWORK),
] as const;

const FORM_TITLE = {
  en: "Create a shared bill",
  ja: "共同請求を作成",
  ko: "공동 청구서 만들기",
} as const;

const REQUIRED_FIELDS_TITLE = {
  en: "Complete the required fields",
  ja: "必須項目を入力してください",
  ko: "필수 항목을 입력하세요",
} as const;

async function readJson(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error?.message ?? fallback);
  }
  return body;
}

export function TestnetBillForm() {
  const { locale, t } = useLocalization();
  const [draft, setDraft] = useState<BillDraft>(() => newBillDraft(NETWORK));
  const [review, setReview] = useState<BillReview | null>(null);
  const [created, setCreated] = useState<CreatedBill | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAsset =
    ASSETS.find((asset) => asset.id === draft.settlementAssetId) ?? ASSETS[0];

  const remainderAssignment = useMemo(
    () =>
      buildRemainderAssignment({
        mode: draft.remainderMode,
        selectedParticipantId: draft.remainderParticipantId,
        participants: draft.participants.map((item) => ({
          participantId: item.id,
          label: item.label,
          manualUnits: item.remainderUnits,
        })),
      }),
    [draft],
  );

  const customAllocation = useMemo(
    () =>
      calculateAssetAllocationPreview({
        totalAmount: draft.totalAmount,
        creatorShareAmount: draft.creatorShareAmount,
        participantAmounts: draft.participants.map((item) => item.amount),
        scale: selectedAsset.precision,
      }),
    [draft, selectedAsset.precision],
  );

  const strategyPreview = useMemo(
    () =>
      evaluateAllocationForm({
        strategy: draft.allocationStrategy,
        totalAmount: draft.totalAmount,
        creatorShareAmount: draft.creatorShareAmount,
        assetScale: selectedAsset.precision,
        participants: draft.participants.map((item) => ({
          participantId: item.id,
          amount: item.amount,
          percentage: item.percentage,
          shares: item.shares,
          remainderUnits: item.remainderUnits,
        })),
        remainderAssignment,
      }),
    [draft, remainderAssignment, selectedAsset.precision],
  );

  const hasRemainder =
    draft.allocationStrategy !== "custom" &&
    strategyPreview.remainderUnits !== null &&
    strategyPreview.remainderUnits !== "0";
  const allocationExact =
    draft.allocationStrategy === "custom"
      ? customAllocation.status === "exact"
      : strategyPreview.status === "exact";
  const missingRequiredFields = [
    !draft.title.trim() ? t("bill.field.title") : null,
    !draft.destinationAddress.trim() ? t("bill.field.destination") : null,
    !draft.totalAmount.trim() ? t("bill.field.total") : null,
    !draft.creatorShareAmount.trim() ? t("bill.field.creatorShare") : null,
    ...draft.participants.map((item, index) =>
      item.expectedPayerAddress.trim()
        ? null
        : `${t("bill.participant.number", { number: index + 1 })}: ${t(
            "bill.participant.payer",
          )}`,
    ),
  ].filter((item): item is string => item !== null);
  const canReview = allocationExact && missingRequiredFields.length === 0;
  const allocationSummary = useMemo(
    () =>
      createAllocationSummary({
        draft,
        remainderUnits:
          draft.allocationStrategy === "custom"
            ? "0"
            : strategyPreview.remainderUnits,
        appliedAssignment:
          draft.allocationStrategy === "custom"
            ? { kind: "none" }
            : strategyPreview.appliedRemainderAssignment,
      }),
    [draft, strategyPreview],
  );

  function updateBill(
    field:
      | "title"
      | "destinationAddress"
      | "destinationTag"
      | "totalAmount"
      | "creatorShareAmount",
    value: string,
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function selectAsset(asset: AssetDescriptor) {
    if (asset.network !== NETWORK) return;
    if (
      asset.id !== `xrpl:${NETWORK}:xrp` &&
      asset.id !== `xrpl:${NETWORK}:rlusd`
    ) {
      return;
    }
    setDraft((current) => ({
      ...current,
      settlementAssetId: asset.id as SettlementAssetId,
    }));
  }

  function selectStrategy(strategy: AllocationFormStrategy) {
    setDraft((current) => ({
      ...current,
      allocationStrategy: strategy,
      remainderMode: "",
      remainderParticipantId: "",
      participants: current.participants.map((item) => ({
        ...item,
        remainderUnits: "0",
      })),
    }));
  }

  function updateParticipant(
    participantId: string,
    field: keyof Omit<ParticipantDraft, "id">,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      participants: current.participants.map((item) =>
        item.id === participantId ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function removeParticipant(participantId: string) {
    setDraft((current) => {
      if (current.participants.length <= 2) return current;
      return {
        ...current,
        participants: current.participants.filter(
          (item) => item.id !== participantId,
        ),
        remainderParticipantId:
          current.remainderParticipantId === participantId
            ? ""
            : current.remainderParticipantId,
      };
    });
  }

  function activeInput() {
    return billDraftToInput({
      draft,
      remainderAssignment,
      includeRemainder: hasRemainder,
    });
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReview) return;
    setReviewing(true);
    setError(null);
    try {
      setReview(await requestBillReview(activeInput()));
    } catch (cause) {
      setError(
        cause instanceof BillReviewRequestError
          ? cause.message
          : t("bill.form.error.review"),
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
        body: JSON.stringify(activeInput()),
        cache: "no-store",
      });
      setCreated(
        (await readJson(response, t("bill.form.error.create"))) as CreatedBill,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("bill.form.error.create"),
      );
    } finally {
      setCreating(false);
    }
  }

  function reset() {
    setDraft(newBillDraft(NETWORK));
    setReview(null);
    setCreated(null);
    setError(null);
  }

  if (created) return <CreatedBillShare created={created} onReset={reset} />;

  if (review) {
    return (
      <TestnetBillReview
        review={review}
        allocationSummary={allocationSummary}
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

  const networkLabel = NETWORK === "mainnet" ? "Mainnet" : "Testnet";

  return (
    <form
      onSubmit={submitReview}
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-8"
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-subtle">
          <Users aria-hidden="true" className="size-6 text-brand" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-action sm:text-sm sm:tracking-[0.14em]">
            {t("bill.form.eyebrow")}
          </p>
          <h2 className="mt-2 max-w-xl font-heading text-2xl font-semibold leading-tight sm:text-3xl">
            {FORM_TITLE[locale]}
          </h2>
          <p className="mt-2 leading-7 text-muted">
            {t("bill.form.description", { network: networkLabel })}
          </p>
        </div>
      </div>

      <AssetSelection
        assets={ASSETS}
        selectedAsset={selectedAsset}
        onSelect={selectAsset}
      />
      <BillIdentityFields
        draft={draft}
        assetSymbol={selectedAsset.symbol}
        onChange={updateBill}
      />
      <AllocationSelection
        selected={draft.allocationStrategy}
        onSelect={selectStrategy}
      />
      <ParticipantAllocationEditor
        strategy={draft.allocationStrategy}
        participants={draft.participants}
        assetSymbol={selectedAsset.symbol}
        assetScale={selectedAsset.precision}
        calculatedUnits={
          strategyPreview.status === "exact"
            ? strategyPreview.participantUnits
            : {}
        }
        onChange={updateParticipant}
        onAdd={(participant) =>
          setDraft((current) => ({
            ...current,
            participants: [...current.participants, participant],
          }))
        }
        onRemove={removeParticipant}
      />

      {hasRemainder && strategyPreview.remainderUnits && (
        <RemainderControls
          remainderUnits={strategyPreview.remainderUnits}
          mode={draft.remainderMode}
          selectedParticipantId={draft.remainderParticipantId}
          participants={draft.participants.map((item) => ({
            participantId: item.id,
            label: item.label,
            manualUnits: item.remainderUnits,
          }))}
          onModeChange={(mode) =>
            setDraft((current) => ({
              ...current,
              remainderMode: mode,
              remainderParticipantId:
                mode === "selected_participant"
                  ? current.remainderParticipantId
                  : "",
            }))
          }
          onSelectedParticipantChange={(participantId) =>
            setDraft((current) => ({
              ...current,
              remainderParticipantId: participantId,
            }))
          }
          onManualUnitsChange={(participantId, units) =>
            updateParticipant(participantId, "remainderUnits", units)
          }
        />
      )}

      <AllocationStatus
        strategy={draft.allocationStrategy}
        customAllocation={customAllocation}
        strategyPreview={strategyPreview}
        assetSymbol={selectedAsset.symbol}
      />

      {allocationExact && missingRequiredFields.length > 0 && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-action/25 bg-action/10 p-4 text-action"
        >
          <p className="font-semibold">{REQUIRED_FIELDS_TITLE[locale]}</p>
          <p className="mt-1 break-words text-sm leading-6">
            {missingRequiredFields.join(" · ")}
          </p>
        </div>
      )}

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
            {t("bill.form.reviewing")}
          </>
        ) : (
          t("bill.form.review")
        )}
      </Button>
    </form>
  );
}
