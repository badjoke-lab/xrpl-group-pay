import {
  CheckCircle2,
  GitCommitHorizontal,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/localization/language-switcher";
import { NetworkBadge } from "@/components/ui/network-badge";
import { publicEnv } from "@/config/public-env";
import type { Locale, MessageKey } from "@/features/localization/catalog";
import { translatePublic } from "@/features/localization/public-copy";
import { getRequestLocale } from "@/features/localization/server";

export const metadata = {
  title: "Changelog",
  description: "XRPL Group Pay product, reliability, and security changes.",
};

type Entry = {
  date: string;
  title: string;
  kind: string;
  icon: typeof CheckCircle2;
  body: readonly string[];
  helpHref?: string;
  helpLabel?: string;
};

const EN_ENTRIES: readonly Entry[] = [
  {
    date: "2026-07-03",
    title: "Safer wallet entry, saved wallets, and troubleshooting",
    kind: "Product and reliability",
    icon: Wrench,
    body: [
      "Added Classic Address checksum validation and explicit X-address review for network and Destination Tag conflicts.",
      "Added browser-local saved wallets with role and network filtering, search, favorites, recent use, editing, deletion, JSON export, and validated import.",
      "Saved-wallet failure never blocks direct address entry, and local records are not uploaded, synchronized, or treated as identity proof.",
      "Improved duplicate address and role handling, legacy empty-label handling, storage-unavailable fallback, and invalid-import recovery.",
      "Added symptom-based help for clipboard permissions, missing saved records, Xaman account mismatch, exchange or manual transfers, and RLUSD readiness.",
    ],
    helpHref: "/troubleshooting",
    helpLabel: "Open wallet help and troubleshooting",
  },
  {
    date: "2026-07-01",
    title: "Public Mainnet release and creator UI improvements",
    kind: "Release",
    icon: CheckCircle2,
    body: [
      "Published the reviewed Mainnet runtime with Bill creation and payment verification enabled.",
      "Improved the mobile layout and changed participant forms into compact expandable cards.",
      "Added production screenshots at mobile and desktop widths with overflow checks.",
    ],
  },
  {
    date: "2026-06-30",
    title: "Mainnet XRP and RLUSD acceptance completed",
    kind: "Verification",
    icon: GitCommitHorizontal,
    body: [
      "Completed controlled Mainnet checks for XRP and official RLUSD.",
      "Confirmed ledger verification, durable receipts, duplicate protection, and replay protection.",
    ],
  },
  {
    date: "2026-06-29",
    title: "Safer Xaman payment requests",
    kind: "Security",
    icon: ShieldCheck,
    body: [
      "Bound each request to the expected payer and one XRPL Sequence.",
      "Added an expiry window and a ledger check before replacing an interrupted request.",
    ],
  },
  {
    date: "2026-06-25",
    title: "Flexible Bill splitting",
    kind: "Product",
    icon: GitCommitHorizontal,
    body: [
      "Added equal, custom amount, percentage, and shares-based splitting.",
      "Added XRP and official RLUSD as selectable payment Assets.",
    ],
  },
];

const JA_ENTRIES: readonly Entry[] = [
  {
    date: "2026-07-03",
    title: "アドレス入力の安全化、保存済みウォレット、トラブル対処を追加",
    kind: "機能追加・安定性",
    icon: Wrench,
    body: [
      "Classic Addressのチェックサム検証と、X-addressのネットワーク・Destination Tag競合確認を追加しました。",
      "ブラウザ内だけに保存するウォレット住所録へ、用途・ネットワーク絞り込み、検索、お気に入り、最近使用、編集、削除、JSON書き出し、検証付き読み込みを追加しました。",
      "住所録を利用できない場合もアドレスの直接入力は継続でき、ローカル記録をサーバー送信、端末間同期、本人確認には使用しません。",
      "同一アドレスの用途統合、旧データの空ラベル、保存領域を利用できない状態、無効な読み込みファイルの処理を改善しました。",
      "クリップボード権限、保存記録が出ない状態、Xamanのアカウント不一致、取引所出金・手動送金、RLUSD準備を症状別に確認できるページを追加しました。",
    ],
    helpHref: "/troubleshooting",
    helpLabel: "ウォレットヘルプとトラブル対処を開く",
  },
  {
    date: "2026-07-01",
    title: "Mainnet版を公開し、請求作成画面を改善",
    kind: "公開",
    icon: CheckCircle2,
    body: [
      "Mainnetで請求作成と支払い確認を利用できる状態にしました。",
      "スマートフォンでの表示崩れを直し、参加者入力を折りたたみ式に変更しました。",
      "スマートフォンとPCの本番画面を自動確認する仕組みを追加しました。",
    ],
  },
  {
    date: "2026-06-30",
    title: "XRPとRLUSDのMainnet確認を完了",
    kind: "動作確認",
    icon: GitCommitHorizontal,
    body: [
      "Mainnet上でXRPと公式RLUSDの支払い確認を行いました。",
      "着金確認、記録保存、二重計上防止、リンクの使い回し防止を確認しました。",
    ],
  },
  {
    date: "2026-06-29",
    title: "Xamanの支払いリクエストを安全化",
    kind: "安全性",
    icon: ShieldCheck,
    body: [
      "支払うウォレットと1回分のSequenceを支払いリクエストへ固定しました。",
      "古いリクエストの期限と、再作成前のXRPL確認を追加しました。",
    ],
  },
  {
    date: "2026-06-25",
    title: "4通りの割り勘方法に対応",
    kind: "機能追加",
    icon: GitCommitHorizontal,
    body: [
      "均等、個別金額、割合、比率で負担額を分けられるようにしました。",
      "支払い資産としてXRPと公式RLUSDを選べるようにしました。",
    ],
  },
];

const KO_ENTRIES: readonly Entry[] = [
  {
    date: "2026-07-03",
    title: "안전한 주소 입력, 저장된 지갑 및 문제 해결 추가",
    kind: "제품 및 안정성",
    icon: Wrench,
    body: [
      "Classic Address 체크섬 검증과 X-address 네트워크 및 Destination Tag 충돌 검토를 추가했습니다.",
      "브라우저 로컬 저장 지갑에 역할·네트워크 필터, 검색, 즐겨찾기, 최근 사용, 편집, 삭제, JSON 내보내기 및 검증된 가져오기를 추가했습니다.",
      "저장소를 사용할 수 없어도 직접 주소 입력은 계속되며 로컬 기록은 업로드, 기기 간 동기화 또는 신원 증명에 사용되지 않습니다.",
      "중복 주소와 역할 통합, 이전 데이터의 빈 레이블, 저장소 사용 불가 및 잘못된 가져오기 복구를 개선했습니다.",
      "클립보드 권한, 누락된 저장 기록, Xaman 계정 불일치, 거래소·수동 전송 및 RLUSD readiness를 증상별로 확인하는 페이지를 추가했습니다.",
    ],
    helpHref: "/troubleshooting",
    helpLabel: "지갑 도움말 및 문제 해결 열기",
  },
  {
    date: "2026-07-01",
    title: "공개 Mainnet 릴리스 및 청구 생성 UI 개선",
    kind: "릴리스",
    icon: CheckCircle2,
    body: [
      "검토된 Mainnet 런타임에서 청구 생성과 결제 검증을 활성화했습니다.",
      "모바일 레이아웃을 개선하고 결제자 입력을 확장형 카드로 변경했습니다.",
      "모바일과 데스크톱 실제 화면의 오버플로 자동 검사를 추가했습니다.",
    ],
  },
  {
    date: "2026-06-30",
    title: "Mainnet XRP 및 RLUSD 승인 완료",
    kind: "검증",
    icon: GitCommitHorizontal,
    body: [
      "Mainnet에서 XRP와 공식 RLUSD를 통제된 방식으로 확인했습니다.",
      "원장 검증, 영구 영수증, 중복 방지 및 재사용 방지를 확인했습니다.",
    ],
  },
  {
    date: "2026-06-29",
    title: "더 안전한 Xaman 결제 요청",
    kind: "보안",
    icon: ShieldCheck,
    body: [
      "각 요청을 예상 결제자와 하나의 XRPL Sequence에 고정했습니다.",
      "중단된 요청을 교체하기 전에 만료 범위와 원장 확인을 추가했습니다.",
    ],
  },
  {
    date: "2026-06-25",
    title: "유연한 청구 분할",
    kind: "제품",
    icon: GitCommitHorizontal,
    body: [
      "균등, 개별 금액, 비율 및 지분 기반 분할을 추가했습니다.",
      "결제 자산으로 XRP와 공식 RLUSD를 선택할 수 있게 했습니다.",
    ],
  },
];

function entriesFor(locale: Locale) {
  if (locale === "ja") return JA_ENTRIES;
  if (locale === "ko") return KO_ENTRIES;
  return EN_ENTRIES;
}

export default async function ChangelogPage() {
  const locale = await getRequestLocale();
  const t = (
    key: MessageKey,
    variables?: Record<string, string | number>,
  ) => translatePublic(locale, key, variables);
  const entries = entriesFor(locale);

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark />
          <span className="font-heading font-bold text-brand">XRPL Group Pay</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <LanguageSwitcher compact />
          <NetworkBadge network={publicEnv.NEXT_PUBLIC_APP_NETWORK} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8 sm:px-8 sm:pt-14">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
          {t("changelog.eyebrow")}
        </p>
        <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          {t("changelog.title")}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          {t("changelog.description")}
        </p>

        <section className="mt-8 rounded-xl border border-success/30 bg-success/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 size-6 shrink-0 text-success"
            />
            <div>
              <h2 className="font-semibold text-success">
                {t("changelog.status.title")}
              </h2>
              <p className="mt-1 leading-7 text-foreground">
                {t("changelog.status.body")}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-10 space-y-6">
          {entries.map(
            ({ date, title, kind, icon: Icon, body, helpHref, helpLabel }) => (
              <article
                key={`${date}:${title}`}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle">
                      <Icon aria-hidden="true" className="size-5 text-brand" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-action">
                        {kind}
                      </p>
                      <h2 className="mt-1 font-heading text-2xl font-semibold">
                        {title}
                      </h2>
                    </div>
                  </div>
                  <time className="text-sm font-semibold text-muted">{date}</time>
                </div>
                <ul className="mt-6 space-y-3">
                  {body.map((item) => (
                    <li key={item} className="flex gap-3 leading-7 text-muted">
                      <span
                        aria-hidden="true"
                        className="mt-3 size-1.5 shrink-0 rounded-full bg-action"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {helpHref && helpLabel ? (
                  <Link
                    href={helpHref}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline-offset-4 hover:underline"
                  >
                    <Wrench aria-hidden="true" className="size-4" />
                    {helpLabel}
                  </Link>
                ) : null}
              </article>
            ),
          )}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/roadmap" className="text-brand underline-offset-4 hover:underline">
            {t("nav.roadmap")}
          </Link>
          <Link
            href="/troubleshooting"
            className="text-brand underline-offset-4 hover:underline"
          >
            {locale === "ja"
              ? "トラブル対処"
              : locale === "ko"
                ? "문제 해결"
                : "Troubleshooting"}
          </Link>
          <a
            href="https://github.com/badjoke-lab/xrpl-group-pay/blob/main/CHANGELOG.md"
            className="text-brand underline-offset-4 hover:underline"
          >
            {t("nav.source")}
          </a>
        </div>
      </div>
    </main>
  );
}
