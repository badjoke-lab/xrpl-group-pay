"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UserRoundCog,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  requestBillProgress,
  BillProgressRequestError,
} from "@/features/bills/progress-client";
import type {
  BillProgress,
  paymentSlotProgressStatusSchema,
} from "@/features/bills/progress";
import { useCapabilityToken } from "@/features/capabilities/use-capability-token";

export type TestnetBillProgressProps = {
  capabilityToken?: string;
};

type ProgressViewState =
  | { kind: "loading" }
  | { kind: "loaded"; progress: BillProgress }
  | { kind: "error"; message: string };

type SlotStatus = typeof paymentSlotProgressStatusSchema._type;

function dropsToXrp(drops: string) {
  const padded = drops.padStart(7, "0");
  const whole = padded.slice(0, -6);
  const fraction = padded.slice(-6).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function shortValue(value: string, start = 9, end = 7) {
  return value.length > start + end + 1
    ? `${value.slice(0, start)}…${value.slice(-end)}`
    : value;
}

function statusPresentation(status: SlotStatus) {
  if (status === "paid") {
    return {
      label: "Paid",
      icon: CheckCircle2,
      className: "bg-success/10 text-success",
    };
  }
  if (status === "needs_review" || status === "verification_failed") {
    return {
      label: status === "needs_review" ? "Needs review" : "Verification failed",
      icon: CircleAlert,
      className: "bg-danger/10 text-danger",
    };
  }
  if (status === "submitted" || status === "validating") {
    return {
      label: status === "submitted" ? "Submitted" : "Validating",
      icon: LoaderCircle,
      className: "bg-action/10 text-action",
    };
  }
  if (status === "payload_created" || status === "awaiting_signature") {
    return {
      label: "Awaiting signature",
      icon: Clock3,
      className: "bg-action/10 text-action",
    };
  }
  if (status === "rejected") {
    return {
      label: "Rejected",
      icon: CircleAlert,
      className: "bg-muted/10 text-muted",
    };
  }
  if (status === "expired") {
    return {
      label: "Request expired",
      icon: Clock3,
      className: "bg-muted/10 text-muted",
    };
  }
  return {
    label: "Unpaid",
    icon: Clock3,
    className: "bg-muted/10 text-muted",
  };
}

export function TestnetBillProgress({
  capabilityToken,
}: TestnetBillProgressProps) {
  const { capability, resolved } = useCapabilityToken(capabilityToken);

  if (!resolved) {
    return <ProgressLoading />;
  }
  if (!capability) {
    return (
      <ProgressError
        title="Bill progress link unavailable"
        message="This link is incomplete or invalid. Ask the bill creator for a new progress link."
      />
    );
  }

  return <BillProgressLoader key={capability} capability={capability} />;
}

function BillProgressLoader({ capability }: { capability: string }) {
  const [state, setState] = useState<ProgressViewState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const progress = await requestBillProgress(capability);
      setState({ kind: "loaded", progress });
    } catch (error) {
      setState({
        kind: "error",
        message:
          error instanceof BillProgressRequestError
            ? error.message
            : "The bill progress could not be loaded.",
      });
    }
  }, [capability]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (state.kind === "loading") {
    return <ProgressLoading />;
  }
  if (state.kind === "error") {
    return (
      <ProgressError
        title="Bill progress unavailable"
        message={state.message}
        action={
          <Button variant="secondary" onClick={() => void refresh()} disabled={refreshing}>
            {refreshing ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <RefreshCw aria-hidden="true" className="size-4" />
            )}
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <ProgressSnapshot
      progress={state.progress}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    />
  );
}

