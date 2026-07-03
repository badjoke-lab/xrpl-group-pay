"use client";

import { ClipboardPaste, CircleHelp, Replace } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { XrplNetwork } from "@/features/assets/types";
import { useLocalization } from "@/features/localization/provider";
import {
  inspectXrplAddressInput,
  type XrplAddressRole,
} from "@/features/xrpl/address-input";

import { BillFormField } from "./bill-form-controls";
import { SavedWalletPicker } from "./saved-wallet-picker";

const copy = {
  en: {
    paste: "Paste",
    pasting: "Reading clipboard",
    pasteFailed: "Clipboard access failed. You can still type or paste directly.",
    pasted: "Address pasted and checked.",
    invalid: "Enter a valid XRPL Classic Address or X-address.",
    networkMismatch: "This X-address belongs to a different XRPL network.",
    payerTag:
      "A payer address cannot use an embedded Destination Tag. Use the payer's Classic Address.",
    tagConflict:
      "The X-address Destination Tag conflicts with the tag already entered for this recipient.",
    decodedTitle: "X-address decoded",
    decodedAddress: "Classic Address",
    decodedTag: "Destination Tag",
    noTag: "None",
    encodedNetwork: "Encoded network",
    useDecoded: "Use decoded address",
    recipientNote:
      "The recipient may use any compatible XRPL wallet. Xaman is not required to receive funds.",
    payerNote:
      "Payment uses Xaman in this release. The account selected in Xaman must match this address. Exchange withdrawals and ordinary manual transfers are not supported settlement paths.",
    helpLink: "Address and saved-wallet help",
  },
  ja: {
    paste: "貼り付け",
    pasting: "クリップボードを確認中",
    pasteFailed:
      "クリップボードを読み取れませんでした。直接入力または通常の貼り付けは引き続き利用できます。",
    pasted: "アドレスを貼り付けて確認しました。",
    invalid: "有効なXRPL Classic AddressまたはX-addressを入力してください。",
    networkMismatch: "このX-addressは現在とは異なるXRPLネットワーク用です。",
    payerTag:
      "支払者アドレスにDestination Tagを含めることはできません。支払者のClassic Addressを使用してください。",
    tagConflict:
      "X-address内のDestination Tagが、すでに入力されている受取先タグと一致しません。",
    decodedTitle: "X-addressの変換内容",
    decodedAddress: "Classic Address",
    decodedTag: "Destination Tag",
    noTag: "なし",
    encodedNetwork: "対象ネットワーク",
    useDecoded: "変換したアドレスを使用",
    recipientNote:
      "受取人はXaman以外の互換XRPLウォレットでも受け取れます。受け取りにXamanは必須ではありません。",
    payerNote:
      "このリリースの支払い操作はXaman対応です。Xamanで選ぶアカウントはこのアドレスと一致する必要があります。取引所出金や通常の手動送金は対応済みの精算経路ではありません。",
    helpLink: "アドレスと保存済みウォレットのヘルプ",
  },
  ko: {
    paste: "붙여넣기",
    pasting: "클립보드 확인 중",
    pasteFailed:
      "클립보드에 접근하지 못했습니다. 직접 입력하거나 일반 붙여넣기는 계속 사용할 수 있습니다.",
    pasted: "주소를 붙여넣고 확인했습니다.",
    invalid: "유효한 XRPL Classic Address 또는 X-address를 입력하세요.",
    networkMismatch: "이 X-address는 현재와 다른 XRPL 네트워크용입니다.",
    payerTag:
      "결제자 주소에는 Destination Tag를 포함할 수 없습니다. 결제자의 Classic Address를 사용하세요.",
    tagConflict:
      "X-address의 Destination Tag가 이미 입력된 수취인 태그와 일치하지 않습니다.",
    decodedTitle: "X-address 변환 내용",
    decodedAddress: "Classic Address",
    decodedTag: "Destination Tag",
    noTag: "없음",
    encodedNetwork: "대상 네트워크",
    useDecoded: "변환된 주소 사용",
    recipientNote:
      "수취인은 Xaman 이외의 호환 XRPL 지갑으로도 받을 수 있습니다. 수취에 Xaman은 필수가 아닙니다.",
    payerNote:
      "이 릴리스의 결제 동작은 Xaman을 지원합니다. Xaman에서 선택한 계정은 이 주소와 일치해야 합니다. 거래소 출금이나 일반 수동 전송은 지원되는 정산 경로가 아닙니다.",
    helpLink: "주소 및 저장된 지갑 도움말",
  },
} as const;

