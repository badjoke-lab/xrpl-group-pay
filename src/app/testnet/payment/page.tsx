import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/localization/language-switcher";
import { TestnetPaymentForm } from "@/components/payment/testnet-payment-form";
import { NetworkBadge } from "@/components/ui/network-badge";
import { publicEnv } from "@/config/public-env";
import { criticalTranslate } from "@/features/localization/critical-catalog";
import { getRequestLocale } from "@/features/localization/server";

export const metadata = {
  title: "Participant Payment",
};

export default async function TestnetPaymentPage() {
  const locale = await getRequestLocale();
  const ct = (
    key: Parameters<typeof criticalTranslate>[1],
    variables?: Record<string, string | number>,
  ) => criticalTranslate(locale, key, variables);
  const network = publicEnv.NEXT_PUBLIC_APP_NETWORK;
  const networkLabel = network === "mainnet" ? "Mainnet" : "Testnet";

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
            {ct("payer.page.eyebrow")}
          </p>
          <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            {ct("payer.page.title")}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            {ct("payer.page.description", { network: networkLabel })}
          </p>
        </div>

        <TestnetPaymentForm />
      </div>
    </main>
  );
}
