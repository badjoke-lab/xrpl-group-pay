"use client";

import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { ContextualHelp } from "@/components/help/contextual-help";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/semantic-status";
import {
  payerLifecycleTranslate,
  type PayerLifecycleMessageKey,
} from "@/features/localization/payer-lifecycle-catalog";
import { useLocalization } from "@/features/localization/provider";
import type { PayerLifecycleView } from "@/features/payment-recovery/payer-lifecycle";

function keys(kind: PayerLifecycleView["kind"]): {
  title: PayerLifecycleMessageKey;
  body: PayerLifecycleMessageKey;
  badge: PayerLifecycleMessageKey;
} {
  return {
    title: `${kind}_title` as PayerLifecycleMessageKey,
    body: `${kind}_body` as PayerLifecycleMessageKey,
    badge: `${kind}_title` as PayerLifecycleMessageKey,
  };
}

function presentation(kind: PayerLifecycleView["kind"]) {
  if (kind === "already_paid") {
    return {
      icon: CheckCircle2,
      family: "complete" as const,
      iconClass: "text-success",
    };
  }
  if (kind === "wait_recheck") {
    return {
      icon: Clock3,
      family: "in_progress" as const,
      iconClass: "text-action",
    };
  }
  if (kind === "retry_safe") {
    return {
      icon: RefreshCw,
      family: "action_required" as const,
      iconClass: "text-action",
    };
  }
  if (kind === "setup_required") {
    return {
      icon: ShieldCheck,
      family: "action_required" as const,
      iconClass: "text-action",
    };
  }
  if (kind === "review_required") {
    return {
      icon: ShieldAlert,
      family: "attention" as const,
      iconClass: "text-danger",
    };
  }
  return {
    icon: XCircle,
    family: "neutral" as const,
    iconClass: "text-muted",
  };
}

export function PayerLifecyclePanel({
  lifecycle,
  message,
  transactionId = null,
  working = false,
  onRetry,
  onRecheck,
  onSetup,
}: {
  lifecycle: PayerLifecycleView;
  message?: string | null;
  transactionId?: string | null;
  working?: boolean;
  onRetry?: () => void;
  onRecheck?: () => void;
  onSetup?: () => void;
}) {
  const { locale } = useLocalization();
  const t = (key: PayerLifecycleMessageKey) =>
    payerLifecycleTranslate(locale, key);
  const labels = keys(lifecycle.kind);
  const style = presentation(lifecycle.kind);
  const Icon = style.icon;
  const action = lifecycle.retryAllowed
    ? onRetry
    : lifecycle.recheckAllowed
      ? onRecheck
      : lifecycle.setupAllowed
        ? onSetup
        : undefined;
  const actionLabel = lifecycle.retryAllowed
    ? t("retry")
    : lifecycle.recheckAllowed
      ? t("checkAgain")
      : lifecycle.setupAllowed
        ? t("returnReadiness")
        : null;

  return (
    <div className="flex min-h-80 flex-col items-center justify-center text-center">
      <Icon aria-hidden="true" className={`size-12 ${style.iconClass}`} />
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <StatusBadge
          family={style.family}
          label={t(labels.badge)}
          animated={lifecycle.kind === "wait_recheck" && working}
        />
        <ContextualHelp topic={lifecycle.helpTopic} variant="inline" />
      </div>
      <h2 className="mt-4 font-heading text-2xl font-semibold">
        {t(labels.title)}
      </h2>
      <p className="mt-3 max-w-xl leading-7 text-muted">
        {message || t(labels.body)}
      </p>

      {lifecycle.retryAllowed &&
        lifecycle.replacementRule === "reconcile_first" && (
          <p className="mt-4 max-w-xl rounded-lg border border-action/25 bg-action/10 p-4 text-sm leading-6 text-foreground">
            {t("reconcile")}
          </p>
        )}

      {!action && lifecycle.kind !== "already_paid" && (
        <p className="mt-4 max-w-xl rounded-lg border border-border bg-background p-4 text-sm font-semibold text-muted">
          {t("no_retry")}
        </p>
      )}

      {action && actionLabel && (
        <Button type="button" className="mt-6" onClick={action} disabled={working}>
          {working ? (
            <RefreshCw aria-hidden="true" className="size-4 animate-spin" />
          ) : lifecycle.retryAllowed || lifecycle.recheckAllowed ? (
            <RefreshCw aria-hidden="true" className="size-4" />
          ) : (
            <ShieldCheck aria-hidden="true" className="size-4" />
          )}
          {actionLabel}
        </Button>
      )}

      <details className="mt-6 w-full max-w-xl rounded-lg border border-border bg-background text-left">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
          {t("technical")}
        </summary>
        <dl className="space-y-3 border-t border-border px-4 py-4 text-sm">
          <Detail label={t("code")} value={lifecycle.code} />
          {lifecycle.diagnosticCode && (
            <Detail
              label={t("diagnostic")}
              value={lifecycle.diagnosticCode}
            />
          )}
          {transactionId && (
            <Detail label={t("transaction")} value={transactionId} />
          )}
        </dl>
      </details>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr]">
      <dt className="font-semibold text-muted">{label}</dt>
      <dd className="break-all font-mono text-xs text-foreground">{value}</dd>
    </div>
  );
}

export function PayerLifecycleErrorIcon() {
  return <TriangleAlert aria-hidden="true" className="size-11 text-danger" />;
}
