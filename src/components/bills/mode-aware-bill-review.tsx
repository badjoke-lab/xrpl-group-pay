"use client";

import { ArrowLeft, CircleAlert, LoaderCircle, LockKeyhole } from "lucide-react";

import { ContextualHelp } from "@/components/help/contextual-help";
import { Button } from "@/components/ui/button";
import { AssetBadge, RoleBadge } from "@/components/ui/identity-badges";
import { NetworkBadge } from "@/components/ui/network-badge";
import { StatusBadge } from "@/components/ui/semantic-status";
import type { AllocationViewSummary } from "@/features/bills/allocation-view";
import { reviewSharingCopy } from "@/features/bills/review-sharing-copy";
import type { BillReview } from "@/features/bills/types";
import { useLocalization } from "@/features/localization/provider";
import { formatMoneyAmount } from "@/features/money/money";

export type ModeAwareBillReviewProps = {
  review: BillReview;
  allocationSummary?: AllocationViewSummary;
  creating: boolean;
  error: string | null;
  onBack(): void;
  onConfirm(): void;
};

function amount(value: BillReview["totalAmount"]) {
  return `${formatMoneyAmount(value)} ${value.code}`;
}

function participantTotal(review: BillReview) {
  return {
    code: review.totalAmount.code,
    scale: review.totalAmount.scale,
    units: review.participants
      .reduce((sum, item) => sum + BigInt(item.expectedAmount.units), 0n)
      .toString(),
  };
}

export function ModeAwareBillReview({
  review,
  allocationSummary,
  creating,
  error,
  onBack,
  onConfirm,
}: ModeAwareBillReviewProps) {
  const { locale, t } = useLocalization();
  const copy = reviewSharingCopy(locale);
  const collection = participantTotal(review);
  const zero = { ...collection, units: "0" };
  const issued = review.asset.assetType === "issued";
  const modeLabel =
    review.paymentMode === "representative"
      ? copy.representativeMode
      : copy.directMode;
  const modeBody =
    review.paymentMode === "representative"
      ? copy.representativeSummary
      : copy.directSummary;
  const recipient = review.recipientLabel?.trim() || copy.recipient;

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <NetworkBadge network={review.network} />
                <AssetBadge symbol={review.asset.symbol} official={issued} locale={locale} />
                <StatusBadge family="complete" label={t("bill.review.exact")} />
              </div>
              <h2 className="mt-4 font-heading text-3xl font-semibold sm:text-4xl">
                {t("bill.review.title")}
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted">
                {t("bill.review.description")}
              </p>
            </div>
            <LockKeyhole aria-hidden="true" className="size-12 shrink-0 text-brand" />
          </div>

          <div className="mt-6 rounded-lg border border-brand/20 bg-brand-subtle p-5">
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role="recipient" locale={locale} />
              <span className="text-sm font-bold text-brand">{modeLabel}</span>
            </div>
            <p className="mt-3 leading-7 text-foreground">{modeBody}</p>
            <p className="mt-3 break-all font-mono text-xs text-muted">
              {recipient}: {review.destinationAddress}
              {review.destinationTag === null ? "" : ` · Destination Tag ${review.destinationTag}`}
            </p>
          </div>
        </div>

        <dl className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-5">
          <Summary label={copy.billTotal} value={amount(review.totalAmount)} />
          <Summary
            label={copy.recipientFunded}
            value={`${amount(review.recipientFundedAmount)} · ${copy.noTransfer}`}
          />
          <Summary label={copy.participantCollection} value={amount(collection)} />
          <Summary label={copy.verified} value={amount(zero)} detail={copy.verifiedZero} />
          <Summary label={copy.remaining} value={amount(collection)} />
        </dl>
      </div>

      {review.network === "mainnet" && (
        <section className="rounded-xl border border-action/30 bg-action/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-action" />
            <div>
              <h3 className="font-semibold text-action">{t("bill.review.mainnet.title")}</h3>
              <p className="mt-1 leading-7 text-foreground">{t("bill.review.mainnet.body")}</p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="font-heading text-2xl font-semibold">{copy.recipient}</h3>
          <ContextualHelp topic="recipient" variant="inline" />
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label={t("bill.review.billTitle")} value={review.title} />
          <Field label={copy.recipient} value={recipient} />
          <Field label={t("bill.review.destination")} value={review.destinationAddress} mono />
          <Field
            label={t("bill.review.destinationTag")}
            value={review.destinationTag === null ? t("bill.review.notPresent") : String(review.destinationTag)}
          />
          <Field label={t("bill.review.network")} value={`XRPL ${review.network === "mainnet" ? "Mainnet" : "Testnet"}`} />
          <Field label={t("bill.review.asset")} value={review.asset.symbol} />
          {issued && <Field label={t("bill.review.issuer")} value={review.asset.issuer} mono />}
        </dl>
      </section>

      {allocationSummary && (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <h3 className="font-heading text-2xl font-semibold">{t("bill.review.rule")}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{t("bill.review.ruleBody")}</p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <Field label={t("bill.review.method")} value={allocationSummary.strategyLabel} />
            <Field label={t("bill.review.remainderUnits")} value={allocationSummary.remainderUnits} />
            <Field
              label={t("bill.review.remainderAssignment")}
              value={
                allocationSummary.remainderAssignmentLabel === "Recipient-funded amount"
                  ? copy.recipientFunded
                  : allocationSummary.remainderAssignmentLabel
              }
            />
          </dl>
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h3 className="font-heading text-2xl font-semibold">{t("bill.review.participantAllocations")}</h3>
        <div className="mt-5 space-y-3">
          {review.participants.map((participant, index) => (
            <article key={`${participant.expectedPayerAddress}:${index}`} className="rounded-lg border border-border bg-background p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleBadge role="payer" locale={locale} />
                    <span className="text-xs font-semibold text-muted">{t("bill.participant.number", { number: index + 1 })}</span>
                  </div>
                  <h4 className="mt-2 font-heading text-lg font-semibold">
                    {participant.participantLabel || t("bill.review.slot", { number: index + 1 })}
                  </h4>
                  <p className="mt-2 break-all font-mono text-xs text-muted">{participant.expectedPayerAddress}</p>
                </div>
                <p className="font-heading text-xl font-semibold text-brand">{amount(participant.expectedAmount)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-action/25 bg-action/10 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-action" />
          <div>
            <h3 className="font-semibold text-action">{t("bill.review.final")}</h3>
            <p className="mt-1 leading-7 text-foreground">
              {t("bill.review.finalBody", { asset: review.asset.symbol })}
              {issued && ` ${t("bill.review.feeNotice")}`}
            </p>
          </div>
        </div>
      </section>

      {error && <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="secondary" onClick={onBack} disabled={creating}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("bill.review.back")}
        </Button>
        <Button type="button" onClick={onConfirm} disabled={creating}>
          {creating ? (
            <><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />{t("bill.review.creating")}</>
          ) : (
            <><LockKeyhole aria-hidden="true" className="size-4" />{t("bill.review.confirm")}</>
          )}
        </Button>
      </div>
    </section>
  );
}

function Summary({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="border-b border-border p-5 sm:border-r lg:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-2 font-heading text-lg font-semibold">{value}</dd>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className={`mt-2 break-all text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
