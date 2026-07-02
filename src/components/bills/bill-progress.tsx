"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Copy,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";

import {
  billGroupSemanticStatus,
  billProgressSemanticStatus,
  slotSafeActionKey,
} from "@/components/bills/bill-progress-status";
import { ContextualHelp } from "@/components/help/contextual-help";
import { Button } from "@/components/ui/button";
import {
  AssetBadge,
  LinkTypeBadge,
  RoleBadge,
} from "@/components/ui/identity-badges";
import { NetworkBadge } from "@/components/ui/network-badge";
import {
  CardAccent,
  StatusBadge,
} from "@/components/ui/semantic-status";
import type { BillProgress as BillProgressSnapshot } from "@/features/bills/progress";
import {
  BillProgressRequestError,
  requestBillProgress,
} from "@/features/bills/progress-client";
import { useCapabilityToken } from "@/features/capabilities/use-capability-token";
import { useLocalization } from "@/features/localization/provider";
import { useProgressLocalization } from "@/features/localization/progress-catalog";
import { formatMoneyAmount } from "@/features/money/money";
import { cn } from "@/lib/cn";

export type BillProgressProps = {
  capabilityToken?: string;
};

type State =
  | { kind: "loading" }
  | { kind: "loaded"; progress: BillProgressSnapshot }
  | { kind: "error"; message: string };

type Slot = BillProgressSnapshot["slots"][number];

function shortValue(value: string, start = 12, end = 10) {
  return value.length > start + end + 1
    ? `${value.slice(0, start)}…${value.slice(-end)}`
    : value;
}

function amount(value: BillProgressSnapshot["bill"]["totalAmount"]) {
  return `${formatMoneyAmount(value)} ${value.code}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof BillProgressRequestError ? error.message : fallback;
}

function localeTag(locale: "en" | "ja" | "ko") {
  return locale === "ja" ? "ja-JP" : locale === "ko" ? "ko-KR" : "en-US";
}

function displayTime(value: string, locale: "en" | "ja" | "ko") {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function transactionExplorerHref(
  network: BillProgressSnapshot["bill"]["network"],
  transactionId: string,
) {
  const host = network === "mainnet" ? "livenet.xrpl.org" : "testnet.xrpl.org";
  return `https://${host}/transactions/${transactionId}`;
}

export function BillProgress({ capabilityToken }: BillProgressProps) {
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
      (progress: BillProgressSnapshot) => {
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
    <ProgressSnapshotView
      progress={state.progress}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    />
  );
}

