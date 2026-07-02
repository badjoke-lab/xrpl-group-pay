"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ContextualHelp } from "@/components/help/contextual-help";
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
import { BillCreationMode } from "./bill-creation-mode";
import {
  billDetailsAreComplete,
  customAmountsArePositive,
  payerAddressIssues,
  recipientFundedAmountIssue,
  type PayerAddressIssue,
} from "./bill-creation-validation";
import {
  clearBillDraftSession,
  readBillDraftSession,
  writeBillDraftSession,
  type BillCreationStep,
} from "./bill-draft-session";
import {
  billDraftToInput,
  createAllocationSummary,
  newBillDraft,
  recipientFundedValue,
  type BillDraft,
  type BillPaymentMode,
  type ParticipantDraft,
  type SettlementAssetId,
} from "./bill-form-model";
import { AllocationSelection, AssetSelection } from "./bill-form-sections";
import { BillRecipientFields } from "./bill-recipient-fields";
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

const copy = {
  en: {
    eyebrow: "Create a Bill",
    title: "Set the recipient and each payer obligation",
    description:
      "Choose who receives the funds, then freeze one independent XRPL payment for every payer.",
    steps: ["Payment mode", "Recipient and Bill", "Payers and split", "Freeze review"],
    back: "Back",
    continue: "Continue",
    review: "Review and freeze",
    reviewing: "Checking Bill",
    discard: "Discard draft",
    discardConfirm: "Discard this unfinished Bill and clear its session draft?",
    recipientTitle: "Recipient and Bill details",
    recipientDescription:
      "The recipient, network, asset, total, and optional tag become immutable after creation.",
    assetTitle: "Settlement asset",
    assetDescription: "Every payer slot uses this same network-specific asset.",
    splitTitle: "Payers and allocation",
    splitRepresentative:
      "Allocate the amount expected from participants after the recipient-funded portion.",
    splitDirect:
      "Allocate the full Bill total. The operator may be entered as any other payer.",
    reviewTitle: "Ready to freeze this Bill?",
    reviewDescription:
      "Creation freezes the mode, recipient, asset, amounts, payer addresses, tags, and allocation. Changing them later requires a new Bill.",
    mode: "Payment mode",
    recipient: "Recipient",
    total: "Bill total",
    funded: "Recipient-funded",
    payerTotal: "Expected from payers",
    participants: "Payers",
    noTransfer: "No transfer",
    addressRequired: "Enter an XRPL payer address.",
    addressConflict: "The recipient address cannot also be a payer address.",
    addressDuplicate: "Each payer address may appear only once.",
    addressErrorsTitle: "Fix the payer addresses before continuing",
    fundedRequired: "Enter the recipient-funded amount.",
    fundedPositive: "The recipient-funded amount must be greater than zero.",
    fundedLessThanTotal: "The recipient-funded amount must be less than the Bill total.",
    positiveAmounts: "Every custom payer amount must be greater than zero.",
    exactAllocation: "The payer allocation must exactly match the expected payer total.",
    requiredDetails: "Complete the recipient, title, total, and mode-specific amount fields.",
    restored: "Unfinished draft restored from this browser session.",
  },
  ja: {
    eyebrow: "請求を作成",
    title: "受取人と各支払者の負担額を設定",
    description:
      "資金を受け取る相手を選び、支払者ごとに独立したXRPL支払いを確定します。",
    steps: ["支払いモード", "受取人と請求", "支払者と分け方", "確定前確認"],
    back: "戻る",
    continue: "次へ",
    review: "確認して確定へ",
    reviewing: "請求を確認中",
    discard: "下書きを破棄",
    discardConfirm: "未完了の請求と、このセッションの下書きを破棄しますか？",
    recipientTitle: "受取人と請求内容",
    recipientDescription:
      "作成後は受取人、ネットワーク、資産、総額、タグを変更できません。",
    assetTitle: "精算資産",
    assetDescription: "すべての支払枠で同じネットワーク固有の資産を使います。",
    splitTitle: "支払者と割り当て",
    splitRepresentative: "受取人負担分を除いた参加者からの回収額を割り当てます。",
    splitDirect: "請求総額の全額を割り当てます。操作担当自身も通常の支払者として入力できます。",
    reviewTitle: "この請求を確定しますか？",
    reviewDescription:
      "作成するとモード、受取人、資産、金額、支払者アドレス、タグ、割り当てが固定されます。変更するには新しい請求が必要です。",
    mode: "支払いモード",
    recipient: "受取人",
    total: "請求総額",
    funded: "受取人負担額",
    payerTotal: "支払者からの予定額",
    participants: "支払者",
    noTransfer: "送金なし",
    addressRequired: "支払者のXRPLアドレスを入力してください。",
    addressConflict: "受取先アドレスを支払者アドレスとして使うことはできません。",
    addressDuplicate: "同じ支払者アドレスは1回だけ使用できます。",
    addressErrorsTitle: "次へ進む前に支払者アドレスを修正してください",
    fundedRequired: "受取人負担額を入力してください。",
    fundedPositive: "受取人負担額は0より大きい必要があります。",
    fundedLessThanTotal: "受取人負担額は請求総額より小さい必要があります。",
    positiveAmounts: "各支払者の個別金額は0より大きい必要があります。",
    exactAllocation: "支払者への割り当て合計を予定回収額と一致させてください。",
    requiredDetails: "受取人、タイトル、総額、モード固有の金額を入力してください。",
    restored: "このブラウザセッションの未完了下書きを復元しました。",
  },
  ko: {
    eyebrow: "청구 만들기",
    title: "수취인과 각 결제자 의무 설정",
    description:
      "자금을 받을 대상을 선택하고 결제자마다 독립적인 XRPL 결제를 고정합니다.",
    steps: ["결제 모드", "수취인과 청구", "결제자와 분할", "고정 검토"],
    back: "뒤로",
    continue: "계속",
    review: "검토 후 고정",
    reviewing: "청구 확인 중",
    discard: "초안 삭제",
    discardConfirm: "완료되지 않은 청구와 이 세션의 초안을 삭제하시겠습니까?",
    recipientTitle: "수취인과 청구 세부 정보",
    recipientDescription:
      "생성 후에는 수취인, 네트워크, 자산, 총액과 태그를 변경할 수 없습니다.",
    assetTitle: "정산 자산",
    assetDescription: "모든 결제 슬롯은 같은 네트워크별 자산을 사용합니다.",
    splitTitle: "결제자와 배정",
    splitRepresentative: "수취인 부담분을 제외하고 참가자에게 받을 금액을 배정합니다.",
    splitDirect: "전체 청구 금액을 배정합니다. 운영자 자신도 일반 결제자로 입력할 수 있습니다.",
    reviewTitle: "이 청구를 고정하시겠습니까?",
    reviewDescription:
      "생성하면 모드, 수취인, 자산, 금액, 결제자 주소, 태그와 배정이 고정됩니다. 변경하려면 새 청구가 필요합니다.",
    mode: "결제 모드",
    recipient: "수취인",
    total: "청구 총액",
    funded: "수취인 부담",
    payerTotal: "결제자 예정 금액",
    participants: "결제자",
    noTransfer: "전송 없음",
    addressRequired: "결제자 XRPL 주소를 입력하세요.",
    addressConflict: "수취인 주소는 결제자 주소로 사용할 수 없습니다.",
    addressDuplicate: "각 결제자 주소는 한 번만 사용할 수 있습니다.",
    addressErrorsTitle: "계속하기 전에 결제자 주소를 수정하세요",
    fundedRequired: "수취인 부담 금액을 입력하세요.",
    fundedPositive: "수취인 부담 금액은 0보다 커야 합니다.",
    fundedLessThanTotal: "수취인 부담 금액은 청구 총액보다 작아야 합니다.",
    positiveAmounts: "각 사용자 지정 결제 금액은 0보다 커야 합니다.",
    exactAllocation: "결제자 배정 합계를 예정 결제 금액과 일치시키세요.",
    requiredDetails: "수취인, 제목, 총액과 모드별 금액을 입력하세요.",
    restored: "이 브라우저 세션의 미완료 초안을 복원했습니다.",
  },
} as const;