export function XrplAddressField({
  label,
  labelAction,
  description,
  value,
  displayLabel = "",
  role,
  network,
  destinationTag,
  error,
  onChangeAddress,
  onChangeDisplayLabel,
  onChangeDestinationTag,
}: {
  label: string;
  labelAction?: ReactNode;
  description?: string;
  value: string;
  displayLabel?: string;
  role: XrplAddressRole;
  network: XrplNetwork;
  destinationTag?: string | null;
  error?: string | null;
  onChangeAddress(value: string): void;
  onChangeDisplayLabel?(value: string): void;
  onChangeDestinationTag?(value: string): void;
}) {
  const { locale } = useLocalization();
  const text = copy[locale] ?? copy.en;
  const [clipboardStatus, setClipboardStatus] = useState<
    "idle" | "reading" | "success" | "failed"
  >("idle");

  const inspection = inspectXrplAddressInput({
    value,
    network,
    role,
    destinationTag,
  });

  const inspectionError =
    inspection.status === "invalid"
      ? text.invalid
      : inspection.status === "network_mismatch"
        ? text.networkMismatch
        : inspection.status === "payer_tag_not_allowed"
          ? text.payerTag
          : inspection.status === "destination_tag_conflict"
            ? text.tagConflict
            : null;

  async function pasteFromClipboard() {
    setClipboardStatus("reading");
    try {
      if (!navigator.clipboard?.readText) throw new Error("clipboard unavailable");
      const nextValue = (await navigator.clipboard.readText()).trim();
      onChangeAddress(nextValue);
      setClipboardStatus("success");
    } catch {
      setClipboardStatus("failed");
    }
  }

  function applyDecodedAddress() {
    if (!inspection.classicAddress || inspection.status !== "xaddress_review") return;
    onChangeAddress(inspection.classicAddress);
    if (role === "recipient" && inspection.destinationTag !== null) {
      onChangeDestinationTag?.(inspection.destinationTag);
    }
  }

  return (
    <div className="min-w-0">
      <BillFormField
        label={label}
        labelAction={labelAction}
        description={description}
        value={value}
        onChange={(nextValue) => {
          setClipboardStatus("idle");
          onChangeAddress(nextValue);
        }}
        placeholder="r... or X-address"
        required
        mono
        error={error ?? inspectionError}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => void pasteFromClipboard()}
          disabled={clipboardStatus === "reading"}
          className="min-h-9 px-3 py-1.5 text-sm"
        >
          <ClipboardPaste aria-hidden="true" className="size-4" />
          {clipboardStatus === "reading" ? text.pasting : text.paste}
        </Button>
        <SavedWalletPicker
          role={role}
          network={network}
          currentLabel={displayLabel}
          currentAddress={value}
          currentDestinationTag={destinationTag}
          onSelect={(record) => {
            onChangeDisplayLabel?.(record.label);
            onChangeAddress(record.classicAddress);
            if (role === "recipient") {
              onChangeDestinationTag?.(record.destinationTag ?? "");
            }
          }}
        />
        {clipboardStatus === "success" && (
          <span role="status" className="text-xs font-semibold text-success">
            {text.pasted}
          </span>
        )}
        {clipboardStatus === "failed" && (
          <span role="status" className="text-xs leading-5 text-warning">
            {text.pasteFailed}
          </span>
        )}
      </div>

      {inspection.status === "xaddress_review" && inspection.classicAddress && (
        <div className="mt-3 rounded-lg border border-warning/30 bg-warning-subtle p-4">
          <p className="font-semibold">{text.decodedTitle}</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs font-semibold text-muted">{text.decodedAddress}</dt>
              <dd className="mt-1 break-all font-mono">{inspection.classicAddress}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted">{text.decodedTag}</dt>
              <dd className="mt-1 font-mono">
                {inspection.destinationTag ?? text.noTag}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted">{text.encodedNetwork}</dt>
              <dd className="mt-1 font-semibold">{inspection.encodedNetwork}</dd>
            </div>
          </dl>
          <Button
            type="button"
            variant="secondary"
            onClick={applyDecodedAddress}
            className="mt-3 w-full sm:w-auto"
          >
            <Replace aria-hidden="true" className="size-4" />
            {text.useDecoded}
          </Button>
        </div>
      )}

      <p className="mt-2 text-xs leading-5 text-muted">
        {role === "recipient" ? text.recipientNote : text.payerNote}
      </p>
      <Link
        href="/troubleshooting#wallet-addresses"
        className="mt-1 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-brand underline-offset-4 hover:underline"
      >
        <CircleHelp aria-hidden="true" className="size-3.5" />
        {text.helpLink}
      </Link>
    </div>
  );
}
