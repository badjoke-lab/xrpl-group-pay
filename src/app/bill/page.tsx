import { CircleAlert } from "lucide-react";
import Link from "next/link";

import { TestnetBillForm } from "@/components/bills/testnet-bill-form";
import { BrandMark } from "@/components/brand/brand-mark";
import { NetworkBadge } from "@/components/ui/network-badge";
import { resolvePaymentOperations } from "@/config/payment-operations";
import { publicEnv } from "@/config/public-env";

export const metadata = {
  title: "Create Shared Bill",
};

export default function BillPage() {
  const network = publicEnv.NEXT_PUBLIC_APP_NETWORK;
  const operations = resolvePaymentOperations(process.env);
  const releaseMode = process.env.MAINNET_RELEASE_MODE ?? "disabled";
  const publicCreationEnabled =
    network === "testnet" ||
    (["limited", "public"].includes(releaseMode) &&
      operations.creationEnabled);
  const networkLabel = network === "mainnet" ? "Mainnet" : "Testnet";

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark />
          <span className="font-heading font-bold text-brand">XRPL Group Pay</span>
        </Link>
        <NetworkBadge network={network} />
      </header>

      <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8 sm:px-8 sm:pt-14">
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
            Creator flow · XRPL {networkLabel}
          </p>
          <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Create one bill. Send each person their exact share.
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            Group Pay freezes the destination, Settlement Asset, and allocations,
            then creates a separate payment capability for every participant. Funds
            move directly from each participant wallet to the recipient wallet.
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
                  Mainnet bill creation is not publicly open yet
                </h2>
                <p className="mt-3 max-w-2xl leading-7 text-foreground">
                  This deployment is operationally halted while controlled release
                  checks are completed. No payment request can be created in this
                  state. The page will enable automatically only after the reviewed
                  Mainnet release configuration is published.
                </p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
                  <Link href="/roadmap" className="text-brand underline-offset-4 hover:underline">
                    View release status
                  </Link>
                  <Link href="/changelog" className="text-brand underline-offset-4 hover:underline">
                    View completed work
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
