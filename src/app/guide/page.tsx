import { ArrowLeft, CircleHelp, ExternalLink } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { GuideBrowser } from "@/components/guide/guide-browser";
import { LanguageSwitcher } from "@/components/localization/language-switcher";
import { buttonStyles } from "@/components/ui/button";
import { NetworkBadge } from "@/components/ui/network-badge";
import { publicEnv } from "@/config/public-env";
import { getGuideContent } from "@/features/guide/guide-content";
import { getRequestLocale } from "@/features/localization/server";

export const metadata = {
  title: "Guide",
  description:
    "How XRPL Group Pay coordinates direct XRP and official RLUSD settlement, wallet address entry, saved wallets, verification, progress, and safe recovery.",
};

const walletInputCopy = {
  en: {
    eyebrow: "Wallet address safety",
    title: "XRPL addresses are not Xaman-specific",
    body:
      "A recipient can receive through any compatible XRPL account-management wallet. This release uses Xaman for payer signing, so the account selected in Xaman must match the frozen expected payer address.",
    bullets: [
      "Use a self-controlled payer account. Exchange withdrawals may originate from a shared hot wallet and are not a supported PaymentSlot path.",
      "A manual transfer from another wallet may move funds without settling the intended PaymentSlot.",
      "Classic Addresses are checksum-validated. X-addresses are decoded and reviewed before the canonical address and optional recipient Destination Tag are applied.",
      "Clipboard assistance is optional. Direct typing and normal paste remain available.",
      "Saved wallets are optional input shortcuts stored only in this browser profile. They are not uploaded, synchronized, treated as identity proof, or allowed to bypass validation and readiness.",
      "Saved-wallet exports contain only the approved local address-book fields and exclude Bills, capabilities, amounts, provider requests, transactions, receipts, and proofs.",
    ],
    troubleshootingTitle: "Need help with an address or saved wallet?",
    troubleshootingBody:
      "Use the symptom-based troubleshooting page for invalid addresses, wrong-network X-addresses, clipboard permissions, missing saved wallets, storage limits, JSON imports, Xaman account mismatches, exchange withdrawals, manual transfers, and RLUSD readiness.",
    troubleshootingAction: "Open wallet help and troubleshooting",
  },
  ja: {
    eyebrow: "ウォレットアドレスの安全性",
    title: "XRPLアドレスはXaman専用ではありません",
    body:
      "受取人は、互換性のあるXRPLアカウント管理ウォレットで受け取れます。このリリースの支払者署名はXamanを使用するため、Xamanで選択するアカウントは固定済みの予定支払者アドレスと一致する必要があります。",
    bullets: [
      "支払者には本人が管理するアカウントを使用してください。取引所出金は共有ホットウォレットから送られる場合があり、対応済みのPaymentSlot経路ではありません。",
      "別ウォレットからの通常の手動送金は、資金が移動しても対象PaymentSlotを精算できない場合があります。",
      "Classic Addressはチェックサムを検証します。X-addressはネットワークとタグを確認し、Classic Addressと任意の受取先Destination Tagへ明示的に変換します。",
      "貼り付け補助は任意です。直接入力と通常の貼り付けは常に利用できます。",
      "保存済みウォレットは、このブラウザプロファイル内だけに置く任意の入力補助です。サーバー送信、端末間同期、本人確認、検証やreadinessの省略には使用しません。",
      "住所録の書き出しには許可されたローカル項目だけを含め、請求、Capability、金額、プロバイダー要求、取引、Receipt、Proofは含めません。",
    ],
    troubleshootingTitle: "アドレスや保存済みウォレットで困った場合",
    troubleshootingBody:
      "無効なアドレス、別ネットワークのX-address、クリップボード権限、保存記録が出ない状態、容量不足、JSON読み込み、Xamanのアカウント不一致、取引所出金、手動送金、RLUSD準備を症状別に確認できます。",
    troubleshootingAction: "ウォレットヘルプとトラブル対処を開く",
  },
  ko: {
    eyebrow: "지갑 주소 안전",
    title: "XRPL 주소는 Xaman 전용이 아닙니다",
    body:
      "수취인은 호환되는 XRPL 계정 관리 지갑으로 받을 수 있습니다. 이 릴리스는 결제자 서명에 Xaman을 사용하므로 Xaman에서 선택한 계정은 고정된 예상 결제자 주소와 일치해야 합니다.",
    bullets: [
      "결제자는 직접 관리하는 계정을 사용해야 합니다. 거래소 출금은 공유 핫월렛에서 전송될 수 있으며 지원되는 PaymentSlot 경로가 아닙니다.",
      "다른 지갑의 일반 수동 전송은 자금이 이동해도 의도한 PaymentSlot을 정산하지 못할 수 있습니다.",
      "Classic Address는 체크섬을 검증합니다. X-address는 네트워크와 태그를 검토한 뒤 Classic Address와 선택적 수취인 Destination Tag로 명시적으로 변환합니다.",
      "클립보드 보조는 선택 사항입니다. 직접 입력과 일반 붙여넣기는 항상 사용할 수 있습니다.",
      "저장된 지갑은 이 브라우저 프로필에만 보관되는 선택적 입력 보조입니다. 서버 업로드, 기기 간 동기화, 신원 증명 또는 검증과 readiness 우회에 사용되지 않습니다.",
      "주소록 내보내기에는 승인된 로컬 필드만 포함되며 청구, Capability, 금액, 공급자 요청, 거래, Receipt 및 Proof는 포함되지 않습니다.",
    ],
    troubleshootingTitle: "주소 또는 저장된 지갑에 문제가 있나요?",
    troubleshootingBody:
      "유효하지 않은 주소, 다른 네트워크 X-address, 클립보드 권한, 누락된 저장 기록, 저장소 제한, JSON 가져오기, Xaman 계정 불일치, 거래소 출금, 수동 전송 및 RLUSD readiness를 증상별로 확인할 수 있습니다.",
    troubleshootingAction: "지갑 도움말 및 문제 해결 열기",
  },
} as const;

