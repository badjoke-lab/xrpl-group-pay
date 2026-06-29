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
import { useCriticalLocalization } from "@/features/localization/critical-catalog";
import { formatMoneyAmount } from "@/features/money/money";

export function dropsToXrp(drops: string) {
  return formatMoneyAmount({ code: "XRP", units: drops, scale: 6 });
}

export function formatPaymentAmount(details: PaymentDetails) {
  return `${formatMoneyAmount(details.amount)} ${details.amount.code}`;
}

function shortValue(value: string, start = 10, end = 8) {
  return value.length > start + end + 1
    ? `${value.slice(0, start)}…${value.slice(-end)}`
    : value;
}

export function UnavailablePanel() {
  const { ct } = useCriticalLocalization();
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-danger/25 bg-surface p-7 text-center shadow-sm sm:p-9">
      <TriangleAlert aria-hidden="true" className="mx-auto size-11 text-danger" />
      <h2 className="mt-4 font-heading text-2xl font-semibold">
        {ct("payer.link.unavailable")}
      </h2>
      <p className="mt-3 leading-7 text-muted">{ct("payer.link.invalid")}</p>
    </section>
  );
}

export function LoadingDetailsPanel() {
  const { ct } = useCriticalLocalization();
  return (
    <section className="flex min-h-80 items-center justify-center rounded-xl border border-border bg-surface">
      <div className="text-center">
        <LoaderCircle
          aria-hidden="true"
          className="mx-auto size-10 animate-spin text-brand"
        />
        <p className="mt-4 font-semibold">{ct("payer.details.loading")}</p>
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
  const { ct } = useCriticalLocalization();
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-danger/25 bg-surface p-7 text-center shadow-sm sm:p-9">
      {alreadyPaid ? (
        <CheckCircle2 aria-hidden="true" className="mx-auto size-11 text-success" />
      ) : (
        <TriangleAlert aria-hidden="true" className="mx-auto size-11 text-danger" />
      )}
      <h2 className="mt-4 font-heading text-2xl font-semibold">
        {alreadyPaid
          ? ct("payer.details.completed")
          : ct("payer.details.unavailable")}
      </h2>
      <p className="mt-3 leading-7 text-muted">{message}</p>
      {!alreadyPaid && (
        <Button className="mt-6" variant="secondary" onClick={onRetry}>
          <RefreshCw aria-hidden="true" className="size-4" />
          {ct("payer.tryAgain")}
        </Button>
      )}
    </section>
  );
}

