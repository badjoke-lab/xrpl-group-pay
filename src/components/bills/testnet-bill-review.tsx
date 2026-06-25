"use client";

import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BillReview } from "@/features/bills/types";
import { formatMoneyAmount } from "@/features/money/money";

export type TestnetBillReviewProps = {
  review: BillReview;
  creating: boolean;
  error: string | null;
  onBack(): void;
  onConfirm(): void;
};

function shortValue(value: string, start = 12, end = 10) {
  return value.length > start + end + 1
    ? `${value.slice(0, start)}…${value.slice(-end)}`
    : value;
}

function amount(value: BillReview["totalAmount"]) {
  return `${formatMoneyAmount(value)} ${value.code}`;
}

export function TestnetBillReview({
  review,
  creating,
  error,
  onBack,
  onConfirm,
}: TestnetBillReviewProps) {
  const issued = review.asset.assetType === "issued";

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-pill bg-brand-subtle px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-brand">
                  Testnet review
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-success/10 px-3 py-1 text-xs font-bold text-success">
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />
                  Allocation exact
                </span>
                <span className="rounded-pill border border-border px-3 py-1 text-xs font-bold">
                  {review.asset.symbol}
                </span>
              </div>
              <h2 className="mt-4 font-heading text-3xl font-semibold sm:text-4xl">
                Review before freezing
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted">
                Confirm every destination, payer, Asset, issuer, and amount. The
                next step freezes these conditions and creates one capability
                link per participant.
              </p>
            </div>
            <LockKeyhole
              aria-hidden="true"
              className="size-12 shrink-0 text-brand"
            />
          </div>
        </div>

        <dl className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCell label="Bill total" value={amount(review.totalAmount)} />
          <SummaryCell
            label="Creator share"
            value={amount(review.creatorShareAmount)}
          />
          <SummaryCell
            label="Participants"
            value={String(review.participants.length)}
          />
          <SummaryCell label="Allocated" value={amount(review.allocatedAmount)} />
        </dl>
      </div>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="grid gap-5 lg:grid-cols-2">
          <ReviewField label="Bill title" value={review.title} />
          <ReviewField
            label="Destination"
            value={review.destinationAddress}
            mono
          />
          <ReviewField
            label="Destination Tag"
            value={
              review.destinationTag === null
                ? "Not present"
                : String(review.destinationTag)
            }
          />
          <ReviewField label="Network" value="XRPL Testnet" />
          <ReviewField
            label="Settlement Asset"
            value={review.asset.symbol}
          />
          <ReviewField
            label="Asset type"
            value={issued ? "Issued Asset" : "Native XRP"}
          />
          {issued && (
            <div className="lg:col-span-2">
              <ReviewField
                label="Official issuer"
                value={review.asset.issuer}
                mono
              />
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <Users aria-hidden="true" className="size-6 text-brand" />
          <div>
            <h3 className="font-heading text-2xl font-semibold">
              Participant allocations
            </h3>
            <p className="mt-1 text-sm text-muted">
              Each row becomes a separate immutable {review.asset.symbol} payment
              slot.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {review.participants.map((participant, index) => (
            <article
              key={`${participant.expectedPayerAddress}:${index}`}
              className="rounded-lg border border-border bg-background p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Participant {index + 1}
                  </p>
                  <h4 className="mt-1 font-heading text-lg font-semibold">
                    {participant.participantLabel || `Payment slot ${index + 1}`}
                  </h4>
                  <p
                    className="mt-2 break-all font-mono text-xs text-muted"
                    title={participant.expectedPayerAddress}
                  >
                    {shortValue(participant.expectedPayerAddress)}
                  </p>
                </div>
                <p className="font-heading text-xl font-semibold text-brand">
                  {amount(participant.expectedAmount)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-action/25 bg-action/10 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 size-6 shrink-0 text-action"
          />
          <div>
            <h3 className="font-semibold text-action">Final confirmation</h3>
            <p className="mt-1 leading-7 text-foreground">
              No funds move when the Bill is created. The {review.asset.symbol}
              identity, destination, issuer, amounts, payers, tags, and InvoiceIDs
              are frozen for every participant link.
              {issued && " XRPL network fees remain payable separately in XRP."}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          disabled={creating}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to edit
        </Button>
        <Button type="button" onClick={onConfirm} disabled={creating}>
          {creating ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Freezing bill and slots
            </>
          ) : (
            <>
              <LockKeyhole aria-hidden="true" className="size-4" />
              Freeze bill and create payment links
            </>
          )}
        </Button>
      </div>
    </section>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border p-5 sm:border-r lg:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd className="mt-2 font-heading text-xl font-semibold">{value}</dd>
    </div>
  );
}

function ReviewField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd
        className={`mt-2 break-all text-sm font-semibold ${mono ? "font-mono" : ""}`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
