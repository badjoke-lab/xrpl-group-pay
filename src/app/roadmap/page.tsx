import { CheckCircle2, CircleDot, FlaskConical, Layers3 } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { NetworkBadge } from "@/components/ui/network-badge";
import { publicEnv } from "@/config/public-env";

export const metadata = {
  title: "Roadmap",
  description: "Current XRPL Group Pay availability and release work.",
};

const sections = [
  {
    title: "Available",
    icon: CheckCircle2,
    items: [
      "XRP and official RLUSD Bills with one frozen Settlement Asset.",
      "Custom Amount, Equal, Percentage, and Shares allocation with explicit remainder handling.",
      "Separate participant capabilities and expected payer addresses.",
      "Xaman signing handoff for XRP and issued RLUSD Payments.",
      "Strict validated-ledger verification, durable receipts, Bill progress, and public XRP proof.",
      "Controlled Mainnet XRP acceptance and one-shot payer Sequence binding.",
    ],
  },
  {
    title: "Release blockers",
    icon: CircleDot,
    items: [
      "Reconcile the expected payer's validated XRPL history before any replacement handoff is created.",
      "Repeat controlled Mainnet RLUSD acceptance after the duplicate-transfer remediation is deployed.",
      "Record the accepted RLUSD receipt, duplicate control, replay control, and halted restoration evidence.",
      "Complete the final Mainnet release audit and publish the reviewed runtime configuration.",
    ],
  },
  {
    title: "Make Waves v1 completion",
    icon: Layers3,
    items: [
      "English, Japanese, and Korean critical creator and payer flows.",
      "Public Mainnet creator flow with clear network and real-value warnings.",
      "Release-aligned README, Roadmap, Changelog, and proof examples.",
      "Source Tag metrics summary, pitch video, and pitch deck for submission.",
    ],
  },
  {
    title: "After v1",
    icon: FlaskConical,
    items: [
      "Additional tested XRPL Wallet Providers.",
      "Fiat-denominated accounting currencies and versioned Settlement Quotes.",
      "Participant asset choice, Persistent Groups, Settlement Circles, and Event Collection.",
      "Curated additional assets and researched payment rails without custody, swaps, or bridging.",
    ],
  },
] as const;

export default function RoadmapPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark />
          <span className="font-heading font-bold text-brand">XRPL Group Pay</span>
        </Link>
        <NetworkBadge network={publicEnv.NEXT_PUBLIC_APP_NETWORK} />
      </header>

      <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8 sm:px-8 sm:pt-14">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
          Public status
        </p>
        <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          Roadmap
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          This page separates usable product behavior from release-blocking work and
          later direction. An item moves to Available only after it is merged,
          tested, and usable in the intended environment.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {sections.map(({ title, icon: Icon, items }) => (
            <section
              key={title}
              className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-brand-subtle">
                  <Icon aria-hidden="true" className="size-5 text-brand" />
                </div>
                <h2 className="font-heading text-2xl font-semibold">{title}</h2>
              </div>
              <ul className="mt-6 space-y-3">
                {items.map((item) => (
                  <li key={item} className="flex gap-3 leading-7 text-muted">
                    <span aria-hidden="true" className="mt-3 size-1.5 shrink-0 rounded-full bg-action" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/bill" className="text-brand underline-offset-4 hover:underline">
            Open bill creation
          </Link>
          <Link href="/changelog" className="text-brand underline-offset-4 hover:underline">
            View completed changes
          </Link>
          <a
            href="https://github.com/badjoke-lab/xrpl-group-pay/blob/main/ROADMAP.md"
            className="text-brand underline-offset-4 hover:underline"
          >
            Repository roadmap
          </a>
        </div>
      </div>
    </main>
  );
}
