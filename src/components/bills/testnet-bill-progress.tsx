"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Eye,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BillProgress } from "@/features/bills/progress";
import {
  BillProgressRequestError,
  requestBillProgress,
} from "@/features/bills/progress-client";
import { useCapabilityToken } from "@/features/capabilities/use-capability-token";
import { formatMoneyAmount } from "@/features/money/money";

export type TestnetBillProgressProps = {
  capabilityToken?: string;
};

type ViewState =
  | { kind: "loading" }
  | { kind: "loaded"; progress: BillProgress }
  | { kind: "error"; message: string };

type SlotStatus = BillProgress["slots"][number]["status"];

function formatAmount(value: BillProgress["bill"]["totalAmount"]) {
  return `${formatMoneyAmount(value)} ${value.code}`;
}

function shortValue(value: string, start = 9, end = 7) {
  return value.length > start + end + 1
    ? `${value.slice(0, start)}…${value.slice(-end)}`
    : value;
}

function errorMessage(error: unknown) {
  return error instanceof BillProgressRequestError
    ? error.message
    : "The bill progress could not be loaded.";
}

function statusView(status: SlotStatus) {
  if (status === "paid") {
    return { label: "Paid", icon: CheckCircle2, className: "text-success" };
  }
  if (status === "needs_review" || status === "verification_failed") {
    return {
      label: status === "needs_review" ? "Needs review" : "Verification failed",
      icon: CircleAlert,
      className: "text-danger",
    };
  }
  if (status === "submitted" || status === "validating") {
    return {
      label: status === "submitted" ? "Submitted" : "Validating",
      icon: LoaderCircle,
      className: "text-action",
    };
  }
  if (status === "payload_created" || status === "awaiting_signature") {
    return { label: "Awaiting signature", icon: Clock3, className: "text-action" };
  }
  if (status === "rejected") {
    return { label: "Rejected", icon: CircleAlert, className: "text-muted" };
  }
  if (status === "expired") {
    return { label: "Request expired", icon: Clock3, className: "text-muted" };
  }
  return { label: "Unpaid", icon: Clock3, className: "text-muted" };
}

export function TestnetBillProgress({ capabilityToken }: TestnetBillProgressProps) {
  const { capability, resolved } = useCapabilityToken(capabilityToken);

  if (!resolved) return <Loading />;
  if (!capability) {
    return (
      <ErrorPanel
        title="Bill progress link unavailable"
        message="This link is incomplete or invalid. Ask the bill creator for a new progress link."
      />
    );
  }

  return <Loader key={capability} capability={capability} />;
}

function Loader({ capability }: { capability: string }) {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    requestBillProgress(capability).then(
      (progress) => active && setState({ kind: "loaded", progress }),
      (error: unknown) =>
        active && setState({ kind: "error", message: errorMessage(error) }),
    );
    return () => {
      active = false;
    };
  }, [capability]);

  async function refresh() {
    setRefreshing(true);
    try {
      setState({ kind: "loaded", progress: await requestBillProgress(capability) });
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
    } finally {
      setRefreshing(false);
    }
  }

  if (state.kind === "loading") return <Loading />;
  if (state.kind === "error") {
    return (
      <ErrorPanel
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
    <Snapshot
      progress={state.progress}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    />
  );
}

function Snapshot({
  progress,
  refreshing,
  onRefresh,
}: {
  progress: BillProgress;
  refreshing: boolean;
  onRefresh(): void;
}) {
  const isAdmin = progress.access === "admin";
  const completion =
    progress.summary.participantCount === 0
      ? 0
      : Math.round(
          (progress.summary.paidCount / progress.summary.participantCount) * 100,
        );

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
                <span className="rounded-pill border border-border px-3 py-1 text-xs font-bold">
                  {progress.bill.asset.symbol}
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
                Each slot updates only after its exact {progress.bill.asset.symbol}
                Payment is verified on a validated XRP Ledger.
              </p>
              {progress.bill.asset.assetType === "issued" && (
                <p
                  className="mt-3 break-all font-mono text-xs text-muted"
                  title={progress.bill.asset.issuer}
                >
                  Official issuer {progress.bill.asset.issuer}
                </p>
              )}
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
          <Summary label="Bill total" value={formatAmount(progress.bill.totalAmount)} />
          <Summary
            label="Verified externally"
            value={formatAmount(progress.summary.paidAmount)}
          />
          <Summary label="Pending slots" value={String(progress.summary.pendingCount)} />
          <Summary
            label="Needs review"
            value={String(progress.summary.reviewCount)}
            alert={progress.summary.reviewCount > 0}
          />
        </div>
      </section>

      {progress.bill.status === "settled" && (
        <section className="flex items-start gap-4 rounded-xl border border-success/25 bg-success/10 p-5 text-success sm:p-6">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-7 shrink-0" />
          <div>
            <h3 className="font-heading text-xl font-semibold">Settlement complete</h3>
            <p className="mt-1 leading-7">
              All externally payable slots have a durable verified receipt.
            </p>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h3 className="font-heading text-2xl font-semibold">Participant slots</h3>
        <p className="mt-1 text-sm text-muted">
          {isAdmin
            ? "Creator details are visible because this is the management capability."
            : "Participant labels and expected wallet addresses are hidden in the read-only view."}
        </p>

        <div className="mt-6 space-y-4">
          {progress.slots.map((slot, index) => {
            const presentation = statusView(slot.status);
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
                      <p className="mt-1 font-mono text-xs text-muted">
                        Expected wallet {shortValue(slot.expectedPayerAddress)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <span className="font-heading text-xl font-semibold text-brand">
                      {formatAmount(slot.expectedAmount)}
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
                  <p className="mt-4 border-t border-border pt-4 font-mono text-xs text-muted">
                    Verified transaction {shortValue(slot.paidTransactionId, 12, 10)}
                  </p>
                )}

                {slot.proofToken && (
                  <a
                    href={`/testnet/proof#token=${slot.proofToken}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-brand"
                  >
                    View public proof
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                )}

                {isAdmin && slot.invoiceId && (
                  <p className="mt-4 font-mono text-xs text-muted">
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

function Summary({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="border-b border-border p-5 sm:border-r lg:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className={`mt-2 font-heading text-xl font-semibold ${alert ? "text-danger" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-xl border border-border bg-surface">
      <div className="text-center">
        <LoaderCircle aria-hidden="true" className="mx-auto size-9 animate-spin text-brand" />
        <p className="mt-4 font-semibold">Loading bill progress</p>
      </div>
    </div>
  );
}

function ErrorPanel({
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
