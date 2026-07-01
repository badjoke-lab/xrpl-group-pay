"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCapabilityToken } from "@/features/capabilities/use-capability-token";
import { useLocalization } from "@/features/localization/provider";
import {
  trustSetTranslate,
  type TrustSetMessageKey,
} from "@/features/localization/trustset-catalog";
import { unitsToDecimal } from "@/features/money/money";
import type {
  RlusdTrustSetProviderStatus,
  RlusdTrustSetPurpose,
  RlusdTrustSetStatus,
} from "@/features/xrpl/rlusd-trustset-store";

export type RlusdTrustSetLaunch = {
  publicId: string;
  status: RlusdTrustSetStatus;
  providerStatus: RlusdTrustSetProviderStatus | null;
  network: "testnet" | "mainnet";
  purpose: RlusdTrustSetPurpose;
  account: string;
  assetId: string;
  currency: string;
  issuer: string;
  requiredAmountUnits: string;
  amountScale: number;
  trustLimitUnits: string;
  trustLimitValue: string;
  payloadId: string | null;
  deepLink: string | null;
  qrImageUrl: string | null;
  statusChannel: string | null;
  expiresAt: string | null;
  transactionId: string | null;
  failureCode: string | null;
};

type State =
  | { kind: "loading" }
  | { kind: "loaded"; launch: RlusdTrustSetLaunch }
  | { kind: "error"; message: string };

class PreparationRequestError extends Error {
  constructor(
    readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = "PreparationRequestError";
  }
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new PreparationRequestError(
      body?.error?.code ?? null,
      body?.error?.message ?? "Request failed.",
    );
  }
  return body as RlusdTrustSetLaunch;
}

