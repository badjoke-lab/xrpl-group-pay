import { CheckCircle2, GitCommitHorizontal, ShieldCheck } from "lucide-react";
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
  description: "XRPL Group Pay product and security changes.",
};

type Entry = {
  date: string;
  title: string;
  kind: string;
  icon: typeof CheckCircle2;
  body: readonly string[];
};

const EN_ENTRIES: readonly Entry[] = [
  {
    date: "2026-07-01",
    title: "Public Mainnet release and creator UI improvements",
    kind: "Release",
    icon: CheckCircle2,
    body: [
      "Published the reviewed Mainnet runtime with bill creation and payment verification enabled.",
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
    title: "Flexible bill splitting",
    kind: "Product",
    icon: GitCommitHorizontal,
    body: [
      "Added equal, custom amount, percentage, and shares-based splitting.",
      "Added XRP and official RLUSD as selectable payment assets.",
    ],
  },
];

const JA_ENTRIES: readonly Entry[] = [
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
      "支払い通貨としてXRPと公式RLUSDを選べるようにしました。",
    ],
  },
];

function entriesFor(locale: Locale) {
  return locale === "ja" ? JA_ENTRIES : EN_ENTRIES;
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
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-success" />
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
          {entries.map(({ date, title, kind, icon: Icon, body }) => (
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
                    <h2 className="mt-1 font-heading text-2xl font-semibold">{title}</h2>
                  </div>
                </div>
                <time className="text-sm font-semibold text-muted">{date}</time>
              </div>
              <ul className="mt-6 space-y-3">
                {body.map((item) => (
                  <li key={item} className="flex gap-3 leading-7 text-muted">
                    <span aria-hidden="true" className="mt-3 size-1.5 shrink-0 rounded-full bg-action" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/roadmap" className="text-brand underline-offset-4 hover:underline">
            {t("nav.roadmap")}
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
