import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NetworkBadge, type AppNetwork } from "@/components/ui/network-badge";

export type PaymentPreviewProps = {
  billTitle: string;
  amount: string;
  recipient: string;
  network: AppNetwork;
  interactive?: boolean;
};

const assurances = [
  "Direct payment to the recipient",
  "Signed securely in Xaman",
  "Verified on the XRP Ledger",
  "Group Pay never holds your funds",
];

export function PaymentPreview({
  billTitle,
  amount,
  recipient,
  network,
  interactive = false,
}: PaymentPreviewProps) {
  return (
    <section
      aria-labelledby="payment-preview-title"
      className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-md sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">Shared bill</p>
          <h2
            id="payment-preview-title"
            className="mt-1 font-heading text-xl font-semibold text-foreground"
          >
            {billTitle}
          </h2>
        </div>
        <NetworkBadge network={network} />
      </div>

      <div className="my-8 text-center">
        <p className="text-sm font-medium text-muted">Your share</p>
        <p className="mt-2 font-heading text-5xl font-bold tracking-tight text-brand">
          {amount} <span className="text-2xl">XRP</span>
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Recipient
        </p>
        <p className="mt-1 font-mono text-sm font-medium text-foreground">
          {recipient}
        </p>
      </div>

      <ul className="my-6 space-y-3 text-sm text-muted">
        {assurances.map((assurance) => (
          <li key={assurance} className="flex items-center gap-3">
            <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
            <span>{assurance}</span>
          </li>
        ))}
      </ul>

      <Button className="w-full" disabled={!interactive}>
        Pay {amount} XRP
        <ArrowRight aria-hidden="true" className="size-4" />
      </Button>
      <p className="mt-3 text-center text-xs text-muted">
        {interactive ? "Opens securely in Xaman" : "Interface preview — payment is not active"}
      </p>
    </section>
  );
}
