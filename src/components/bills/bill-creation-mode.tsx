"use client";

import { ContextualHelp } from "@/components/help/contextual-help";
import { useLocalization } from "@/features/localization/provider";

import type { BillPaymentMode } from "./bill-form-model";
import { BillFormChoiceCard } from "./bill-form-controls";

const copy = {
  en: {
    legend: "Who will participants pay?",
    description:
      "Choose the recipient relationship before entering amounts or payer wallets.",
    representative: "Pay a representative",
    representativeBody:
      "Use for reimbursements, fees, or a shared purchase collected by one person.",
    representativeDetail:
      "Participants pay the representative recipient. A recipient-funded portion may be recorded without a self-transfer.",
    direct: "Pay a store or organizer directly",
    directBody:
      "Use when every participant should send their payment to an external recipient.",
    directDetail:
      "The full Bill total is assigned to payer slots. The Bill operator may be included as a normal payer.",
  },
  ja: {
    legend: "参加者は誰に支払いますか？",
    description:
      "金額や支払者ウォレットを入力する前に、受取人との関係を選択します。",
    representative: "代表者へ支払う",
    representativeBody:
      "立替精算、会費、共同購入など、1人がまとめて受け取る場合に使います。",
    representativeDetail:
      "参加者は代表者へ直接送金します。受取人負担分は自己送金なしで記録できます。",
    direct: "店舗や主催者へ直接支払う",
    directBody:
      "全参加者が外部の店舗、主催者、販売者などへ直接支払う場合に使います。",
    directDetail:
      "請求総額の全額を支払枠へ割り当てます。操作担当自身も通常の支払者として追加できます。",
  },
  ko: {
    legend: "참가자는 누구에게 결제합니까?",
    description:
      "금액이나 결제자 지갑을 입력하기 전에 수취인 관계를 선택합니다.",
    representative: "대표자에게 결제",
    representativeBody:
      "환급, 회비 또는 한 사람이 모으는 공동 구매에 사용합니다.",
    representativeDetail:
      "참가자는 대표 수취인에게 직접 보냅니다. 수취인 부담분은 자기 송금 없이 기록할 수 있습니다.",
    direct: "상점 또는 주최자에게 직접 결제",
    directBody:
      "모든 참가자가 외부 상점, 주최자 또는 판매자에게 직접 보내는 경우에 사용합니다.",
    directDetail:
      "전체 청구 금액을 결제 슬롯에 배정합니다. 청구 운영자도 일반 결제자로 추가할 수 있습니다.",
  },
} as const;

export function BillCreationMode({
  selected,
  onSelect,
}: {
  selected: BillPaymentMode;
  onSelect(mode: Exclude<BillPaymentMode, "">): void;
}) {
  const { locale } = useLocalization();
  const text = copy[locale] ?? copy.en;

  return (
    <fieldset>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <legend className="font-heading text-2xl font-semibold">
            {text.legend}
          </legend>
          <p className="mt-2 max-w-2xl leading-7 text-muted">
            {text.description}
          </p>
        </div>
        <ContextualHelp topic="roles" variant="inline" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <BillFormChoiceCard
          name="paymentMode"
          value="representative"
          checked={selected === "representative"}
          label={text.representative}
          description={text.representativeBody}
          detail={text.representativeDetail}
          onChange={() => onSelect("representative")}
        />
        <BillFormChoiceCard
          name="paymentMode"
          value="direct"
          checked={selected === "direct"}
          label={text.direct}
          description={text.directBody}
          detail={text.directDetail}
          onChange={() => onSelect("direct")}
        />
      </div>
    </fieldset>
  );
}
