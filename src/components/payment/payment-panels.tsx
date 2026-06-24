"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PaymentDetails } from "@/features/bills/payment-details";

export function dropsToXrp(drops: string) {
  const padded = drops.padStart(7, "0");
  const whole = padded.slice(0, -6);
  const fraction = padded.slice(-6).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function shortValue(value: string, start = 10, end = 8) {
  return value.length > start + end + 1
    ? `${value.slice(0, start)}…${value.slice(-end)}`
    : value;
}

export function UnavailablePanel() {
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-danger/25 bg-surface p-7 text-center shadow-sm sm:p-9">
      <TriangleAlert aria-hidden="true" className="mx-auto size-11 text-danger" />
      <h2 className="mt-4 font-heading text-2xl font-semibold">
        Payment link unavailable
      </h2>
      <p className="mt-3 leading-7 text-muted">
        This link is incomplete or invalid. Ask the bill creator for a new
        participant payment link.
      </p>
    </section>
  );
}

export function LoadingDetailsPanel() {
  return (
    <section className="flex min-h-80 items-center justify-center rounded-xl border border-border bg-surface">
      <div className="text-center">
        <LoaderCircle
          aria-hidden="true"
          className="mx-auto size-10 animate-spin text-brand"
        />
        <p className="mt-4 font-semibold">Loading frozen payment details</p>
      </div>
    </section>
  );
}

export function DetailsErrorPanel({
  message,
  alreadyPaid,
  onRetry,
}: {
  message: string;
  alreadyPaid: boolean;
  onRetry(): void;
}) {
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-danger/25 bg-surface p-7 text-center shadow-sm sm:p-9">
      {alreadyPaid ? (
        <CheckCircle2 aria-hidden="true" className="mx-auto size-11 text-success" />
      ) : (
        <TriangleAlert aria-hidden="true" className="mx-auto size-11 text-danger" />
      )}
      <h2 className="mt-4 font-heading text-2xl font-semibold">
        {alreadyPaid ? "Payment already completed" : "Payment link unavailable"}
      </h2>
      <p className="mt-3 leading-7 text-muted">{message}</p>
      {!alreadyPaid && (
        <Button className="mt-6" variant="secondary" onClick={onRetry}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Try again
        </Button>
      )}
    </section>
  );
}

export function PaymentSummary({ details }: { details: PaymentDetails }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
            Participant payment
          </p>
          <h2 className="mt-3 font-heading text-2xl font-semibold">
            {details.billTitle}
          </h2>
        </div>
        <span className="rounded-pill bg-brand-subtle px-3 py-1 text-xs font-bold text-brand">
          TESTNET
        </span>
      </div>
      <div className="mt-7 space-y-4">
        <div className="rounded-lg border border-border bg-background p-5 text-center">
          <p className="text-sm font-medium text-muted">Your share</p>
          <p className="mt-2 font-heading text-4xl font-bold text-brand">
            {dropsToXrp(details.amountDrops)} <span className="text-xl">XRP</span>
          </p>
        </div>
        <dl className="space-y-3 text-sm">
          {details.participantLabel && (
            <SummaryRow label="Participant" value={details.participantLabel} />
          )}
          <SummaryRow
            label="Recipient"
            value={shortValue(details.destinationAddress)}
            title={details.destinationAddress}
            mono
          />
          <SummaryRow
            label="Expected wallet"
            value={shortValue(details.expectedPayerAddress)}
            title={details.expectedPayerAddress}
            mono
          />
          <SummaryRow
            label="Destination Tag"
            value={
              details.destinationTag === null
                ? "Not present"
                : String(details.destinationTag)
            }
          />
        </dl>
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-lg bg-brand-subtle p-4 text-sm leading-6 text-brand">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p>
          These values are frozen by the private payment capability. Group Pay
          cannot edit them and never receives the XRP.
        </p>
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  value,
  title,
  mono = false,
}: {
  label: string;
  value: string;
  title?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd
        className={`text-right font-semibold ${mono ? "font-mono" : ""}`}
        title={title}
      >
        {value}
      </dd>
    </div>
  );
}

