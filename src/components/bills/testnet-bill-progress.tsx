"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
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
import { useProgressLocalization } from "@/features/localization/progress-catalog";
import { formatMoneyAmount } from "@/features/money/money";

export type TestnetBillProgressProps = {
  capabilityToken?: string;
};

type State =
  | { kind: "loading" }
  | { kind: "loaded"; progress: BillProgress }
  | { kind: "error"; message: string };

type Slot = BillProgress["slots"][number];
type SlotStatus = Slot["status"];
type ProgressTranslator = ReturnType<typeof useProgressLocalization>["gt"];

function shortValue(value: string, start = 12, end = 10) {
  return value.length > start + end + 1
    ? `${value.slice(0, start)}…${value.slice(-end)}`
    : value;
}

function amount(value: BillProgress["bill"]["totalAmount"]) {
  return `${formatMoneyAmount(value)} ${value.code}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof BillProgressRequestError ? error.message : fallback;
}

export function TestnetBillProgress({
  capabilityToken,
}: TestnetBillProgressProps) {
  const { capability, resolved } = useCapabilityToken(capabilityToken);
  const { gt } = useProgressLocalization();

  if (!resolved) return <Loading />;
  if (!capability) {
    return (
      <ErrorPanel
        title={gt("linkUnavailable")}
        message={gt("invalidLink")}
      />
    );
  }

  return <ProgressLoader key={capability} capability={capability} />;
}

function ProgressLoader({ capability }: { capability: string }) {
  const { gt } = useProgressLocalization();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    requestBillProgress(capability).then(
      (progress: BillProgress) => {
        if (active) setState({ kind: "loaded", progress });
      },
      (error: unknown) => {
        if (active) {
          setState({
            kind: "error",
            message: errorMessage(error, gt("fallback")),
          });
        }
      },
    );
    return () => {
      active = false;
    };
    // Capability is the request identity; locale changes update text only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capability]);

  async function refresh() {
    setRefreshing(true);
    try {
      setState({
        kind: "loaded",
        progress: await requestBillProgress(capability),
      });
    } catch (error: unknown) {
      setState({
        kind: "error",
        message: errorMessage(error, gt("fallback")),
      });
    } finally {
      setRefreshing(false);
    }
  }

  if (state.kind === "loading") return <Loading />;
  if (state.kind === "error") {
    return (
      <ErrorPanel
        title={gt("unavailable")}
        message={state.message}
        action={
          <Button
            variant="secondary"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            {refreshing ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <RefreshCw aria-hidden="true" className="size-4" />
            )}
            {gt("retry")}
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
  const { gt } = useProgressLocalization();
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
                  {isAdmin ? gt("creatorView") : gt("readOnlyView")}
                </span>
                <span className="rounded-pill border border-border px-3 py-1 text-xs font-bold">
                  {progress.bill.asset.symbol}
                </span>
                <span className="rounded-pill border border-border px-3 py-1 text-xs font-bold">
                  XRPL Testnet
                </span>
              </div>
              <h2 className="mt-4 font-heading text-3xl font-semibold sm:text-4xl">
                {progress.bill.title}
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted">
                {gt("exactPayment", { asset: progress.bill.asset.symbol })}
              </p>
              {progress.bill.asset.assetType === "issued" && (
                <p
                  className="mt-2 break-all font-mono text-xs text-muted"
                  title={progress.bill.asset.issuer}
                >
                  {gt("issuer", { issuer: progress.bill.asset.issuer })}
                </p>
              )}
            </div>
            <Button variant="secondary" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <RefreshCw aria-hidden="true" className="size-4" />
              )}
              {gt("refresh")}
            </Button>
          </div>

          <div className="mt-7">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold">{gt("progress")}</span>
              <span className="text-muted">
                {gt("paidCount", {
                  paid: progress.summary.paidCount,
                  total: progress.summary.participantCount,
                })}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={gt("progress")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion}
              className="mt-3 h-3 overflow-hidden rounded-full bg-border"
            >
              <div
                className="h-full rounded-full bg-success transition-[width]"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </div>

        <dl className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={gt("billTotal")} value={amount(progress.bill.totalAmount)} />
          <Metric
            label={gt("verified")}
            value={amount(progress.summary.paidAmount)}
          />
          <Metric
            label={gt("pending")}
            value={String(progress.summary.pendingCount)}
          />
          <Metric
            label={gt("review")}
            value={String(progress.summary.reviewCount)}
            alert={progress.summary.reviewCount > 0}
          />
        </dl>
      </section>

      {progress.bill.status === "settled" && (
        <section className="rounded-xl border border-success/25 bg-success/10 p-5 text-success sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 size-7 shrink-0"
            />
            <div>
              <h3 className="font-heading text-xl font-semibold">
                {gt("complete")}
              </h3>
              <p className="mt-1 leading-7">{gt("completeBody")}</p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <UserRoundCog aria-hidden="true" className="size-6 text-brand" />
          ) : (
            <ShieldCheck aria-hidden="true" className="size-6 text-brand" />
          )}
          <div>
            <h3 className="font-heading text-2xl font-semibold">{gt("slots")}</h3>
            <p className="mt-1 text-sm text-muted">
              {isAdmin ? gt("adminBody") : gt("publicBody")}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {progress.slots.map((slot: Slot, index: number) => (
            <SlotCard
              key={slot.publicId}
              slot={slot}
              isAdmin={isAdmin}
              index={index}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function SlotCard({
  slot,
  isAdmin,
  index,
}: {
  slot: Slot;
  isAdmin: boolean;
  index: number;
}) {
  const { gt } = useProgressLocalization();
  const status = slotStatus(slot.status, gt);
  const proofUrl = slot.proofToken
    ? `/testnet/proof#token=${slot.proofToken}`
    : null;

  return (
    <article className="rounded-lg border border-border bg-background p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {isAdmin
              ? gt("participant", { number: index + 1 })
              : gt("paymentSlot", { number: index + 1 })}
          </p>
          <h4 className="mt-1 font-heading text-lg font-semibold">
            {isAdmin && slot.participantLabel
              ? slot.participantLabel
              : gt("paymentSlot", { number: index + 1 })}
          </h4>
          {isAdmin && slot.expectedPayerAddress && (
            <p
              className="mt-2 break-all font-mono text-xs text-muted"
              title={slot.expectedPayerAddress}
            >
              {gt("expectedWallet", {
                wallet: shortValue(slot.expectedPayerAddress),
              })}
            </p>
          )}
          {slot.paidTransactionId && (
            <p
              className="mt-2 break-all font-mono text-xs text-muted"
              title={slot.paidTransactionId}
            >
              {gt("verifiedTx", {
                transaction: shortValue(slot.paidTransactionId),
              })}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <p className="font-heading text-xl font-semibold text-brand">
            {formatMoneyAmount(slot.expectedAmount)} {slot.expectedAmount.code}
          </p>
          <span className={status.className}>{status.label}</span>
          {proofUrl && (
            <a
              href={proofUrl}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline"
            >
              {gt("publicProof")}
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function slotStatus(status: SlotStatus, gt: ProgressTranslator) {
  if (status === "paid") {
    return {
      label: gt("paid"),
      className:
        "rounded-pill bg-success/10 px-3 py-1 text-xs font-bold text-success",
    };
  }
  if (status === "needs_review") {
    return {
      label: gt("needsReview"),
      className:
        "rounded-pill bg-danger/10 px-3 py-1 text-xs font-bold text-danger",
    };
  }
  if (status === "verification_failed") {
    return {
      label: gt("verificationFailed"),
      className:
        "rounded-pill bg-danger/10 px-3 py-1 text-xs font-bold text-danger",
    };
  }
  if (status === "submitted") {
    return {
      label: gt("submitted"),
      className:
        "rounded-pill bg-action/10 px-3 py-1 text-xs font-bold text-action",
    };
  }
  if (status === "validating") {
    return {
      label: gt("validating"),
      className:
        "rounded-pill bg-action/10 px-3 py-1 text-xs font-bold text-action",
    };
  }
  if (status === "payload_created" || status === "awaiting_signature") {
    return {
      label: gt("awaitingSignature"),
      className:
        "rounded-pill bg-action/10 px-3 py-1 text-xs font-bold text-action",
    };
  }
  if (status === "rejected") {
    return {
      label: gt("rejected"),
      className:
        "rounded-pill bg-danger/10 px-3 py-1 text-xs font-bold text-danger",
    };
  }
  if (status === "expired") {
    return {
      label: gt("expired"),
      className:
        "rounded-pill bg-border px-3 py-1 text-xs font-bold text-muted",
    };
  }
  return {
    label: gt("unpaid"),
    className: "rounded-pill bg-border px-3 py-1 text-xs font-bold text-muted",
  };
}

function Metric({
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
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd
        className={`mt-2 font-heading text-xl font-semibold ${alert ? "text-danger" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Loading() {
  const { gt } = useProgressLocalization();
  return (
    <div className="flex min-h-80 items-center justify-center rounded-xl border border-border bg-surface">
      <div className="text-center">
        <LoaderCircle
          aria-hidden="true"
          className="mx-auto size-9 animate-spin text-brand"
        />
        <p className="mt-4 font-semibold">{gt("loading")}</p>
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
      <CircleAlert
        aria-hidden="true"
        className="mx-auto size-11 text-danger"
      />
      <h2 className="mt-4 font-heading text-2xl font-semibold">{title}</h2>
      <p className="mt-3 leading-7 text-muted">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </section>
  );
}
