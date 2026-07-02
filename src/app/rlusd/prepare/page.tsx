import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/localization/language-switcher";
import { RlusdTrustSetFlow } from "@/components/rlusd/rlusd-trustset-flow";
import { NetworkBadge } from "@/components/ui/network-badge";
import { publicEnv } from "@/config/public-env";
import { getRequestLocale } from "@/features/localization/server";
import { trustSetTranslate } from "@/features/localization/trustset-catalog";

export const metadata = {
  title: "RLUSD Account Preparation",
  robots: { index: false, follow: false },
};

export default async function RlusdPreparationPage() {
  const locale = await getRequestLocale();
  const network = publicEnv.NEXT_PUBLIC_APP_NETWORK;

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark />
          <span className="font-heading font-bold text-brand">XRPL Group Pay</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <LanguageSwitcher compact />
          <NetworkBadge network={network} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-5 pb-20 pt-8 sm:px-8 sm:pt-14">
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
            {trustSetTranslate(locale, "eyebrow")}
          </p>
          <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            {trustSetTranslate(locale, "title")}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            {trustSetTranslate(locale, "description")}
          </p>
        </div>

        <RlusdTrustSetFlow />
      </div>
    </main>
  );
}
