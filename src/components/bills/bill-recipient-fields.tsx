"use client";

import { ContextualHelp } from "@/components/help/contextual-help";
import { useLocalization } from "@/features/localization/provider";

import type { BillDraft } from "./bill-form-model";
import { BillFormField } from "./bill-form-controls";

const copy = {
  en: {
    representativeLabel: "Representative or recipient name",
    directLabel: "Store or organizer name",
    labelDescription: "Optional display label. The XRPL address remains authoritative.",
    destination: "Recipient XRPL address",
    destinationDescription: "Every payer sends directly to this frozen account.",
    tag: "Destination Tag",
    tagDescription: "Optional UInt32 tag required by some exchanges and custodial recipients.",
    title: "Bill title",
    total: "Bill total",
    fundedToggle: "Include a recipient-funded amount",
    fundedDescription:
      "Record the part covered by the representative recipient. This is accounting only and creates no self-transfer.",
    fundedAmount: "Recipient-funded amount",
    fundedAmountDescription: "The remaining total is assigned to payer slots.",
    directNotice:
      "Direct mode assigns the full Bill total to payer slots. There is no recipient-funded amount.",
  },
  ja: {
    representativeLabel: "代表者または受取人の名前",
    directLabel: "店舗または主催者の名前",
    labelDescription: "表示用の任意項目です。送金先としてはXRPLアドレスが優先されます。",
    destination: "受取先XRPLアドレス",
    destinationDescription: "全支払者がこの確定済みアカウントへ直接送金します。",
    tag: "Destination Tag",
    tagDescription: "取引所やカストディ受取先で必要になる場合がある任意のUInt32タグです。",
    title: "請求タイトル",
    total: "請求総額",
    fundedToggle: "受取人負担分を含める",
    fundedDescription:
      "代表者側が負担する分を記録します。これは会計上の値で、自己送金は作成されません。",
    fundedAmount: "受取人負担額",
    fundedAmountDescription: "残りの金額を支払者の支払枠へ割り当てます。",
    directNotice:
      "直接支払いモードでは請求総額の全額を支払枠へ割り当て、受取人負担額はありません。",
  },
  ko: {
    representativeLabel: "대표자 또는 수취인 이름",
    directLabel: "상점 또는 주최자 이름",
    labelDescription: "선택 표시 이름입니다. 실제 전송에는 XRPL 주소가 기준입니다.",
    destination: "수취인 XRPL 주소",
    destinationDescription: "모든 결제자가 이 고정 계정으로 직접 전송합니다.",
    tag: "Destination Tag",
    tagDescription: "일부 거래소나 수탁 수취인에게 필요한 선택 UInt32 태그입니다.",
    title: "청구 제목",
    total: "청구 총액",
    fundedToggle: "수취인 부담 금액 포함",
    fundedDescription:
      "대표 수취인이 부담하는 부분을 기록합니다. 회계 값일 뿐 자기 전송을 만들지 않습니다.",
    fundedAmount: "수취인 부담 금액",
    fundedAmountDescription: "나머지 금액이 결제자 슬롯에 배정됩니다.",
    directNotice:
      "직접 결제 모드는 전체 청구 금액을 결제 슬롯에 배정하며 수취인 부담 금액이 없습니다.",
  },
} as const;

type BillField =
  | "recipientLabel"
  | "title"
  | "destinationAddress"
  | "destinationTag"
  | "totalAmount"
  | "recipientFundedAmount";

export function BillRecipientFields({
  draft,
  assetSymbol,
  destinationError,
  fundedAmountError,
  onChange,
  onFundedEnabledChange,
}: {
  draft: BillDraft;
  assetSymbol: string;
  destinationError?: string | null;
  fundedAmountError?: string | null;
  onChange(field: BillField, value: string): void;
  onFundedEnabledChange(enabled: boolean): void;
}) {
  const { locale } = useLocalization();
  const text = copy[locale] ?? copy.en;
  const representative = draft.paymentMode === "representative";

  return (
    <div className="mt-7 space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <BillFormField
          label={representative ? text.representativeLabel : text.directLabel}
          description={text.labelDescription}
          value={draft.recipientLabel}
          onChange={(value) => onChange("recipientLabel", value)}
          placeholder={representative ? "Alex" : "XRPL Meetup Venue"}
        />
        <BillFormField
          label={text.destination}
          labelAction={<ContextualHelp topic="recipient" variant="inline" />}
          description={text.destinationDescription}
          value={draft.destinationAddress}
          onChange={(value) => onChange("destinationAddress", value)}
          placeholder="r..."
          required
          mono
          error={destinationError}
        />
        <BillFormField
          label={text.title}
          value={draft.title}
          onChange={(value) => onChange("title", value)}
          placeholder="XRPL Meetup Dinner"
          required
        />
        <BillFormField
          label={text.total}
          value={draft.totalAmount}
          onChange={(value) => onChange("totalAmount", value)}
          placeholder="10"
          required
          suffix={assetSymbol}
          inputMode="decimal"
        />
        <BillFormField
          label={text.tag}
          labelAction={<ContextualHelp topic="destination-tag" variant="inline" />}
          description={text.tagDescription}
          value={draft.destinationTag}
          onChange={(value) => onChange("destinationTag", value)}
          placeholder="Optional"
          inputMode="numeric"
        />
      </div>

      {representative ? (
        <div className="rounded-xl border border-border bg-surface p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={draft.recipientFundedEnabled}
              onChange={(event) => onFundedEnabledChange(event.target.checked)}
              className="mt-1 size-5 rounded border-border text-brand focus:ring-focus"
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 font-semibold">
                {text.fundedToggle}
                <ContextualHelp topic="allocation" variant="inline" />
              </span>
              <span className="mt-1 block text-sm leading-6 text-muted">
                {text.fundedDescription}
              </span>
            </span>
          </label>

          {draft.recipientFundedEnabled && (
            <div className="mt-5 max-w-md">
              <BillFormField
                label={text.fundedAmount}
                description={text.fundedAmountDescription}
                value={draft.recipientFundedAmount}
                onChange={(value) => onChange("recipientFundedAmount", value)}
                placeholder="2"
                required
                suffix={assetSymbol}
                inputMode="decimal"
                error={fundedAmountError}
              />
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-brand/20 bg-brand-subtle p-4 text-sm leading-6 text-foreground">
          {text.directNotice}
        </p>
      )}
    </div>
  );
}
