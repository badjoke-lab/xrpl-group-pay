import { CheckCircle2, CircleDot, FlaskConical, Layers3 } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/localization/language-switcher";
import { NetworkBadge } from "@/components/ui/network-badge";
import { publicEnv } from "@/config/public-env";
import type { Locale, MessageKey } from "@/features/localization/catalog";
import { translatePublic } from "@/features/localization/public-copy";
import { getRequestLocale } from "@/features/localization/server";

export const metadata = {
  title: "Roadmap",
  description: "Current XRPL Group Pay availability and next work.",
};

const EN_SECTIONS = [
  {
    title: "Available now",
    icon: CheckCircle2,
    items: [
      "Public Mainnet bill creation in XRP or official RLUSD.",
      "Equal, custom amount, percentage, and shares-based splitting.",
      "A separate payment link for each participant, signed in Xaman.",
      "Direct payer-to-recipient settlement; Group Pay never holds funds.",
      "Validated-ledger verification, duplicate protection, and payment progress.",
    ],
  },
  {
    title: "RLUSD requirements",
    icon: CircleDot,
    items: [
      "The recipient account needs an RLUSD trust line before it can receive RLUSD.",
      "Each payer needs enough RLUSD for the payment and a small amount of XRP for network fees.",
      "The official Mainnet RLUSD issuer is fixed by the application and verified with every payment.",
    ],
  },
  {
    title: "Current work",
    icon: Layers3,
    items: [
      "Make RLUSD selection and readiness requirements unmistakable in the creator flow.",
      "Replace literal Japanese translations with natural product copy.",
      "Expand production UI checks to cover Japanese and RLUSD, not only the default XRP screen.",
      "Prepare Source Tag metrics, the pitch video, deck, and final Make Waves submission.",
    ],
  },
  {
    title: "Later",
    icon: FlaskConical,
    items: [
      "Additional tested XRPL wallet providers.",
      "Fiat-denominated accounting and versioned settlement quotes.",
      "Persistent groups, recurring expenses, settlement circles, and event collection.",
      "Additional assets only after issuer, liquidity, wallet, and verification reviews.",
    ],
  },
] as const;

const JA_SECTIONS = [
  {
    title: "現在使える機能",
    icon: CheckCircle2,
    items: [
      "MainnetでXRPまたはRLUSDの請求を作成できます。",
      "均等、個別金額、割合、比率の4通りで負担額を分けられます。",
      "参加者ごとに専用の支払いリンクを作成し、各自がXamanで署名します。",
      "資金は参加者から受取人へ直接送られ、Group Payが預かることはありません。",
      "XRPL上の着金確認、二重計上防止、支払い状況の確認に対応しています。",
    ],
  },
  {
    title: "RLUSDを使うための条件",
    icon: CircleDot,
    items: [
      "受取先アカウントには、あらかじめRLUSDのトラストラインが必要です。",
      "参加者は支払額分のRLUSDと、ネットワーク手数料用の少額のXRPを用意する必要があります。",
      "Mainnetの公式RLUSD発行元はアプリ側で固定し、支払い確認時にも照合します。",
    ],
  },
  {
    title: "現在の改善作業",
    icon: Layers3,
    items: [
      "RLUSDを選べることと、利用条件が一目で分かる画面に直します。",
      "直訳調だった日本語を、一般的なサービスで使われる自然な表現へ置き換えます。",
      "本番画面の確認対象を、XRPの初期画面だけでなく日本語とRLUSDまで広げます。",
      "Make Waves提出用の利用実績、動画、資料、証拠リンクをまとめます。",
    ],
  },
  {
    title: "今後の追加候補",
    icon: FlaskConical,
    items: [
      "Xaman以外のXRPLウォレットへの対応。",
      "日本円や米ドル表示での請求額入力と、送金時の換算表示。",
      "固定メンバー、定期的な支払い、期間ごとのまとめ精算。",
      "発行元や流動性、安全性を確認できた資産だけを追加。",
    ],
  },
] as const;

function sectionsFor(locale: Locale) {
  return locale === "ja" ? JA_SECTIONS : EN_SECTIONS;
}

export default async function RoadmapPage() {
  const locale = await getRequestLocale();
  const t = (
    key: MessageKey,
    variables?: Record<string, string | number>,
  ) => translatePublic(locale, key, variables);
  const sections = sectionsFor(locale);

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
          {t("roadmap.eyebrow")}
        </p>
        <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          {t("roadmap.title")}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          {t("roadmap.description")}
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {sections.map(({ title, icon: Icon, items }) => (
            <section
              key={title}
              className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-brand-subtle">
                  <Icon aria-hidden="true" className="size-5 text-brand" />
                </div>
                <h2 className="font-heading text-2xl font-semibold">{title}</h2>
              </div>
              <ul className="mt-6 space-y-3">
                {items.map((item) => (
                  <li key={item} className="flex gap-3 leading-7 text-muted">
                    <span
                      aria-hidden="true"
                      className="mt-3 size-1.5 shrink-0 rounded-full bg-action"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/bill" className="text-brand underline-offset-4 hover:underline">
            {t("home.cta.create", {
              network:
                publicEnv.NEXT_PUBLIC_APP_NETWORK === "mainnet" ? "Mainnet" : "Testnet",
            })}
          </Link>
          <Link
            href="/changelog"
            className="text-brand underline-offset-4 hover:underline"
          >
            {t("nav.changelog")}
          </Link>
          <a
            href="https://github.com/badjoke-lab/xrpl-group-pay/blob/main/ROADMAP.md"
            className="text-brand underline-offset-4 hover:underline"
          >
            {t("nav.source")}
          </a>
        </div>
      </div>
    </main>
  );
}
