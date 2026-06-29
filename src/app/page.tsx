import {
  ArrowRight,
  Check,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { PaymentPreview } from "@/components/payment/payment-preview";
import { buttonStyles } from "@/components/ui/button";
import { NetworkBadge } from "@/components/ui/network-badge";
import { resolvePaymentOperations } from "@/config/payment-operations";
import { publicEnv } from "@/config/public-env";

const principles = [
  {
    icon: WalletCards,
    title: "You approve every payment",
    body: "Participants review and sign with their own Xaman wallet.",
  },
  {
    icon: ShieldCheck,
    title: "Funds move directly",
    body: "Group Pay never becomes an intermediate recipient or app balance.",
  },
  {
    icon: Check,
    title: "Ledger-verified completion",
    body: "A payment is not marked paid until the validated transaction matches.",
  },
];

export default function Home() {
  const network = publicEnv.NEXT_PUBLIC_APP_NETWORK;
  const operations = resolvePaymentOperations(process.env);
  const releaseMode = process.env.MAINNET_RELEASE_MODE ?? "disabled";
  const publicCreationEnabled =
    network === "testnet" ||
    (["limited", "public"].includes(releaseMode) && operations.creationEnabled);
  const networkLabel = network === "mainnet" ? "Mainnet" : "Testnet";

  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <BrandMark />
          <span className="font-heading text-lg font-bold text-brand">
            XRPL Group Pay
          </span>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-4 text-sm font-semibold sm:flex">
            <Link href="/roadmap" className="text-muted hover:text-foreground">
              Roadmap
            </Link>
            <Link href="/changelog" className="text-muted hover:text-foreground">
              Changelog
            </Link>
          </nav>
          <NetworkBadge network={network} />
        </div>
      </header>

      <section className="relative mx-auto grid w-full max-w-7xl gap-14 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-20">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-pill border border-brand/15 bg-brand-subtle px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-brand">
            <Users aria-hidden="true" className="size-4" />
            Non-custodial shared settlement
          </p>
          <h1 className="font-heading text-5xl font-bold leading-[1.03] tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl">
            Split the cost.
            <span className="block text-brand">Settle directly.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted sm:text-xl">
            Create one shared bill in XRP or official RLUSD, give each participant
            a frozen obligation, and verify every direct payment on XRPL {networkLabel}.
          </p>

          {!publicCreationEnabled && network === "mainnet" && (
            <p className="mt-5 max-w-xl rounded-lg border border-action/25 bg-action/10 px-4 py-3 text-sm leading-6 text-foreground">
              Mainnet payment creation is currently halted while the controlled
              release checklist is completed. The public interface remains visible,
              but it will not create payment requests until release approval.
            </p>
          )}

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/bill" className={buttonStyles({ className: "min-h-13" })}>
              {publicCreationEnabled
                ? `Create a ${networkLabel} bill`
                : "View bill creation status"}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <a
              href="https://github.com/badjoke-lab/xrpl-group-pay/tree/main/docs"
              className={buttonStyles({
                variant: "secondary",
                className: "min-h-13",
              })}
            >
              Read the product foundation
            </a>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {principles.map(({ icon: Icon, title, body }) => (
              <article key={title} className="border-l-2 border-border pl-4">
                <Icon aria-hidden="true" className="mb-3 size-5 text-brand" />
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-20 size-80 rounded-full bg-action/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-20 -left-20 size-72 rounded-full bg-brand/10 blur-3xl"
          />
          <PaymentPreview
            billTitle="XRPL Meetup Dinner"
            amount="4"
            recipient="rABC…9XYZ"
            network={network}
          />
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-3 lg:px-10">
          {[
            ["01", "Create", "Set the recipient, Asset, total, and participant shares."],
            ["02", "Sign", "Each participant approves their own Payment in Xaman."],
            ["03", "Verify", "Group Pay confirms the validated transaction before completion."],
          ].map(([number, title, body]) => (
            <article key={number} className="flex gap-4">
              <span className="font-heading text-sm font-bold text-action">{number}</span>
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  {title}
                </h2>
                <p className="mt-1 leading-7 text-muted">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>Non-custodial coordination and validated-ledger verification.</p>
          <div className="flex gap-5 font-semibold">
            <Link href="/roadmap" className="hover:text-foreground">
              Roadmap
            </Link>
            <Link href="/changelog" className="hover:text-foreground">
              Changelog
            </Link>
            <a
              href="https://github.com/badjoke-lab/xrpl-group-pay"
              className="hover:text-foreground"
            >
              Source
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