export function FinalConfirmation({
  details,
  onBack,
  onConfirm,
}: {
  details: PaymentDetails;
  onBack(): void;
  onConfirm(): void;
}) {
  return (
    <div className="min-h-80">
      <div className="flex items-start gap-3">
        <LockKeyhole aria-hidden="true" className="mt-1 size-7 shrink-0 text-brand" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-action">
            Final confirmation
          </p>
          <h2 className="mt-2 font-heading text-2xl font-semibold">
            Confirm the exact Testnet payment
          </h2>
          <p className="mt-2 leading-7 text-muted">
            Group Pay will create a short-lived Sign Request containing these
            immutable fields. You must still inspect and approve it in Xaman.
          </p>
        </div>
      </div>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <ConfirmationField label="Amount" value={`${dropsToXrp(details.amountDrops)} XRP`} />
        <ConfirmationField label="Network" value="XRPL Testnet" />
        <ConfirmationField label="Destination" value={details.destinationAddress} mono />
        <ConfirmationField label="Expected signer" value={details.expectedPayerAddress} mono />
        <ConfirmationField
          label="Destination Tag"
          value={details.destinationTag === null ? "Not present" : String(details.destinationTag)}
        />
        <ConfirmationField label="Source Tag" value={String(details.sourceTag)} />
        <div className="sm:col-span-2">
          <ConfirmationField label="InvoiceID" value={details.invoiceId} mono />
        </div>
      </dl>
      <div className="mt-6 rounded-lg border border-action/25 bg-action/10 p-4">
        <p className="font-semibold text-action">No XRP moves at this step.</p>
        <p className="mt-1 text-sm leading-6">
          XRP moves directly to the recipient only after you approve the exact
          transaction in Xaman.
        </p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to details
        </Button>
        <Button type="button" onClick={onConfirm}>
          <ExternalLink aria-hidden="true" className="size-4" />
          Create Xaman Sign Request
        </Button>
      </div>
    </div>
  );
}

function ConfirmationField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
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

export function WaitingPanel({
  qrPng,
  deepLink,
  isChecking,
  statusError,
  onCheck,
}: {
  qrPng: string;
  deepLink: string;
  isChecking: boolean;
  statusError: string | null;
  onCheck(): void;
}) {
  return (
    <div className="text-center">
      <LoaderCircle aria-hidden="true" className="mx-auto size-10 animate-spin text-brand" />
      <h2 className="mt-4 font-heading text-xl font-semibold">
        Waiting for approval in Xaman
      </h2>
      <p className="mt-2 text-muted">
        Compare the transaction in your wallet with the confirmed details before
        signing.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrPng}
        alt="QR code to open this Xaman Testnet sign request"
        className="mx-auto mt-6 size-52 rounded-lg border border-border"
      />
      <a
        href={deepLink}
        className="mt-5 inline-flex items-center gap-2 font-semibold text-brand underline underline-offset-4"
      >
        Open securely in Xaman
        <ExternalLink aria-hidden="true" className="size-4" />
      </a>
      <div className="mt-5">
        <Button variant="secondary" onClick={onCheck} disabled={isChecking}>
          {isChecking ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" className="size-4" />
          )}
          Check status
        </Button>
      </div>
      {statusError && <p role="alert" className="mt-4 text-sm text-danger">{statusError}</p>}
    </div>
  );
}

export function StatusPanel({
  icon,
  title,
  body,
  detail,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center text-center">
      {icon}
      <h2 className="mt-5 font-heading text-xl font-semibold">{title}</h2>
      <p className="mt-3 max-w-md leading-7 text-muted">{body}</p>
      {detail && <p className="mt-3 text-sm font-medium text-foreground">{detail}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export const statusIcons = {
  pending: <Clock3 aria-hidden="true" className="size-11 text-action" />,
};
