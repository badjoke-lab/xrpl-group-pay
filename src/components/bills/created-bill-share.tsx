"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Eye,
  Share2,
  UserRoundCog,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CreatedBill } from "@/features/bills/types";

function paymentUrl(token: string) {
  return `${window.location.origin}/testnet/payment#token=${token}`;
}

function progressUrl(token: string) {
  return `${window.location.origin}/testnet/bill/progress#token=${token}`;
}

export function CreatedBillShare({
  created,
  onReset,
}: {
  created: CreatedBill;
  onReset(): void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copyUrl(key: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/10">
          <Check aria-hidden="true" className="size-6 text-success" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-success">
            Bill created
          </p>
          <h2 className="mt-2 font-heading text-3xl font-semibold">
            {created.bill.title}
          </h2>
          <p className="mt-2 leading-7 text-muted">
            The bill is frozen. Save the creator progress link, then send each
            participant only their own payment link.
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <Summary label="Total" value={`${created.bill.totalDrops} drops`} />
        <Summary
          label="Creator share"
          value={`${created.bill.creatorShareDrops} drops`}
        />
        <Summary label="Participants" value={String(created.slots.length)} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <AccessCard
          icon={UserRoundCog}
          title="Creator progress"
          body="Shows participant labels, expected wallets, InvoiceIDs, and independent verification states. Keep this link private."
          buttonLabel="Copy creator progress link"
          copied={copied === "admin-progress"}
          onCopy={() =>
            void copyUrl(
              "admin-progress",
              progressUrl(created.capabilities.adminToken),
            )
          }
        />
        <AccessCard
          icon={Eye}
          title="Read-only progress"
          body="Shows amounts and settlement states without participant labels, expected wallet addresses, or InvoiceIDs."
          buttonLabel="Copy read-only progress link"
          copied={copied === "public-progress"}
          onCopy={() =>
            void copyUrl(
              "public-progress",
              progressUrl(created.capabilities.publicToken),
            )
          }
        />
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="font-heading text-xl font-semibold">
          Participant payment links
        </h3>
        {created.slots.map((slot, index) => (
          <article
            key={slot.publicId}
            className="rounded-lg border border-border bg-background p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted">Participant {index + 1}</p>
                <h4 className="mt-1 font-heading text-lg font-semibold">
                  {slot.participantLabel || "Unnamed participant"}
                </h4>
                <p className="mt-1 font-mono text-xs text-muted">
                  {slot.expectedPayerAddress}
                </p>
                <p className="mt-2 font-semibold text-brand">
                  {slot.expectedAmountDrops} drops
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  void copyUrl(slot.publicId, paymentUrl(slot.paymentToken))
                }
              >
                {copied === slot.publicId ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Copy aria-hidden="true" className="size-4" />
                )}
                {copied === slot.publicId ? "Copied" : "Copy payment link"}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-7 rounded-lg bg-brand-subtle p-4 text-sm leading-6 text-brand">
        <div className="flex gap-3">
          <Share2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p>
            Payment and progress capabilities stay in URL fragments, so they
            are not sent to the server as part of the page request. Treat every
            capability as a private invitation and share it only with its
            intended viewer.
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="mt-7"
        onClick={onReset}
      >
        Create another bill
      </Button>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-heading text-lg font-semibold">{value}</p>
    </div>
  );
}

function AccessCard({
  icon: Icon,
  title,
  body,
  buttonLabel,
  copied,
  onCopy,
}: {
  icon: typeof Eye;
  title: string;
  body: string;
  buttonLabel: string;
  copied: boolean;
  onCopy(): void;
}) {
  return (
    <article className="rounded-lg border border-border bg-background p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-subtle">
          <Icon aria-hidden="true" className="size-4 text-brand" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="mt-5 w-full"
        onClick={onCopy}
      >
        {copied ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
        {copied ? "Copied" : buttonLabel}
      </Button>
    </article>
  );
}