function ProgressSnapshotView({
  progress,
  refreshing,
  onRefresh,
}: {
  progress: BillProgressSnapshot;
  refreshing: boolean;
  onRefresh(): void;
}) {
  const { gt } = useProgressLocalization();
  const { locale } = useLocalization();
  const isAdmin = progress.access === "admin";
  const isSettled = progress.bill.status === "settled";
  const isClosed = progress.bill.status === "closed_incomplete";
  const completion =
    progress.summary.participantCount === 0
      ? 0
      : Math.round(
          (progress.summary.paidCount / progress.summary.participantCount) *
            100,
        );
  const networkLabel =
    progress.bill.network === "mainnet" ? "XRPL Mainnet" : "XRPL Testnet";
  const groupStatus = billGroupSemanticStatus(progress.bill.status, gt);

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {isAdmin ? (
                  <RoleBadge
                    role="operator"
                    locale={locale}
                    label={gt("creatorView")}
                  />
                ) : (
                  <LinkTypeBadge
                    type="progress"
                    locale={locale}
                    label={gt("readOnlyView")}
                  />
                )}
                <AssetBadge
                  symbol={progress.bill.asset.symbol}
                  official={progress.bill.asset.symbol === "RLUSD"}
                  locale={locale}
                />
                <NetworkBadge
                  network={progress.bill.network}
                  label={networkLabel}
                />
                <StatusBadge
                  family={groupStatus.family}
                  label={groupStatus.label}
                  animated={groupStatus.animated}
                />
                <span className="inline-flex min-h-7 items-center rounded-pill border border-border bg-background px-2.5 py-1 text-xs font-bold text-muted">
                  {progress.bill.paymentMode === "representative"
                    ? gt("representativeMode")
                    : gt("directMode")}
                </span>
              </div>
              <h2 className="mt-4 font-heading text-3xl font-semibold sm:text-4xl">
                {progress.bill.title}
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted">
                {gt("exactPayment", { asset: progress.bill.asset.symbol })}
              </p>
              {isAdmin && progress.bill.recipientLabel && (
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {progress.bill.recipientLabel}
                </p>
              )}
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
                className={cn(
                  "h-full rounded-full transition-[width] motion-reduce:transition-none",
                  isSettled ? "bg-success" : "bg-brand",
                )}
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted">
              {gt("refreshedAt", {
                time: displayTime(progress.bill.updatedAt, locale),
              })}
            </p>
          </div>
        </div>

        <dl className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label={gt("expected")}
            value={amount(progress.summary.expectedExternalAmount)}
          />
          <Metric
            label={gt("verified")}
            value={amount(progress.summary.paidAmount)}
          />
          <Metric
            label={gt("remaining")}
            value={amount(progress.summary.remainingAmount)}
            alert={progress.summary.reviewCount > 0}
          />
          <Metric
            label={gt("payerCount")}
            value={gt("payerCountValue", {
              paid: progress.summary.paidCount,
              remaining: progress.summary.remainingCount,
            })}
          />
        </dl>

        <dl className="grid border-t border-border bg-background sm:grid-cols-2">
          <CompactMetric
            label={gt("billTotal")}
            value={amount(progress.bill.totalAmount)}
          />
          <CompactMetric
            label={gt("recipientFunded")}
            value={amount(progress.bill.recipientFundedAmount)}
            muted={progress.bill.paymentMode === "direct"}
          />
        </dl>
      </section>

      {isSettled && (
        <CardAccent
          family="complete"
          className="rounded-xl border border-success/25 bg-success/10 p-5 text-success sm:p-6"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-7 shrink-0" />
            <div>
              <h3 className="font-heading text-xl font-semibold">
                {gt("complete")}
              </h3>
              <p className="mt-1 leading-7">{gt("completeBody")}</p>
            </div>
          </div>
        </CardAccent>
      )}

      <LinkHandlingCard isAdmin={isAdmin} />

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
          {progress.slots.map((slot, index) => (
            <SlotCard
              key={slot.publicId}
              slot={slot}
              isAdmin={isAdmin}
              isClosed={isClosed}
              network={progress.bill.network}
              index={index}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function LinkHandlingCard({ isAdmin }: { isAdmin: boolean }) {
  const { gt } = useProgressLocalization();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  async function copyCurrentLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <CardAccent
      family={isAdmin ? "action_required" : "neutral"}
      className="rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-xl font-semibold">
              {gt("shareTitle")}
            </h3>
            <ContextualHelp topic="capability-privacy" variant="inline" />
          </div>
          <p className="mt-2 leading-7 text-muted">
            {isAdmin ? gt("adminShareBody") : gt("publicShareBody")}
          </p>
        </div>
        <div className="shrink-0">
          <Button type="button" variant="secondary" onClick={() => void copyCurrentLink()}>
            <Copy aria-hidden="true" className="size-4" />
            {isAdmin ? gt("copyManagement") : gt("copyReadOnly")}
          </Button>
          {copyState !== "idle" && (
            <p
              role="status"
              className={cn(
                "mt-2 text-center text-xs font-semibold",
                copyState === "failed" ? "text-danger" : "text-success",
              )}
            >
              {copyState === "copied" ? gt("copied") : gt("copyFailed")}
            </p>
          )}
        </div>
      </div>
    </CardAccent>
  );
}

function SlotCard({
  slot,
  isAdmin,
  isClosed,
  network,
  index,
}: {
  slot: Slot;
  isAdmin: boolean;
  isClosed: boolean;
  network: BillProgressSnapshot["bill"]["network"];
  index: number;
}) {
  const { gt } = useProgressLocalization();
  const { locale } = useLocalization();
  const status = billProgressSemanticStatus(slot.status, gt);
  const safeAction = gt(slotSafeActionKey(slot.status, isClosed));
  const proofUrl = slot.proofToken ? `/proof#token=${slot.proofToken}` : null;
  const explorerUrl = slot.paidTransactionId
    ? transactionExplorerHref(network, slot.paidTransactionId)
    : null;

  return (
    <CardAccent
      family={status.family}
      className="rounded-lg border border-border bg-background p-5"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
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

          <dl className="mt-3 space-y-2 text-sm text-muted">
            {isAdmin && slot.expectedPayerAddress && (
              <DetailRow
                label={gt("expectedWallet", {
                  wallet: shortValue(slot.expectedPayerAddress),
                })}
                value={slot.expectedPayerAddress}
              />
            )}
            {isAdmin && slot.invoiceId && (
              <DetailRow
                label={gt("invoiceId", {
                  invoice: shortValue(slot.invoiceId),
                })}
                value={slot.invoiceId}
              />
            )}
            {slot.paidTransactionId && (
              <DetailRow
                label={gt("verifiedTx", {
                  transaction: shortValue(slot.paidTransactionId),
                })}
                value={slot.paidTransactionId}
              />
            )}
            {slot.paidLedgerIndex !== null && (
              <p>{gt("ledgerIndex", { ledger: slot.paidLedgerIndex })}</p>
            )}
            {slot.paidAt && (
              <p>
                {gt("confirmedAt", {
                  time: displayTime(slot.paidAt, locale),
                })}
              </p>
            )}
            {!slot.paidAt && (
              <p>
                {gt("updatedAt", {
                  time: displayTime(slot.updatedAt, locale),
                })}
              </p>
            )}
            {isAdmin && slot.reviewReasonCode && (
              <p className="font-mono text-xs text-danger">
                {gt("reviewReason", { reason: slot.reviewReasonCode })}
              </p>
            )}
          </dl>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <p className="font-heading text-xl font-semibold text-brand">
            {formatMoneyAmount(slot.expectedAmount)} {slot.expectedAmount.code}
          </p>
          <StatusBadge
            family={status.family}
            label={status.label}
            animated={status.animated}
          />
          <div className="flex flex-wrap gap-3 sm:justify-end">
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline"
              >
                {gt("explorer")}
                <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            )}
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
      </div>

      <div className="mt-5 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-foreground">{safeAction}</p>
          <ContextualHelp
            topic={slot.status === "paid" ? "payment-status" : "safe-recovery"}
            variant="inline"
          />
        </div>
        {isAdmin && slot.status !== "paid" && !isClosed && (
          <p className="mt-2 text-sm leading-6 text-muted">
            {gt("noWalletControl")}
          </p>
        )}
      </div>
    </CardAccent>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="break-all font-mono text-xs" title={value}>
      {label}
    </p>
  );
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
        className={cn(
          "mt-2 font-heading text-xl font-semibold",
          alert && "text-danger",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function CompactMetric({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className={cn("font-semibold", muted && "text-muted")}>{value}</dd>
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
      <CircleAlert aria-hidden="true" className="mx-auto size-11 text-danger" />
      <h2 className="mt-4 font-heading text-2xl font-semibold">{title}</h2>
      <p className="mt-3 leading-7 text-muted">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </section>
  );
}