async function requestLaunch(
  endpoint: "details" | "payload" | "status",
  token: string,
) {
  const response = await fetch(`/api/rlusd/preparations/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preparationToken: token }),
    cache: "no-store",
  });
  return readJson(response);
}

function shortValue(value: string, start = 12, end = 10) {
  return value.length > start + end + 1
    ? `${value.slice(0, start)}…${value.slice(-end)}`
    : value;
}

export function RlusdTrustSetFlow({
  preparationToken,
}: {
  preparationToken?: string;
}) {
  const { locale } = useLocalization();
  const tt = useCallback(
    (key: TrustSetMessageKey) => trustSetTranslate(locale, key),
    [locale],
  );
  const { capability, resolved } = useCapabilityToken(preparationToken);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!capability) return;
    setState({ kind: "loading" });
    try {
      setState({
        kind: "loaded",
        launch: await requestLaunch("details", capability),
      });
    } catch {
      setState({ kind: "error", message: tt("unavailableBody") });
    }
  }, [capability, tt]);

  const check = useCallback(async () => {
    if (!capability) return;
    setWorking(true);
    try {
      setState({
        kind: "loaded",
        launch: await requestLaunch("status", capability),
      });
    } catch {
      setState({ kind: "error", message: tt("genericError") });
    } finally {
      setWorking(false);
    }
  }, [capability, tt]);

  const start = useCallback(async () => {
    if (!capability) return;
    setWorking(true);
    try {
      setState({
        kind: "loaded",
        launch: await requestLaunch("payload", capability),
      });
    } catch {
      setState({ kind: "error", message: tt("genericError") });
    } finally {
      setWorking(false);
    }
  }, [capability, tt]);

  useEffect(() => {
    if (!resolved) return;
    if (!capability) {
      setState({ kind: "error", message: tt("unavailableBody") });
      return;
    }
    void load();
  }, [capability, load, resolved, tt]);

  useEffect(() => {
    if (state.kind !== "loaded") return;
    const launch = state.launch;
    if (
      !["awaiting_signature", "submitted", "verifying"].includes(
        launch.status,
      )
    ) {
      return;
    }

    const refresh = () => void check();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    let socket: WebSocket | undefined;
    if (launch.statusChannel) {
      try {
        socket = new WebSocket(launch.statusChannel);
        socket.addEventListener("message", refresh);
      } catch {
        socket = undefined;
      }
    }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      socket?.removeEventListener("message", refresh);
      socket?.close();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [check, state]);

  if (!resolved || state.kind === "loading") {
    return <Centered icon={<LoaderCircle className="size-10 animate-spin text-brand" />} title={tt("loading")} />;
  }
  if (state.kind === "error") {
    return (
      <Centered
        icon={<CircleAlert className="size-11 text-danger" />}
        title={tt("unavailableTitle")}
        body={state.message}
        action={<Button variant="secondary" onClick={() => void load()}>{tt("check")}</Button>}
      />
    );
  }

  const launch = state.launch;
  const purpose =
    launch.purpose === "recipient"
      ? tt("recipientPurpose")
      : tt("payerPurpose");

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="rounded-pill bg-brand-subtle px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-brand">
              {purpose}
            </span>
            <h2 className="mt-4 font-heading text-2xl font-semibold">RLUSD TrustSet</h2>
          </div>
          <span className="rounded-pill border border-border px-3 py-1 text-xs font-bold uppercase">
            XRPL {launch.network === "mainnet" ? "Mainnet" : "Testnet"}
          </span>
        </div>

        <dl className="mt-7 grid gap-4 sm:grid-cols-2">
          <Field label={tt("account")} value={shortValue(launch.account)} title={launch.account} mono />
          <Field label={tt("asset")} value="RLUSD" />
          <Field label={tt("required")} value={`${unitsToDecimal(launch.requiredAmountUnits, launch.amountScale)} RLUSD`} />
          <Field label={tt("limit")} value={`${launch.trustLimitValue} RLUSD`} />
          <Field label={tt("issuer")} value={shortValue(launch.issuer)} title={launch.issuer} mono />
          <Field label={tt("network")} value={launch.network === "mainnet" ? "XRPL Mainnet" : "XRPL Testnet"} />
        </dl>
      </section>

      <section className="rounded-xl border border-action/25 bg-action/10 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-6 shrink-0 text-action" />
          <div>
            <h3 className="font-semibold">{tt("noticeTitle")}</h3>
            <p className="mt-2 leading-7 text-muted">{tt("noticeBody")}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <PreparationState
          launch={launch}
          working={working}
          tt={tt}
          onStart={() => void start()}
          onCheck={() => void check()}
        />
      </section>
    </div>
  );
}

function PreparationState({
  launch,
  working,
  tt,
  onStart,
  onCheck,
}: {
  launch: RlusdTrustSetLaunch;
  working: boolean;
  tt(key: TrustSetMessageKey): string;
  onStart(): void;
  onCheck(): void;
}) {
  if (launch.status === "not_required") {
    return <Centered icon={<CheckCircle2 className="size-11 text-success" />} title={tt("notRequiredTitle")} body={tt("notRequiredBody")} />;
  }
  if (launch.status === "ready") {
    return <Centered icon={<CheckCircle2 className="size-11 text-success" />} title={tt("readyTitle")} body={tt("readyBody")} />;
  }
  if (launch.status === "required") {
    return (
      <Centered
        icon={<ShieldCheck className="size-11 text-brand" />}
        title={tt("start")}
        body={tt("noticeBody")}
        action={<Button onClick={onStart} disabled={working}>{working ? tt("working") : tt("start")}</Button>}
      />
    );
  }
  if (launch.status === "rejected" || launch.status === "expired") {
    const rejected = launch.status === "rejected";
    return (
      <Centered
        icon={<TriangleAlert className="size-11 text-action" />}
        title={tt(rejected ? "rejectedTitle" : "expiredTitle")}
        body={tt(rejected ? "rejectedBody" : "expiredBody")}
        action={<Button onClick={onStart} disabled={working}>{working ? tt("working") : tt("retry")}</Button>}
      />
    );
  }
  if (launch.status === "submitted" || launch.status === "verifying") {
    return (
      <Centered
        icon={<LoaderCircle className="size-11 animate-spin text-action" />}
        title={tt("verifyingTitle")}
        body={tt("verifyingBody")}
        action={<Button variant="secondary" onClick={onCheck} disabled={working}><RefreshCw className={`size-4 ${working ? "animate-spin" : ""}`} />{tt("check")}</Button>}
      />
    );
  }
  if (launch.status === "failed") {
    return (
      <Centered
        icon={<CircleAlert className="size-11 text-danger" />}
        title={tt("failedTitle")}
        body={tt("failedBody")}
        action={<Button onClick={onStart} disabled={working}>{working ? tt("working") : tt("retry")}</Button>}
      />
    );
  }

  if (
    launch.status === "awaiting_signature" &&
    launch.qrImageUrl &&
    launch.deepLink
  ) {
    return (
      <div className="text-center">
        <LoaderCircle className="mx-auto size-10 animate-spin text-brand" />
        <h3 className="mt-4 font-heading text-2xl font-semibold">{tt("waitingTitle")}</h3>
        <p className="mx-auto mt-3 max-w-lg leading-7 text-muted">{tt("waitingBody")}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={launch.qrImageUrl} alt={tt("qrAlt")} className="mx-auto mt-6 size-52 rounded-lg border border-border" />
        <a href={launch.deepLink} className="mt-5 inline-flex items-center gap-2 font-semibold text-brand underline underline-offset-4">
          {tt("open")}
          <ExternalLink className="size-4" />
        </a>
        <div className="mt-6">
          <Button variant="secondary" onClick={onCheck} disabled={working}>
            <RefreshCw className={`size-4 ${working ? "animate-spin" : ""}`} />
            {tt("check")}
          </Button>
        </div>
      </div>
    );
  }

  return <Centered icon={<CircleAlert className="size-11 text-danger" />} title={tt("failedTitle")} body={tt("failedBody")} />;
}

function Field({
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
    <div className="rounded-lg border border-border bg-background p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className={`mt-2 break-all text-sm font-semibold ${mono ? "font-mono" : ""}`} title={title ?? value}>{value}</dd>
    </div>
  );
}

function Centered({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center text-center">
      {icon}
      <h2 className="mt-4 font-heading text-2xl font-semibold">{title}</h2>
      {body && <p className="mt-3 max-w-lg leading-7 text-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
