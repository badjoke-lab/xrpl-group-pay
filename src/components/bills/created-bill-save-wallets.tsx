"use client";

import { Check, UserRoundPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { CreatedBill } from "@/features/bills/types";
import { useLocalization } from "@/features/localization/provider";
import { saveSavedWallet } from "@/features/saved-wallets/saved-wallets";

const copy = {
  en: {
    title: "Reuse these wallets next time",
    body:
      "Save the recipient and payer labels in this browser only. Bill links, capabilities, amounts, and transaction data are not stored in the address book.",
    action: "Save wallets used in this Bill",
    saving: "Saving wallets",
    saved: (count: number) =>
      `${count} wallet${count === 1 ? "" : "s"} saved locally.`,
    failed:
      "Saved wallets are unavailable. The Bill is already created and direct address entry still works.",
    unnamedRecipient: "Recipient",
    unnamedPayer: (number: number) => `Payer ${number}`,
  },
  ja: {
    title: "次回もこの相手を使う",
    body:
      "受取人と支払者のラベルを、このブラウザ内だけに保存します。請求リンク、Capability、金額、取引データは住所録へ保存しません。",
    action: "今回のウォレットを保存",
    saving: "ウォレットを保存中",
    saved: (count: number) =>
      `${count}件のウォレットをブラウザ内に保存しました。`,
    failed:
      "保存済みウォレットを利用できません。請求はすでに作成済みで、アドレスの直接入力は引き続き使えます。",
    unnamedRecipient: "受取人",
    unnamedPayer: (number: number) => `支払者 ${number}`,
  },
  ko: {
    title: "다음에도 이 지갑 사용",
    body:
      "수취인과 결제자 레이블을 이 브라우저에만 저장합니다. 청구 링크, Capability, 금액 및 거래 데이터는 주소록에 저장하지 않습니다.",
    action: "이 청구의 지갑 저장",
    saving: "지갑 저장 중",
    saved: (count: number) =>
      `${count}개의 지갑을 브라우저에 저장했습니다.`,
    failed:
      "저장된 지갑을 사용할 수 없습니다. 청구는 이미 생성되었으며 주소 직접 입력은 계속 사용할 수 있습니다.",
    unnamedRecipient: "수취인",
    unnamedPayer: (number: number) => `결제자 ${number}`,
  },
} as const;

export function CreatedBillSaveWallets({ created }: { created: CreatedBill }) {
  const { locale } = useLocalization();
  const text = copy[locale] ?? copy.en;
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">(
    "idle",
  );
  const [savedCount, setSavedCount] = useState(0);

  async function saveAll() {
    setStatus("saving");
    try {
      let count = 0;
      await saveSavedWallet({
        label: created.bill.recipientLabel.trim() || text.unnamedRecipient,
        classicAddress: created.bill.destinationAddress,
        destinationTag:
          created.bill.destinationTag === null
            ? null
            : String(created.bill.destinationTag),
        role: "recipient",
        network: created.bill.network,
        favorite: false,
      });
      count += 1;

      for (const [index, slot] of created.slots.entries()) {
        await saveSavedWallet({
          label: slot.participantLabel.trim() || text.unnamedPayer(index + 1),
          classicAddress: slot.expectedPayerAddress,
          destinationTag: null,
          role: "payer",
          network: created.bill.network,
          favorite: false,
        });
        count += 1;
      }

      setSavedCount(count);
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-brand/20 bg-brand-subtle p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-semibold">{text.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{text.body}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void saveAll()}
          disabled={status === "saving" || status === "saved"}
          className="shrink-0"
        >
          {status === "saved" ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <UserRoundPlus aria-hidden="true" className="size-4" />
          )}
          {status === "saving" ? text.saving : text.action}
        </Button>
      </div>
      {status === "saved" && (
        <p role="status" className="mt-3 text-sm font-semibold text-success">
          {text.saved(savedCount)}
        </p>
      )}
      {status === "failed" && (
        <p role="alert" className="mt-3 text-sm font-semibold text-warning">
          {text.failed}
        </p>
      )}
    </section>
  );
}
