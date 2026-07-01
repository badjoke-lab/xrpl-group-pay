import { CircleAlert } from "lucide-react";
import Link from "next/link";

import { TestnetBillForm } from "@/components/bills/testnet-bill-form";
import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/localization/language-switcher";
import { NetworkBadge } from "@/components/ui/network-badge";
import { resolvePaymentOperations } from "@/config/payment-operations";
import { publicEnv } from "@/config/public-env";
import { translate } from "@/features/localization/catalog";
import { getRequestLocale } from "@/features/localization/server";

export const metadata = {
  title: "Create Shared Bill",
};

export default async function BillPage() {
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

  return (
    <main className="min-h-screen overflow-x-hidden bg-background">
      <header className="mx-auto flex w-full max-w-5xl flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <BrandMark />
          <span className="whitespace-nowrap font-heading text-sm font-bold text-brand sm:text-base">
            XRPL Group Pay
          </span>
        </Link>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <LanguageSwitcher compact />
          <NetworkBadge network={network} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-4 sm:px-8 sm:pt-14">
        <div className="mb-7 max-w-3xl sm:mb-9">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-action sm:text-sm sm:tracking-[0.14em]">
            {t("bill.page.eyebrow", { network: networkLabel })}
          </p>
          <h1 className="mt-3 max-w-2xl font-heading text-[2rem] font-bold leading-[1.08] tracking-tight sm:text-5xl sm:leading-[1.05]">
            {t("bill.page.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:mt-5 sm:text-lg sm:leading-8">
            {t("bill.page.description")}
          </p>
        </div>

        {publicCreationEnabled ? (
          <TestnetBillForm />
        ) : (
          <section className="rounded-xl border border-action/30 bg-action/10 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <CircleAlert
                aria-hidden="true"
                className="mt-0.5 size-7 shrink-0 text-action"
              />
              <div>
                <h2 className="font-heading text-2xl font-semibold">
                  {t("bill.page.halted.title")}
                </h2>
                <p className="mt-3 max-w-2xl leading-7 text-foreground">
                  {t("bill.page.halted.body")}
                </p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
                  <Link
                    href="/roadmap"
                    className="text-brand underline-offset-4 hover:underline"
                  >
                    {t("bill.page.releaseStatus")}
                  </Link>
                  <Link
                    href="/changelog"
                    className="text-brand underline-offset-4 hover:underline"
                  >
                    {t("bill.page.completedWork")}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
