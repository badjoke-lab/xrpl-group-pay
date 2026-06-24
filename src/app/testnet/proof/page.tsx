import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { TestnetTransactionProof } from "@/components/proofs/testnet-transaction-proof";
import { NetworkBadge } from "@/components/ui/network-badge";

export const metadata = {
  title: "Transaction Proof",
};

export default function TestnetTransactionProofPage() {
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
            Public verified receipt
          </p>
          <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Inspect the immutable facts behind a verified payment.
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            The proof identifier stays in this URL fragment. The page reveals
            only public XRP Ledger facts and never exposes private bill or
            participant details.
          </p>
        </div>

        <TestnetTransactionProof />
      </div>
    </main>
  );
}
