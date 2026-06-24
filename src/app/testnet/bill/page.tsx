import Link from "next/link";

import { TestnetBillForm } from "@/components/bills/testnet-bill-form";
import { BrandMark } from "@/components/brand/brand-mark";
import { NetworkBadge } from "@/components/ui/network-badge";

export const metadata = {
  title: "Create Shared Bill",
};

export default function TestnetBillPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark />
          <span className="font-heading font-bold text-brand">XRPL Group Pay</span>
        </Link>
        <NetworkBadge network="testnet" />
      </header>

      <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8 sm:px-8 sm:pt-14">
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
            Creator flow
          </p>
          <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Create one bill. Send each person their exact share.
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            Group Pay freezes the Testnet destination and allocations, then creates
            a separate payment capability for every participant. XRP moves directly
            from each participant wallet to the creator wallet.
          </p>
        </div>

        <TestnetBillForm />
      </div>
    </main>
  );
}
