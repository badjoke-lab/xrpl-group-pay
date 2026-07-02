"use client";

import { ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";

import { ContextualHelp } from "@/components/help/contextual-help";
import { Button, buttonStyles } from "@/components/ui/button";
import { ReadinessBadge } from "@/components/ui/identity-badges";
import type { PaymentDetails } from "@/features/bills/payment-details";
import { useLocalization } from "@/features/localization/provider";
import {
  readinessReason,
  readinessTranslate,
} from "@/features/localization/readiness-catalog";
import { unitsToDecimal } from "@/features/money/money";
import type { AssetReadinessAssessment } from "@/features/xrpl/asset-readiness";
import type { PaymentReadinessResponse } from "@/features/xrpl/payment-readiness-contract";

export function paymentReadinessAllowsHandoff(
  readiness: PaymentReadinessResponse | null,
) {
  return readiness?.payer.ready === true && readiness.recipient.ready === true;
}

function xrp(value: unknown) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  return `${unitsToDecimal(value, 6)} XRP`;
}

function missingDrops(current: unknown, required: unknown) {
  if (
    typeof current !== "string" ||
    typeof required !== "string" ||
    !/^\d+$/.test(current) ||
    !/^\d+$/.test(required)
  ) {
    return null;
  }
  const difference = BigInt(required) - BigInt(current);
  return difference > 0n
    ? `${unitsToDecimal(difference.toString(), 6)} XRP`
    : null;
}

function badgeStatus(assessment: AssetReadinessAssessment | null) {
  if (!assessment) return "checking" as const;
  if (assessment.status === "ready") return "ready" as const;
  if (assessment.status === "blocked") return "blocked" as const;
  return "unavailable" as const;
}

export function PaymentReadinessPanel({
  details,
  readiness,
  loading,
  error,
  setupWorking,
  setupPath,
  onRecheck,
  onPrepareSetup,
}: {
  details: PaymentDetails;
  readiness: PaymentReadinessResponse | null;
  loading: boolean;
  error: string | null;
  setupWorking: boolean;
  setupPath: string | null;
  onRecheck(): void;
  onPrepareSetup(): void;
}) {
  const { locale } = useLocalization();
  const rt = (key: Parameters<typeof readinessTranslate>[1]) =>
    readinessTranslate(locale, key);
  const payer = readiness?.payer ?? null;
  const recipient = readiness?.recipient ?? null;
  const issued = details.asset.assetType === "issued";
  const trustLineMissing = payer?.blockingCode === "trust_line_missing";
  const spendable = xrp(payer?.facts.spendableXrpDrops);
  const requiredXrp = xrp(payer?.facts.requiredXrpDrops);
  const reserve = xrp(payer?.facts.reserveDrops);
  const fee = xrp(payer?.facts.estimatedFeeDrops);
  const missingXrp = missingDrops(
    payer?.facts.spendableXrpDrops,
    payer?.facts.requiredXrpDrops,
  );

  return (
    <section className="rounded-xl border border-border bg-background p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">{rt("title")}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            {rt("body")}
          </p>
        </div>
        <ContextualHelp
          topic={issued ? "rlusd-readiness" : "payment-status"}
          variant="inline"
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <AssessmentCard
          title={rt("payer")}
          assessment={payer}
          loading={loading}
        />
        <AssessmentCard
          title={rt("recipient")}
          assessment={recipient}
          loading={loading}
        />
      </div>

      {payer && payer.status !== "unavailable" && (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {spendable && (
            <Fact label={rt("spendable")} value={spendable} />
          )}
          {requiredXrp && (
            <Fact label={rt("required")} value={requiredXrp} />
          )}
          {fee && <Fact label={rt("fee")} value={fee} />}
          {reserve && <Fact label={rt("reserve")} value={reserve} />}
          {missingXrp && (
            <Fact label={rt("missing")} value={missingXrp} danger />
          )}
          {issued && typeof payer.facts.issuedBalance === "string" && (
            <Fact
              label={rt("assetBalance")}
              value={`${payer.facts.issuedBalance} ${details.asset.symbol}`}
            />
          )}
          {issued && (
            <Fact
              label={rt("required")}
              value={`${unitsToDecimal(details.amount.units, details.amount.scale)} ${details.asset.symbol}`}
            />
          )}
        </dl>
      )}

      {(payer?.status === "unavailable" ||
        recipient?.status === "unavailable" ||
        error) && (
        <p className="mt-4 rounded-lg border border-border bg-surface-subtle p-4 text-sm leading-6 text-muted">
          {error || rt("unavailableBody")}
        </p>
      )}

      {issued && trustLineMissing && (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning-subtle p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-warning"
            />
            <div className="min-w-0">
              <p className="font-semibold">{rt("setup")}</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {rt("setupNotice")}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={onPrepareSetup}
                  disabled={setupWorking}
                >
                  {setupWorking ? rt("setupWorking") : rt("setup")}
                </Button>
                {setupPath && (
                  <a
                    href={setupPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className={buttonStyles({ variant: "secondary" })}
                  >
                    {rt("openSetup")}
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        className="mt-5"
        onClick={onRecheck}
        disabled={loading}
      >
        <RefreshCw
          aria-hidden="true"
          className={`size-4 ${loading ? "animate-spin" : ""}`}
        />
        {loading ? rt("checking") : rt("recheck")}
      </Button>
    </section>
  );
}

function AssessmentCard({
  title,
  assessment,
  loading,
}: {
  title: string;
  assessment: AssetReadinessAssessment | null;
  loading: boolean;
}) {
  const { locale } = useLocalization();
  const rt = (key: Parameters<typeof readinessTranslate>[1]) =>
    readinessTranslate(locale, key);
  const status = loading ? "checking" : badgeStatus(assessment);
  const label =
    status === "ready"
      ? rt("ready")
      : status === "blocked"
        ? rt("blocked")
        : status === "unavailable"
          ? rt("unavailable")
          : rt("checking");
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <ReadinessBadge status={status} locale={locale} label={label} />
      </div>
      {assessment?.status === "blocked" && (
        <p className="mt-3 text-sm leading-6 text-foreground">
          {readinessReason(locale, assessment.blockingCode)}
        </p>
      )}
      {assessment?.status === "ready" && (
        <p className="mt-3 text-sm leading-6 text-muted">
          {assessment.role === "recipient" ? rt("recipientReady") : rt("ready")}
        </p>
      )}
      {assessment?.status === "unavailable" && (
        <p className="mt-3 text-sm leading-6 text-muted">
          {rt("unavailableBody")}
        </p>
      )}
    </article>
  );
}

function Fact({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words font-mono text-sm font-semibold ${
          danger ? "text-danger" : "text-foreground"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
