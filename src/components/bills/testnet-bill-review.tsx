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
import type { AllocationViewSummary } from "@/features/bills/allocation-view";
import type { BillReview } from "@/features/bills/types";
import { useLocalization } from "@/features/localization/provider";
import { formatMoneyAmount } from "@/features/money/money";

export type TestnetBillReviewProps = {
  review: BillReview;
  allocationSummary?: AllocationViewSummary;
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
  allocationSummary,
  creating,
  error,
  onBack,
  onConfirm,
}: TestnetBillReviewProps) {
  const { t } = useLocalization();
  const issued = review.asset.assetType === "issued";
  const networkLabel = review.network === "mainnet" ? "Mainnet" : "Testnet";
  const strategyLabel = allocationSummary
    ? allocationSummary.strategy === "custom"
      ? t("bill.allocation.custom.label")
      : allocationSummary.strategy === "equal"
        ? t("bill.allocation.equal.label")
        : allocationSummary.strategy === "percentage"
          ? t("bill.allocation.percentage.label")
          : t("bill.allocation.shares.label")
    : null;
  const remainderAssignmentLabel = allocationSummary
    ? allocationSummary.remainderAssignmentLabel === "No remainder"
      ? t("bill.review.notPresent")
      : allocationSummary.remainderAssignmentLabel === "Creator"
        ? t("bill.review.creatorShare")
        : allocationSummary.remainderAssignmentLabel ===
            "Manual participant distribution"
          ? t("bill.remainder.manual.label")
          : allocationSummary.remainderAssignmentLabel
    : null;

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-pill bg-brand-subtle px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-brand">
                  {t("bill.review.badge", { network: networkLabel })}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-success/10 px-3 py-1 text-xs font-bold text-success">
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />
                  {t("bill.review.exact")}
                </span>
                <span className="rounded-pill border border-border px-3 py-1 text-xs font-bold">
                  {review.asset.symbol}
                </span>
              </div>
              <h2 className="mt-4 font-heading text-3xl font-semibold sm:text-4xl">
                {t("bill.review.title")}
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted">
                {t("bill.review.description")}
              </p>
            </div>
            <LockKeyhole
              aria-hidden="true"
              className="size-12 shrink-0 text-brand"
            />
          </div>
        </div>

        <dl className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCell
            label={t("bill.review.billTotal")}
            value={amount(review.totalAmount)}
          />
          <SummaryCell
            label={t("bill.review.creatorShare")}
            value={amount(review.creatorShareAmount)}
          />
          <SummaryCell
            label={t("bill.review.participants")}
            value={String(review.participants.length)}
          />
          <SummaryCell
            label={t("bill.review.allocated")}
            value={amount(review.allocatedAmount)}
          />
        </dl>
      </div>

      {review.network === "mainnet" && (
        <section className="rounded-xl border border-action/30 bg-action/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 size-6 shrink-0 text-action"
            />
            <div>
              <h3 className="font-semibold text-action">
                {t("bill.review.mainnet.title")}
              </h3>
              <p className="mt-1 leading-7 text-foreground">
                {t("bill.review.mainnet.body")}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="grid gap-5 lg:grid-cols-2">
          <ReviewField label={t("bill.review.billTitle")} value={review.title} />
          <ReviewField
            label={t("bill.review.destination")}
            value={review.destinationAddress}
            mono
          />
          <ReviewField
            label={t("bill.review.destinationTag")}
            value={
              review.destinationTag === null
                ? t("bill.review.notPresent")
                : String(review.destinationTag)
            }
          />
          <ReviewField
            label={t("bill.review.network")}
            value={`XRPL ${networkLabel}`}
          />
          <ReviewField
            label={t("bill.review.asset")}
            value={review.asset.symbol}
          />
          <ReviewField
            label={t("bill.review.assetType")}
            value={issued ? t("bill.review.issued") : t("bill.review.native")}
          />
          {review.asset.assetType === "issued" && (
            <div className="lg:col-span-2">
              <ReviewField
                label={t("bill.review.issuer")}
                value={review.asset.issuer}
                mono
              />
            </div>
          )}
        </div>
      </section>

      {allocationSummary && strategyLabel && remainderAssignmentLabel && (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <h3 className="font-heading text-2xl font-semibold">
            {t("bill.review.rule")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t("bill.review.ruleBody")}
          </p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <ReviewField label={t("bill.review.method")} value={strategyLabel} />
            <ReviewField
              label={t("bill.review.remainderUnits")}
              value={allocationSummary.remainderUnits}
            />
            <ReviewField
              label={t("bill.review.remainderAssignment")}
              value={remainderAssignmentLabel}
            />
          </dl>
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <Users aria-hidden="true" className="size-6 text-brand" />
          <div>
            <h3 className="font-heading text-2xl font-semibold">
              {t("bill.review.participantAllocations")}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {t("bill.review.participantBody", {
                asset: review.asset.symbol,
              })}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {review.participants.map((participant, index) => {
            const number = index + 1;
            return (
              <article
                key={`${participant.expectedPayerAddress}:${index}`}
                className="rounded-lg border border-border bg-background p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      {t("bill.participant.number", { number })}
                    </p>
                    <h4 className="mt-1 font-heading text-lg font-semibold">
                      {participant.participantLabel ||
                        t("bill.review.slot", { number })}
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
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-action/25 bg-action/10 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 size-6 shrink-0 text-action"
          />
          <div>
            <h3 className="font-semibold text-action">
              {t("bill.review.final")}
            </h3>
            <p className="mt-1 leading-7 text-foreground">
              {t("bill.review.finalBody", { asset: review.asset.symbol })}
              {issued && ` ${t("bill.review.feeNotice")}`}
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
          {t("bill.review.back")}
        </Button>
        <Button type="button" onClick={onConfirm} disabled={creating}>
          {creating ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              {t("bill.review.creating")}
            </>
          ) : (
            <>
              <LockKeyhole aria-hidden="true" className="size-4" />
              {t("bill.review.confirm")}
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
