import Link from "next/link";

import { TestnetBillProgress } from "@/components/bills/testnet-bill-progress";
import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/localization/language-switcher";
import { NetworkBadge } from "@/components/ui/network-badge";
import { publicEnv } from "@/config/public-env";
import { progressTranslate } from "@/features/localization/progress-catalog";
import { getRequestLocale } from "@/features/localization/server";

export const metadata = {
  title: "Bill Progress",
};

export default async function BillProgressPage() {
  const locale = await getRequestLocale();
  const gt = (
    key: Parameters<typeof progressTranslate>[1],
    variables?: Record<string, string | number>,
  ) => progressTranslate(locale, key, variables);
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

      <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-14">
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
            {gt("pageEyebrow")}
          </p>
          <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            {gt("pageTitle")}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">{gt("pageBody")}</p>
        </div>

        <TestnetBillProgress managementControls />
      </div>
    </main>
  );
}