function ProgressSnapshot({
  progress,
  refreshing,
  onRefresh,
}: {
  progress: BillProgress;
  refreshing: boolean;
  onRefresh(): void;
}) {
  const completion =
    progress.summary.participantCount === 0
      ? 0
      : Math.round(
          (progress.summary.paidCount / progress.summary.participantCount) * 100,
        );
  const isSettled = progress.bill.status === "settled";
  const isAdmin = progress.access === "admin";

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-pill bg-brand-subtle px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-brand">
                  Testnet
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-pill border border-border px-3 py-1 text-xs font-semibold text-muted">
                  {isAdmin ? (
                    <UserRoundCog aria-hidden="true" className="size-3.5" />
                  ) : (
                    <Eye aria-hidden="true" className="size-3.5" />
                  )}
                  {isAdmin ? "Creator view" : "Read-only view"}
                </span>
              </div>
              <h2 className="mt-4 font-heading text-3xl font-semibold sm:text-4xl">
                {progress.bill.title}
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted">
                {isSettled
                  ? "Every participant payment has been verified on a validated XRP Ledger."
                  : "Each slot updates independently only after its exact XRP Payment is verified."}
              </p>
            </div>
            <Button variant="secondary" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <RefreshCw aria-hidden="true" className="size-4" />
              )}
              Refresh
            </Button>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">Settlement progress</span>
              <span className="font-semibold text-brand">
                {progress.summary.paidCount}/{progress.summary.participantCount} paid
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Settlement progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion}
              className="h-3 overflow-hidden rounded-pill bg-border"
            >
              <div
                className="h-full rounded-pill bg-brand transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCell
            label="Bill total"
            value={`${dropsToXrp(progress.bill.totalDrops)} XRP`}
          />
          <SummaryCell
            label="Verified externally"
            value={`${dropsToXrp(progress.summary.paidDrops)} XRP`}
          />
          <SummaryCell
            label="Pending slots"
            value={String(progress.summary.pendingCount)}
          />
          <SummaryCell
            label="Needs review"
            value={String(progress.summary.reviewCount)}
            alert={progress.summary.reviewCount > 0}
          />
        </div>
      </section>

      {isSettled && (
        <section className="flex items-start gap-4 rounded-xl border border-success/25 bg-success/10 p-5 text-success sm:p-6">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-7 shrink-0" />
          <div>
            <h3 className="font-heading text-xl font-semibold">Settlement complete</h3>
            <p className="mt-1 leading-7">
              The bill is settled because all externally payable slots have a durable verified receipt.
            </p>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <WalletCards aria-hidden="true" className="size-6 text-brand" />
          <div>
            <h3 className="font-heading text-2xl font-semibold">Participant slots</h3>
            <p className="mt-1 text-sm text-muted">
              {isAdmin
                ? "Creator details are visible because this is the management capability."
                : "Participant labels and expected wallet addresses are hidden in the read-only view."}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {progress.slots.map((slot, index) => {
            const presentation = statusPresentation(slot.status);
            const StatusIcon = presentation.icon;
            return (
              <article
                key={slot.publicId}
                className="rounded-lg border border-border bg-background p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      Participant {index + 1}
                    </p>
                    <h4 className="mt-1 font-heading text-lg font-semibold">
                      {slot.participantLabel || `Payment slot ${index + 1}`}
                    </h4>
                    {slot.expectedPayerAddress && (
                      <p
                        className="mt-1 font-mono text-xs text-muted"
                        title={slot.expectedPayerAddress}
                      >
                        Expected wallet {shortValue(slot.expectedPayerAddress)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <span className="font-heading text-xl font-semibold text-brand">
                      {dropsToXrp(slot.expectedAmountDrops)} XRP
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-bold ${presentation.className}`}
                    >
                      <StatusIcon
                        aria-hidden="true"
                        className={`size-3.5 ${slot.status === "validating" ? "animate-spin" : ""}`}
                      />
                      {presentation.label}
                    </span>
                  </div>
                </div>

                {slot.paidTransactionId && (
                  <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted">Verified transaction</dt>
                      <dd
                        className="mt-1 font-mono font-semibold"
                        title={slot.paidTransactionId}
                      >
                        {shortValue(slot.paidTransactionId, 12, 10)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Ledger index</dt>
                      <dd className="mt-1 font-semibold">
                        {slot.paidLedgerIndex ?? "Unavailable"}
                      </dd>
                    </div>
                  </dl>
                )}

                {isAdmin && slot.invoiceId && (
                  <p
                    className="mt-4 border-t border-border pt-4 font-mono text-xs text-muted"
                    title={slot.invoiceId}
                  >
                    InvoiceID {shortValue(slot.invoiceId, 12, 10)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="border-border p-5 not-last:border-b sm:odd:border-r sm:nth-[n+3]:border-b-0 lg:border-b-0 lg:not-last:border-r">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p
        className={`mt-2 font-heading text-xl font-semibold ${alert ? "text-danger" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function ProgressLoading() {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-xl border border-border bg-surface">
      <div className="text-center">
        <LoaderCircle
          aria-hidden="true"
          className="mx-auto size-9 animate-spin text-brand"
        />
        <p className="mt-4 font-semibold">Loading bill progress</p>
      </div>
    </div>
  );
}

function ProgressError({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-danger/25 bg-surface p-7 text-center shadow-sm sm:p-9">
      <CircleAlert aria-hidden="true" className="mx-auto size-11 text-danger" />
      <h2 className="mt-4 font-heading text-2xl font-semibold">{title}</h2>
      <p className="mt-3 leading-7 text-muted">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </section>
  );
}
