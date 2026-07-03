import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  History,
  ShieldCheck,
  WalletCards,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/localization/language-switcher";
import { buttonStyles } from "@/components/ui/button";
import { NetworkBadge } from "@/components/ui/network-badge";
import { publicEnv } from "@/config/public-env";
import { getWalletHelpContent } from "@/features/help/wallet-help-content";
import { getRequestLocale } from "@/features/localization/server";

export const metadata = {
  title: "Wallet Help and Troubleshooting",
  description:
    "How to enter XRPL addresses, use browser-local saved wallets, and resolve X-address, Xaman, storage, import, and RLUSD readiness problems.",
};

export default async function TroubleshootingPage() {
  const locale = await getRequestLocale();
  const content = getWalletHelpContent(locale);
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
        <div className="flex flex-wrap gap-3">
          <Link
            href="/guide"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {content.backToGuide}
          </Link>
          <Link
            href="/changelog"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
          >
            <History aria-hidden="true" className="size-4" />
            {content.changelogLabel}
          </Link>
        </div>

        <article className="mt-6 min-w-0">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-action">
            {content.eyebrow}
          </p>
          <h1 className="mt-3 max-w-5xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-muted">
            {content.description}
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <nav
                aria-label={content.contentsLabel}
                className="rounded-xl border border-border bg-surface p-5 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  {content.contentsLabel}
                </p>
                <ol className="mt-4 space-y-2 text-sm">
                  <li>
                    <a
                      href="#wallet-addresses"
                      className="block rounded-md px-3 py-2 font-semibold text-muted outline-none hover:bg-brand-subtle hover:text-brand focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      {content.quickStartTitle}
                    </a>
                  </li>
                  <li>
                    <a
                      href="#saved-wallets"
                      className="block rounded-md px-3 py-2 font-semibold text-muted outline-none hover:bg-brand-subtle hover:text-brand focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      {content.savedWalletTitle}
                    </a>
                  </li>
                  <li>
                    <a
                      href="#local-storage"
                      className="block rounded-md px-3 py-2 font-semibold text-muted outline-none hover:bg-brand-subtle hover:text-brand focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      {content.localOnlyTitle}
                    </a>
                  </li>
                  {content.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block rounded-md px-3 py-2 font-semibold text-muted outline-none hover:bg-brand-subtle hover:text-brand focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <div className="min-w-0 space-y-6">
              <section
                id="wallet-addresses"
                tabIndex={-1}
                className="scroll-mt-6 rounded-xl border border-brand/25 bg-brand-subtle p-6 outline-none focus-visible:ring-2 focus-visible:ring-focus sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background">
                    <ShieldCheck aria-hidden="true" className="size-6 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-heading text-2xl font-semibold">
                      {content.quickStartTitle}
                    </h2>
                    <ol className="mt-5 list-decimal space-y-3 pl-5 leading-7 text-muted">
                      {content.quickStartSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </section>

              <section
                id="saved-wallets"
                tabIndex={-1}
                className="scroll-mt-6 rounded-xl border border-border bg-surface p-6 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-focus sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-subtle">
                    <WalletCards aria-hidden="true" className="size-6 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-heading text-2xl font-semibold">
                      {content.savedWalletTitle}
                    </h2>
                    <ol className="mt-5 list-decimal space-y-3 pl-5 leading-7 text-muted">
                      {content.savedWalletSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </section>

              <section
                id="local-storage"
                tabIndex={-1}
                className="scroll-mt-6 rounded-xl border border-success/25 bg-success-subtle p-6 outline-none focus-visible:ring-2 focus-visible:ring-focus sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background">
                    <CheckCircle2 aria-hidden="true" className="size-6 text-success" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-heading text-2xl font-semibold">
                      {content.localOnlyTitle}
                    </h2>
                    <ul className="mt-5 list-disc space-y-3 pl-5 leading-7 text-muted">
                      {content.localOnlyBullets.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              <section className="pt-4">
                <div className="flex items-center gap-3">
                  <Wrench aria-hidden="true" className="size-6 text-action" />
                  <h2 className="font-heading text-3xl font-semibold">
                    {content.troubleshootingTitle}
                  </h2>
                </div>

                <div className="mt-6 space-y-5">
                  {content.items.map((item) => (
                    <article
                      key={item.id}
                      id={item.id}
                      tabIndex={-1}
                      className="scroll-mt-6 rounded-xl border border-border bg-surface p-6 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-focus sm:p-8"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning-subtle">
                          <AlertTriangle
                            aria-hidden="true"
                            className="size-5 text-warning"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-heading text-2xl font-semibold">
                            {item.title}
                          </h3>

                          <dl className="mt-5 space-y-5">
                            <div>
                              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-action">
                                {content.symptomLabel}
                              </dt>
                              <dd className="mt-2 leading-7 text-muted">
                                {item.symptom}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-action">
                                {content.causeLabel}
                              </dt>
                              <dd className="mt-2 leading-7 text-muted">
                                {item.cause}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-action">
                                {content.actionLabel}
                              </dt>
                              <dd className="mt-2">
                                <ol className="list-decimal space-y-2 pl-5 leading-7 text-muted">
                                  {item.action.map((step) => (
                                    <li key={step}>{step}</li>
                                  ))}
                                </ol>
                              </dd>
                            </div>
                          </dl>

                          {item.warning ? (
                            <div className="mt-5 rounded-lg border border-danger/25 bg-danger-subtle p-4">
                              <p className="text-xs font-bold uppercase tracking-[0.12em] text-danger">
                                {content.warningLabel}
                              </p>
                              <p className="mt-2 leading-7 text-foreground">
                                {item.warning}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <div className="flex flex-wrap gap-3 pt-3">
                <Link href="/guide" className={buttonStyles({ variant: "secondary" })}>
                  <BookOpen aria-hidden="true" className="size-4" />
                  {content.backToGuide}
                </Link>
                <Link href="/changelog" className={buttonStyles({ variant: "ghost" })}>
                  <History aria-hidden="true" className="size-4" />
                  {content.changelogLabel}
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