function readJson(response: Response, fallback: string) {
  return response.json().catch(() => null).then((body) => {
    if (!response.ok) throw new Error(body?.error?.message ?? fallback);
    return body;
  });
}

function StepHeader({
  current,
  labels,
}: {
  current: BillCreationStep;
  labels: readonly string[];
}) {
  return (
    <ol className="grid gap-2 sm:grid-cols-4" aria-label="Bill creation progress">
      {labels.map((label, index) => {
        const number = (index + 1) as BillCreationStep;
        const complete = number < current;
        const active = number === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-3 text-sm ${
              active
                ? "border-brand bg-brand-subtle text-brand"
                : complete
                  ? "border-success/25 bg-success-subtle text-success"
                  : "border-border bg-background text-muted"
            }`}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
              {complete ? <Check aria-hidden="true" className="size-4" /> : number}
            </span>
            <span className="truncate font-semibold">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function formatAddressIssue(
  issue: PayerAddressIssue,
  text: (typeof copy)["en"],
) {
  if (issue === "recipient_conflict") return text.addressConflict;
  if (issue === "duplicate") return text.addressDuplicate;
  return text.addressRequired;
}

export function TwoModeBillForm() {
  const { locale, t } = useLocalization();
  const text = (copy[locale] ?? copy.en) as (typeof copy)["en"];
  const [draft, setDraft] = useState<BillDraft>(() => newBillDraft(NETWORK));
  const [step, setStep] = useState<BillCreationStep>(1);
  const [review, setReview] = useState<BillReview | null>(null);
  const [created, setCreated] = useState<CreatedBill | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const storageReady = useRef(false);

  useEffect(() => {
    const stored = readBillDraftSession(NETWORK);
    queueMicrotask(() => {
      if (stored) {
        setDraft(stored.draft);
        setStep(stored.step);
        setRestored(true);
      }
      storageReady.current = true;
    });
  }, []);

  useEffect(() => {
    if (!storageReady.current || created) return;
    writeBillDraftSession(NETWORK, draft, step);
  }, [created, draft, step]);

  const selectedAsset =
    ASSETS.find((asset) => asset.id === draft.settlementAssetId) ?? ASSETS[0];
  const fundedAmount = recipientFundedValue(draft);

  const effectiveRemainderMode =
    draft.paymentMode === "direct" && draft.remainderMode === ""
      ? "first_participant"
      : draft.remainderMode;
  const remainderAssignment = useMemo(
    () =>
      buildRemainderAssignment({
        mode: effectiveRemainderMode,
        selectedParticipantId: draft.remainderParticipantId,
        participants: draft.participants.map((item) => ({
          participantId: item.id,
          label: item.label,
          manualUnits: item.remainderUnits,
        })),
      }),
    [draft, effectiveRemainderMode],
  );

  const customAllocation = useMemo(
    () =>
      calculateAssetAllocationPreview({
        totalAmount: draft.totalAmount,
        creatorShareAmount: fundedAmount,
        participantAmounts: draft.participants.map((item) => item.amount),
        scale: selectedAsset.precision,
      }),
    [draft.participants, draft.totalAmount, fundedAmount, selectedAsset.precision],
  );

  const strategyPreview = useMemo(
    () =>
      evaluateAllocationForm({
        strategy: draft.allocationStrategy,
        totalAmount: draft.totalAmount,
        creatorShareAmount: fundedAmount,
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
    [draft, fundedAmount, remainderAssignment, selectedAsset.precision],
  );

  const hasRemainder =
    draft.allocationStrategy !== "custom" &&
    strategyPreview.remainderUnits !== null &&
    strategyPreview.remainderUnits !== "0";
  const allocationExact =
    draft.allocationStrategy === "custom"
      ? customAllocation.status === "exact"
      : strategyPreview.status === "exact";
  const addressIssueMap = payerAddressIssues(draft);
  const addressesValid = Object.keys(addressIssueMap).length === 0;
  const fundedIssue = recipientFundedAmountIssue(draft, selectedAsset);
  const detailsReady = billDetailsAreComplete(draft, selectedAsset);
  const customPositive = customAmountsArePositive(draft, selectedAsset);
  const splitReady = allocationExact && addressesValid && customPositive;

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

  function setMode(mode: Exclude<BillPaymentMode, "">) {
    setDraft((current) => ({
      ...current,
      paymentMode: mode,
      recipientFundedEnabled:
        mode === "representative" ? current.recipientFundedEnabled : false,
      recipientFundedAmount:
        mode === "representative" ? current.recipientFundedAmount : "0",
      creatorShareAmount:
        mode === "representative" && current.recipientFundedEnabled
          ? current.recipientFundedAmount
          : "0",
      remainderMode:
        mode === "direct" && current.remainderMode === "creator"
          ? ""
          : current.remainderMode,
    }));
  }

  function updateBill(
    field:
      | "recipientLabel"
      | "title"
      | "destinationAddress"
      | "destinationTag"
      | "totalAmount"
      | "recipientFundedAmount",
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === "recipientFundedAmount"
        ? { creatorShareAmount: value }
        : {}),
    }));
  }

  function selectAsset(asset: AssetDescriptor) {
    if (asset.network !== NETWORK) return;
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
    if (step !== 4 || !detailsReady || !splitReady) return;
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
      const value = (await readJson(
        response,
        t("bill.form.error.create"),
      )) as CreatedBill;
      clearBillDraftSession(NETWORK);
      setCreated(value);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("bill.form.error.create"),
      );
    } finally {
      setCreating(false);
    }
  }

  function discard() {
    if (!window.confirm(text.discardConfirm)) return;
    clearBillDraftSession(NETWORK);
    setDraft(newBillDraft(NETWORK));
    setStep(1);
    setReview(null);
    setCreated(null);
    setError(null);
    setRestored(false);
  }

  if (created) {
    return <CreatedBillShare created={created} onReset={discard} />;
  }

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
          setStep(4);
        }}
        onConfirm={() => void confirmCreation()}
      />
    );
  }

  const fundedError =
    fundedIssue === "required"
      ? text.fundedRequired
      : fundedIssue === "not_positive"
        ? text.fundedPositive
        : fundedIssue === "not_less_than_total"
          ? text.fundedLessThanTotal
          : null;

  return (
    <form
      onSubmit={submitReview}
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-subtle">
            <Users aria-hidden="true" className="size-6 text-brand" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-action">
              {text.eyebrow}
            </p>
            <h2 className="mt-2 max-w-2xl font-heading text-2xl font-semibold leading-tight sm:text-3xl">
              {text.title}
            </h2>
            <p className="mt-2 max-w-2xl leading-7 text-muted">
              {text.description}
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" onClick={discard} className="text-danger">
          <Trash2 aria-hidden="true" className="size-4" />
          {text.discard}
        </Button>
      </div>

      {restored && (
        <p role="status" className="mt-5 rounded-lg border border-success/25 bg-success-subtle px-4 py-3 text-sm font-semibold text-success">
          {text.restored}
        </p>
      )}

      <div className="mt-7">
        <StepHeader current={step} labels={text.steps} />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-background p-5 sm:p-7">
        {step === 1 && (
          <BillCreationMode selected={draft.paymentMode} onSelect={setMode} />
        )}

        {step === 2 && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-2xl font-semibold">{text.recipientTitle}</h3>
                <p className="mt-2 max-w-2xl leading-7 text-muted">{text.recipientDescription}</p>
              </div>
              <ContextualHelp topic="recipient" variant="inline" />
            </div>
            <BillRecipientFields
              draft={draft}
              assetSymbol={selectedAsset.symbol}
              fundedAmountError={fundedError}
              onChange={updateBill}
              onFundedEnabledChange={(enabled) =>
                setDraft((current) => ({
                  ...current,
                  recipientFundedEnabled: enabled,
                  recipientFundedAmount: enabled
                    ? current.recipientFundedAmount || ""
                    : "0",
                  creatorShareAmount: enabled
                    ? current.recipientFundedAmount || ""
                    : "0",
                }))
              }
            />
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-heading text-xl font-semibold">{text.assetTitle}</h4>
                <p className="mt-1 text-sm leading-6 text-muted">{text.assetDescription}</p>
              </div>
              <ContextualHelp topic="settlement-asset" variant="inline" />
            </div>
            <AssetSelection
              assets={ASSETS}
              selectedAsset={selectedAsset}
              onSelect={selectAsset}
            />
            {!detailsReady && (
              <p role="status" className="mt-5 rounded-lg border border-warning/30 bg-warning-subtle p-4 text-sm text-foreground">
                {text.requiredDetails}
              </p>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-2xl font-semibold">{text.splitTitle}</h3>
                <p className="mt-2 max-w-2xl leading-7 text-muted">
                  {draft.paymentMode === "direct"
                    ? text.splitDirect
                    : text.splitRepresentative}
                </p>
              </div>
              <ContextualHelp topic="roles" variant="inline" />
            </div>
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

            {hasRemainder && draft.paymentMode === "representative" && strategyPreview.remainderUnits && (
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

            {!addressesValid && (
              <div role="alert" className="mt-5 rounded-lg border border-danger/25 bg-danger-subtle p-4 text-danger">
                <p className="font-semibold">{text.addressErrorsTitle}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {draft.participants
                    .filter((participant) => addressIssueMap[participant.id])
                    .map((participant, index) => (
                      <li key={participant.id}>
                        {participant.label.trim() || t("bill.participant.number", { number: index + 1 })}: {formatAddressIssue(addressIssueMap[participant.id], text)}
                      </li>
                    ))}
                </ul>
              </div>
            )}
            {!customPositive && (
              <p role="alert" className="mt-4 rounded-lg border border-danger/25 bg-danger-subtle p-4 text-sm text-danger">
                {text.positiveAmounts}
              </p>
            )}
            {!allocationExact && (
              <p role="status" className="mt-4 rounded-lg border border-warning/30 bg-warning-subtle p-4 text-sm text-foreground">
                {text.exactAllocation}
              </p>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-2xl font-semibold">{text.reviewTitle}</h3>
                <p className="mt-2 max-w-3xl leading-7 text-muted">{text.reviewDescription}</p>
              </div>
              <ContextualHelp topic="payment-status" variant="inline" />
            </div>
            <dl className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Summary label={text.mode} value={draft.paymentMode === "direct" ? text.steps[0] + ": " + copy[locale].steps[0] : draft.paymentMode} />
              <Summary label={text.recipient} value={draft.recipientLabel.trim() || draft.destinationAddress} mono={!draft.recipientLabel.trim()} />
              <Summary label={text.total} value={`${draft.totalAmount} ${selectedAsset.symbol}`} />
              <Summary label={text.funded} value={`${fundedAmount} ${selectedAsset.symbol} · ${text.noTransfer}`} />
              <Summary label={text.payerTotal} value={`${draft.participants.length} ${text.participants}`} />
              <Summary label={text.participants} value={String(draft.participants.length)} />
            </dl>
            <AllocationStatus
              strategy={draft.allocationStrategy}
              customAllocation={customAllocation}
              strategyPreview={strategyPreview}
              assetSymbol={selectedAsset.symbol}
            />
          </>
        )}
      </section>

      {error && (
        <p role="alert" className="mt-5 rounded-md bg-danger-subtle px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="sticky bottom-3 z-10 mt-6 flex flex-col-reverse gap-3 rounded-xl border border-border bg-surface p-3 shadow-lg sm:static sm:flex-row sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setStep((current) => Math.max(1, current - 1) as BillCreationStep)}
          disabled={step === 1}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {text.back}
        </Button>
        {step < 4 ? (
          <Button
            type="button"
            onClick={() => setStep((current) => Math.min(4, current + 1) as BillCreationStep)}
            disabled={
              (step === 1 && !draft.paymentMode) ||
              (step === 2 && !detailsReady) ||
              (step === 3 && !splitReady)
            }
          >
            {text.continue}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={reviewing || !detailsReady || !splitReady}>
            {reviewing ? (
              <>
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                {text.reviewing}
              </>
            ) : (
              text.review
            )}
          </Button>
        )}
      </div>
    </form>
  );
}

function Summary({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className={`mt-2 break-words font-semibold ${mono ? "font-mono text-sm" : ""}`}>{value || "—"}</dd>
    </div>
  );
}
