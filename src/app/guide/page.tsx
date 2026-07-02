import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/localization/language-switcher";
import { buttonStyles } from "@/components/ui/button";
import { NetworkBadge } from "@/components/ui/network-badge";
import { publicEnv } from "@/config/public-env";
import { getGuideContent } from "@/features/guide/guide-content";
import { getRequestLocale } from "@/features/localization/server";

export const metadata = {
  title: "Guide",
  description:
    "How XRPL Group Pay coordinates direct XRP and official RLUSD settlement, verification, and recovery.",
};

export default async function GuidePage() {
  const locale = await getRequestLocale();
  const content = getGuideContent(locale);
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

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-24 pt-10 sm:px-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:px-10 lg:pt-14">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {content.homeLabel}
          </Link>

          <nav
            aria-label={content.contentsLabel}
            className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              {content.contentsLabel}
            </p>
            <ol className="mt-4 space-y-1.5 text-sm">
              {content.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block rounded-md px-3 py-2 font-semibold text-muted outline-none hover:bg-brand-subtle hover:text-brand focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-action">
            {content.eyebrow}
          </p>
          <h1 className="mt-3 max-w-4xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
            {content.description}
          </p>

          <div className="mt-10 space-y-5">
            {content.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                tabIndex={-1}
                className="scroll-mt-6 rounded-xl border border-border bg-surface p-6 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-focus sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <span className="font-heading text-sm font-bold text-action">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-heading text-2xl font-semibold text-foreground">
                      {section.title}
                    </h2>
                    <div className="mt-4 space-y-4 leading-8 text-muted">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                    {section.bullets?.length ? (
                      <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-muted">
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </section>
            ))}
          </div>

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
