import { CircleAlert, GitCommitHorizontal, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/localization/language-switcher";
import { NetworkBadge } from "@/components/ui/network-badge";
import { publicEnv } from "@/config/public-env";
import { translate } from "@/features/localization/catalog";
import { getRequestLocale } from "@/features/localization/server";

export const metadata = {
  title: "Changelog",
  description: "Meaningful XRPL Group Pay product and security changes.",
};

const entries = [
  {
    date: "2026-06-29",
    title: "Validated-ledger replacement reconciliation",
    kind: "Security",
    icon: ShieldCheck,
    body: [
      "Reviews the expected payer's validated account history before replacing a previous Wallet Handoff.",
      "Settles one exact existing payment, sends multiple exact payments to durable review, and fails closed when history is incomplete.",
      "Keeps InvoiceID as candidate discovery only; every candidate still passes the complete frozen Payment verification contract.",
    ],
  },
  {
    date: "2026-06-29",
    title: "One-shot Xaman payment handoffs",
    kind: "Security",
    icon: ShieldCheck,
    body: [
      "Pinned the expected payer Account and one validated XRPL Sequence into every provider-created Payment.",
      "Added a bounded LastLedgerSequence so stale signing requests fail closed.",
      "Recorded the controlled Mainnet RLUSD duplicate-transfer incident as a release blocker without exposing private operator material.",
    ],
  },
  {
    date: "2026-06-29",
    title: "Controlled Mainnet XRP acceptance",
    kind: "Release evidence",
    icon: GitCommitHorizontal,
    body: [
      "Verified a one-drop XRP Payment on XRPL Mainnet with the assigned Source Tag and frozen InvoiceID.",
      "Recorded the durable receipt and public proof digest.",
      "Confirmed duplicate settlement prevention, cross-slot replay rejection, and halted restoration.",
    ],
  },
  {
    date: "2026-06-25",
    title: "Deterministic allocation and Asset-aware Bills",
    kind: "Product",
    icon: GitCommitHorizontal,
    body: [
      "Added Equal, Percentage, Shares, and Custom Amount allocation strategies.",
      "Added explicit remainder assignment and immutable allocation records.",
      "Added XRP or official RLUSD selection with fixed-precision Asset units across every PaymentSlot.",
    ],
  },
  {
    date: "2026-06-24",
    title: "Initial end-to-end Testnet product",
    kind: "Product",
    icon: GitCommitHorizontal,
    body: [
      "Added Bill creation, participant capabilities, Xaman signing, validated-ledger verification, D1 receipts, atomic progress updates, and public XRP proof.",
      "Added creator review, participant final confirmation, responsive payer views, and desktop creator views.",
    ],
  },
] as const;

export default async function ChangelogPage() {
  const locale = await getRequestLocale();
  const t = (
    key: Parameters<typeof translate>[1],
    variables?: Record<string, string | number>,
  ) => translate(locale, key, variables);

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

        <section className="mt-8 rounded-xl border border-action/30 bg-action/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 size-6 shrink-0 text-action"
            />
            <div>
              <h2 className="font-semibold text-action">
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
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm font-semibold">
          <Link
            href="/roadmap"
            className="text-brand underline-offset-4 hover:underline"
          >
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