export function PaymentSummary({ details }: { details: PaymentDetails }) {
  const { ct } = useCriticalLocalization();
  const isIssued = details.asset.assetType === "issued";
  const networkLabel = details.network === "mainnet" ? "Mainnet" : "Testnet";

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
            {ct("payer.summary.eyebrow")}
          </p>
          <h2 className="mt-3 font-heading text-2xl font-semibold">
            {details.billTitle}
          </h2>
        </div>
        <span className="rounded-pill bg-brand-subtle px-3 py-1 text-xs font-bold text-brand">
          {networkLabel.toUpperCase()}
        </span>
      </div>
      <div className="mt-7 space-y-4">
        <div className="rounded-lg border border-border bg-background p-5 text-center">
          <p className="text-sm font-medium text-muted">
            {ct("payer.summary.share")}
          </p>
          <p className="mt-2 font-heading text-4xl font-bold text-brand">
            {formatMoneyAmount(details.amount)}{" "}
            <span className="text-xl">{details.amount.code}</span>
          </p>
          {isIssued && (
            <p className="mt-2 text-xs font-semibold text-muted">
              {ct("payer.summary.officialRlusd", { network: networkLabel })}
            </p>
          )}
        </div>
        <dl className="space-y-3 text-sm">
          {details.participantLabel && (
            <SummaryRow
              label={ct("payer.summary.participant")}
              value={details.participantLabel}
            />
          )}
          <SummaryRow
            label={ct("payer.summary.asset")}
            value={details.amount.code}
          />
          {details.asset.assetType === "issued" && (
            <SummaryRow
              label={ct("payer.summary.issuer")}
              value={shortValue(details.asset.issuer)}
              title={details.asset.issuer}
              mono
            />
          )}
          <SummaryRow
            label={ct("payer.summary.recipient")}
            value={shortValue(details.destinationAddress)}
            title={details.destinationAddress}
            mono
          />
          <SummaryRow
            label={ct("payer.summary.expectedWallet")}
            value={shortValue(details.expectedPayerAddress)}
            title={details.expectedPayerAddress}
            mono
          />
          <SummaryRow
            label={ct("payer.summary.destinationTag")}
            value={
              details.destinationTag === null
                ? ct("payer.summary.notPresent")
                : String(details.destinationTag)
            }
          />
        </dl>
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-lg bg-brand-subtle p-4 text-sm leading-6 text-brand">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p>
          {ct("payer.summary.frozen")}
          {isIssued && ` ${ct("payer.summary.fee")}`}
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
  const { ct } = useCriticalLocalization();
  const isIssued = details.asset.assetType === "issued";
  const networkLabel = details.network === "mainnet" ? "Mainnet" : "Testnet";

  return (
    <div className="min-h-80">
      <div className="flex items-start gap-3">
        <LockKeyhole aria-hidden="true" className="mt-1 size-7 shrink-0 text-brand" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-action">
            {ct("payer.confirm.eyebrow")}
          </p>
          <h2 className="mt-2 font-heading text-2xl font-semibold">
            {ct("payer.confirm.title", { network: networkLabel })}
          </h2>
          <p className="mt-2 leading-7 text-muted">
            {ct("payer.confirm.body")}
          </p>
        </div>
      </div>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <ConfirmationField
          label={ct("payer.confirm.amount")}
          value={formatPaymentAmount(details)}
        />
        <ConfirmationField
          label={ct("payer.confirm.network")}
          value={`XRPL ${networkLabel}`}
        />
        <ConfirmationField
          label={ct("payer.confirm.asset")}
          value={details.amount.code}
        />
        <ConfirmationField label={ct("payer.confirm.feeAsset")} value="XRP" />
        {details.asset.assetType === "issued" && (
          <div className="sm:col-span-2">
            <ConfirmationField
              label={ct("payer.confirm.issuer")}
              value={details.asset.issuer}
              mono
            />
          </div>
        )}
        <ConfirmationField
          label={ct("payer.confirm.destination")}
          value={details.destinationAddress}
          mono
        />
        <ConfirmationField
          label={ct("payer.confirm.signer")}
          value={details.expectedPayerAddress}
          mono
        />
        <ConfirmationField
          label={ct("payer.confirm.destinationTag")}
          value={
            details.destinationTag === null
              ? ct("payer.summary.notPresent")
              : String(details.destinationTag)
          }
        />
        <ConfirmationField
          label={ct("payer.confirm.sourceTag")}
          value={String(details.sourceTag)}
        />
        <div className="sm:col-span-2">
          <ConfirmationField label="InvoiceID" value={details.invoiceId} mono />
        </div>
      </dl>
      <div className="mt-6 rounded-lg border border-action/25 bg-action/10 p-4">
        <p className="font-semibold text-action">
          {ct("payer.confirm.noFunds")}
        </p>
        <p className="mt-1 text-sm leading-6">
          {ct("payer.confirm.direct", { asset: details.amount.code })}
          {isIssued && ` ${ct("payer.confirm.fee")}`}
        </p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          {ct("payer.confirm.back")}
        </Button>
        <Button type="button" onClick={onConfirm}>
          <ExternalLink aria-hidden="true" className="size-4" />
          {ct("payer.confirm.create")}
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
  const { ct } = useCriticalLocalization();
  return (
    <div className="text-center">
      <LoaderCircle aria-hidden="true" className="mx-auto size-10 animate-spin text-brand" />
      <h2 className="mt-4 font-heading text-xl font-semibold">
        {ct("payer.waiting.title")}
      </h2>
      <p className="mt-2 text-muted">{ct("payer.waiting.body")}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrPng}
        alt={ct("payer.waiting.qrAlt")}
        className="mx-auto mt-6 size-52 rounded-lg border border-border"
      />
      <a
        href={deepLink}
        className="mt-5 inline-flex items-center gap-2 font-semibold text-brand underline underline-offset-4"
      >
        {ct("payer.waiting.open")}
        <ExternalLink aria-hidden="true" className="size-4" />
      </a>
      <div className="mt-5">
        <Button variant="secondary" onClick={onCheck} disabled={isChecking}>
          {isChecking ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" className="size-4" />
          )}
          {ct("payer.waiting.check")}
        </Button>
      </div>
      {statusError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {statusError}
        </p>
      )}
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
