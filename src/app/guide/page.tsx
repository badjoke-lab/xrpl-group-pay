import { ArrowLeft, ExternalLink } from "lucide-react";
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
    "How XRPL Group Pay coordinates direct XRP and official RLUSD settlement, verification, progress, and safe recovery.",
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
