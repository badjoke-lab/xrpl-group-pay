import Link from "next/link";

import { TestnetBillProgress } from "@/components/bills/testnet-bill-progress";
import { BrandMark } from "@/components/brand/brand-mark";
import { NetworkBadge } from "@/components/ui/network-badge";

export const metadata = {
  title: "Bill Progress",
};

export default function TestnetBillProgressPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark />
          <span className="font-heading font-bold text-brand">XRPL Group Pay</span>
        </Link>
        <NetworkBadge network="testnet" />
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-14">
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
            Verified settlement status
          </p>
          <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Follow every participant slot without holding the funds.
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            Progress is loaded from a private capability in this URL fragment.
            A slot becomes paid only after its exact transaction is verified on a
            validated XRP Ledger.
          </p>
        </div>

        <TestnetBillProgress />
      </div>
    </main>
  );
}
