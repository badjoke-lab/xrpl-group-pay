import {
  ArrowRight,
  Check,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/localization/language-switcher";
import { PaymentPreview } from "@/components/payment/payment-preview";
import { buttonStyles } from "@/components/ui/button";
import { NetworkBadge } from "@/components/ui/network-badge";
import { resolvePaymentOperations } from "@/config/payment-operations";
import { publicEnv } from "@/config/public-env";
import { translate } from "@/features/localization/catalog";
import { getRequestLocale } from "@/features/localization/server";

export default async function Home() {
  const locale = await getRequestLocale();
  const t = (
    key: Parameters<typeof translate>[1],
    variables?: Record<string, string | number>,
  ) => translate(locale, key, variables);
  const network = publicEnv.NEXT_PUBLIC_APP_NETWORK;
  const operations = resolvePaymentOperations(process.env);
  const releaseMode = process.env.MAINNET_RELEASE_MODE ?? "disabled";
  const publicCreationEnabled =
    network === "testnet" ||
    (["limited", "public"].includes(releaseMode) && operations.creationEnabled);
  const networkLabel = network === "mainnet" ? "Mainnet" : "Testnet";
  const principles = [
    {
      icon: WalletCards,
      title: t("home.principle.approve.title"),
      body: t("home.principle.approve.body"),
    },
    {
      icon: ShieldCheck,
      title: t("home.principle.direct.title"),
      body: t("home.principle.direct.body"),
    },
    {
      icon: Check,
      title: t("home.principle.verify.title"),
      body: t("home.principle.verify.body"),
    },
  ];
  const steps = [
    ["01", t("home.step.create.title"), t("home.step.create.body")],
    ["02", t("home.step.sign.title"), t("home.step.sign.body")],
    ["03", t("home.step.verify.title"), t("home.step.verify.body")],
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <BrandMark />
          <span className="font-heading text-lg font-bold text-brand">
            XRPL Group Pay
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-4">
          <nav className="hidden items-center gap-4 text-sm font-semibold md:flex">
            <Link href="/roadmap" className="text-muted hover:text-foreground">
              {t("nav.roadmap")}
            </Link>
            <Link href="/changelog" className="text-muted hover:text-foreground">
              {t("nav.changelog")}
            </Link>
          </nav>
          <LanguageSwitcher compact />
          <NetworkBadge network={network} />
        </div>
      </header>

      <section className="relative mx-auto grid w-full max-w-7xl gap-14 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-20">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-pill border border-brand/15 bg-brand-subtle px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-brand">
            <Users aria-hidden="true" className="size-4" />
            {t("home.eyebrow")}
          </p>
          <h1 className="font-heading text-5xl font-bold leading-[1.03] tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl">
            {t("home.title")}
            <span className="block text-brand">{t("home.titleAccent")}</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted sm:text-xl">
            {t("home.description", { network: networkLabel })}
          </p>

          {!publicCreationEnabled && network === "mainnet" && (
            <p className="mt-5 max-w-xl rounded-lg border border-action/25 bg-action/10 px-4 py-3 text-sm leading-6 text-foreground">
              {t("home.halted")}
            </p>
          )}

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/bill" className={buttonStyles({ className: "min-h-13" })}>
              {publicCreationEnabled
                ? t("home.cta.create", { network: networkLabel })
                : t("home.cta.status")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <a
              href="https://github.com/badjoke-lab/xrpl-group-pay/tree/main/docs"
              className={buttonStyles({
                variant: "secondary",
                className: "min-h-13",
              })}
            >
              {t("home.cta.docs")}
            </a>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {principles.map(({ icon: Icon, title, body }) => (
              <article key={title} className="border-l-2 border-border pl-4">
                <Icon aria-hidden="true" className="mb-3 size-5 text-brand" />
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-20 size-80 rounded-full bg-action/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-20 -left-20 size-72 rounded-full bg-brand/10 blur-3xl"
          />
          <PaymentPreview
            billTitle="XRPL Meetup Dinner"
            amount="4"
            recipient="rABC…9XYZ"
            network={network}
          />
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-3 lg:px-10">
          {steps.map(([number, title, body]) => (
            <article key={number} className="flex gap-4">
              <span className="font-heading text-sm font-bold text-action">{number}</span>
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  {title}
                </h2>
                <p className="mt-1 leading-7 text-muted">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>{t("home.footer")}</p>
          <div className="flex gap-5 font-semibold">
            <Link href="/roadmap" className="hover:text-foreground">
              {t("nav.roadmap")}
            </Link>
            <Link href="/changelog" className="hover:text-foreground">
              {t("nav.changelog")}
            </Link>
            <a
              href="https://github.com/badjoke-lab/xrpl-group-pay"
              className="hover:text-foreground"
            >
              {t("nav.source")}
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