export default async function GuidePage() {
  const locale = await getRequestLocale();
  const content = getGuideContent(locale);
  const walletInput = walletInputCopy[locale] ?? walletInputCopy.en;
  const network = publicEnv.NEXT_PUBLIC_APP_NETWORK;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <span className="whitespace-nowrap font-heading text-sm font-bold text-brand sm:text-base">
              XRPL Group Pay
            </span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <LanguageSwitcher compact />
            <NetworkBadge network={network} />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-5 pb-24 pt-10 sm:px-8 lg:px-10 lg:pt-14">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {content.homeLabel}
        </Link>

        <article className="mt-6 min-w-0">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-action">
            {content.eyebrow}
          </p>
          <h1 className="mt-3 max-w-4xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
            {content.description}
          </p>

          <aside
            data-guide-wallet-input
            className="mt-8 rounded-xl border border-brand/20 bg-brand-subtle p-5 sm:p-7"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-action">
              {walletInput.eyebrow}
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold">
              {walletInput.title}
            </h2>
            <p className="mt-3 max-w-4xl leading-7 text-foreground">
              {walletInput.body}
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
              {walletInput.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </aside>

          <aside className="mt-5 rounded-xl border border-warning/30 bg-warning-subtle p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background">
                <CircleHelp aria-hidden="true" className="size-5 text-warning" />
              </div>
              <div className="min-w-0">
                <h2 className="font-heading text-xl font-semibold">
                  {walletInput.troubleshootingTitle}
                </h2>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-muted">
                  {walletInput.troubleshootingBody}
                </p>
                <Link
                  href="/troubleshooting"
                  className={buttonStyles({ variant: "secondary", className: "mt-4" })}
                >
                  <CircleHelp aria-hidden="true" className="size-4" />
                  {walletInput.troubleshootingAction}
                </Link>
              </div>
            </div>
          </aside>

          <GuideBrowser content={content} />

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className={buttonStyles({ variant: "secondary" })}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              {content.homeLabel}
            </Link>
            <a
              href="/guide#overview"
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className={buttonStyles({ variant: "ghost" })}
            >
              {content.openInNewTabLabel}
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          </div>
        </article>
      </div>
    </main>
  );
}
