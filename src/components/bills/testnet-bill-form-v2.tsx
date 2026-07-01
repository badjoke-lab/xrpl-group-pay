"use client";

import { useMemo, useState } from "react";
import { Check, LoaderCircle, Users } from "lucide-react";

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

const SECTION_COPY = {
  en: {
    detailsTitle: "Bill details",
    detailsDescription: "Choose the asset, recipient, and total amount.",
    splitTitle: "Split and participants",
    splitDescription: "Choose how the participant portion is divided.",
    reviewTitle: "Review readiness",
    reviewDescription: "Check the summary and complete any remaining fields.",
    asset: "Settlement asset",
    participants: "Participants",
  },
  ja: {
    detailsTitle: "請求内容",
    detailsDescription: "決済資産、受取先、合計額を設定します。",
    splitTitle: "配分と参加者",
    splitDescription: "参加者負担分の分け方を設定します。",
    reviewTitle: "確認準備",
    reviewDescription: "概要と未入力項目を確認します。",
    asset: "決済資産",
    participants: "参加者",
  },
  ko: {
    detailsTitle: "청구 내용",
    detailsDescription: "결제 자산, 수취인, 총액을 설정합니다.",
    splitTitle: "분할 및 참가자",
    splitDescription: "참가자 부담액의 분할 방식을 설정합니다.",
    reviewTitle: "검토 준비",
    reviewDescription: "요약과 남은 필수 항목을 확인합니다.",
    asset: "결제 자산",
    participants: "참가자",
  },
} as const;

function FormSection({
  step,
  title,
  description,
  complete,
  children,
}: {
  step: number;
  title: string;
  description: string;
  complete: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 min-w-0 rounded-xl border border-border bg-background p-4 sm:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            complete ? "bg-brand text-white" : "bg-brand-subtle text-brand"
          }`}
          aria-hidden="true"
        >
          {complete ? <Check className="size-4" /> : step}
        </div>
        <div className="min-w-0">
          <h3 className="font-heading text-lg font-semibold sm:text-xl">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

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
  const participantAddressesComplete = draft.participants.every((item) =>
    item.expectedPayerAddress.trim(),
  );
  const detailsComplete = Boolean(
    draft.title.trim() &&
      draft.destinationAddress.trim() &&
      draft.totalAmount.trim() &&
      draft.creatorShareAmount.trim(),
  );
  const splitComplete = allocationExact && participantAddressesComplete;
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
  const sectionCopy = SECTION_COPY[locale];

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

      <FormSection
        step={1}
        title={sectionCopy.detailsTitle}
        description={sectionCopy.detailsDescription}
        complete={detailsComplete}
      >
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
      </FormSection>

      <FormSection
        step={2}
        title={sectionCopy.splitTitle}
        description={sectionCopy.splitDescription}
        complete={splitComplete}
      >
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
      </FormSection>

      <FormSection
        step={3}
        title={sectionCopy.reviewTitle}
        description={sectionCopy.reviewDescription}
        complete={canReview}
      >
        <div className="mt-6 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="min-w-0 rounded-lg border border-border bg-surface p-3">
            <p className="text-xs font-semibold text-muted">{t("bill.field.total")}</p>
            <p className="mt-1 break-words font-semibold">
              {draft.totalAmount ? `${draft.totalAmount} ${selectedAsset.symbol}` : "—"}
            </p>
          </div>
          <div className="min-w-0 rounded-lg border border-border bg-surface p-3">
            <p className="text-xs font-semibold text-muted">
              {t("bill.field.creatorShare")}
            </p>
            <p className="mt-1 break-words font-semibold">
              {draft.creatorShareAmount
                ? `${draft.creatorShareAmount} ${selectedAsset.symbol}`
                : "—"}
            </p>
          </div>
          <div className="min-w-0 rounded-lg border border-border bg-surface p-3">
            <p className="text-xs font-semibold text-muted">{sectionCopy.asset}</p>
            <p className="mt-1 break-words font-semibold">{selectedAsset.symbol}</p>
          </div>
          <div className="min-w-0 rounded-lg border border-border bg-surface p-3">
            <p className="text-xs font-semibold text-muted">
              {sectionCopy.participants}
            </p>
            <p className="mt-1 font-semibold">{draft.participants.length}</p>
          </div>
        </div>

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

        <div className="sticky bottom-3 z-10 mt-5 rounded-xl border border-border bg-surface p-3 shadow-lg sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <Button
            type="submit"
            className="w-full"
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
        </div>
      </FormSection>
    </form>
  );
}
