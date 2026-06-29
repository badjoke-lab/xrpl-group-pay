"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CircleAlert,
  Clock3,
  Fingerprint,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCapabilityToken } from "@/features/capabilities/use-capability-token";
import { useProofLocalization } from "@/features/localization/proof-catalog";
import {
  PublicProofRequestError,
  requestPublicProof,
} from "@/features/proofs/public-proof-client";
import type { PublicTransactionProof } from "@/features/proofs/types";

export type TestnetTransactionProofProps = {
  proofToken?: string;
};

type ProofState =
  | { kind: "loading" }
  | { kind: "loaded"; proof: PublicTransactionProof }
  | { kind: "error"; message: string };

function dropsToXrp(drops: string) {
  const padded = drops.padStart(7, "0");
  const whole = padded.slice(0, -6);
  const fraction = padded.slice(-6).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function shortValue(value: string, start = 12, end = 10) {
  return value.length > start + end + 1
    ? `${value.slice(0, start)}…${value.slice(-end)}`
    : value;
}

export function TestnetTransactionProof({
  proofToken,
}: TestnetTransactionProofProps) {
  const { capability, resolved } = useCapabilityToken(proofToken);
  const { pt } = useProofLocalization();

  if (!resolved) return <ProofLoading />;
  if (!capability) {
    return <ProofError title={pt("unavailable")} message={pt("invalid")} />;
  }

  return <ProofLoader key={capability} proofToken={capability} />;
}

function ProofLoader({ proofToken }: { proofToken: string }) {
  const { pt } = useProofLocalization();
  const [state, setState] = useState<ProofState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  function requestErrorMessage(error: unknown) {
    return error instanceof PublicProofRequestError
      ? error.message
      : pt("fallback");
  }

  useEffect(() => {
    let active = true;
    requestPublicProof(proofToken).then(
      (proof) => {
        if (active) setState({ kind: "loaded", proof });
      },
      (error: unknown) => {
        if (active) {
          setState({ kind: "error", message: requestErrorMessage(error) });
        }
      },
    );
    return () => {
      active = false;
    };
    // The proof token is the only request identity. Locale changes refresh copy
    // without changing the protected capability or issuing a second request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proofToken]);

  async function refresh() {
    setRefreshing(true);
    try {
      setState({ kind: "loaded", proof: await requestPublicProof(proofToken) });
    } catch (error) {
      setState({ kind: "error", message: requestErrorMessage(error) });
    } finally {
      setRefreshing(false);
    }
  }

  if (state.kind === "loading") return <ProofLoading />;
  if (state.kind === "error") {
    return (
      <ProofError
        title={pt("unavailable")}
        message={state.message}
        action={
          <Button
            variant="secondary"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            {refreshing ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <RefreshCw aria-hidden="true" className="size-4" />
            )}
            {pt("retry")}
          </Button>
        }
      />
    );
  }

  return <ProofSnapshot proof={state.proof} />;
}

function ProofSnapshot({ proof }: { proof: PublicTransactionProof }) {
  const { pt } = useProofLocalization();
  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-xl border border-success/25 bg-surface shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-success/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-success">
                  <BadgeCheck aria-hidden="true" className="size-3.5" />
                  {pt("verified")}
                </span>
                <span className="rounded-pill bg-brand-subtle px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-brand">
                  Testnet
                </span>
              </div>
              <h2 className="mt-5 font-heading text-3xl font-semibold sm:text-4xl">
                {pt("delivered", { amount: dropsToXrp(proof.amountDrops) })}
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted">
                {pt("summary")}
              </p>
            </div>
            <ShieldCheck
              aria-hidden="true"
              className="size-14 shrink-0 text-success"
            />
          </div>
        </div>

        <div className="grid border-t border-border sm:grid-cols-3">
          <ProofMetric label={pt("validation")} value={pt("validated")} />
          <ProofMetric label={pt("result")} value={proof.transactionResult} />
          <ProofMetric label={pt("ledger")} value={String(proof.ledgerIndex)} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <Fingerprint aria-hidden="true" className="size-6 text-brand" />
          <div>
            <h3 className="font-heading text-2xl font-semibold">{pt("facts")}</h3>
            <p className="mt-1 text-sm text-muted">{pt("factsBody")}</p>
          </div>
        </div>

        <dl className="mt-7 grid gap-5 lg:grid-cols-2">
          <ProofField label={pt("transaction")} value={proof.transactionId} mono />
          <ProofField label={pt("invoice")} value={proof.invoiceId} mono />
          <ProofField label={pt("sender")} value={proof.sender} mono />
          <ProofField label={pt("destination")} value={proof.destination} mono />
          <ProofField
            label={pt("amount")}
            value={`${proof.amountDrops} drops (${dropsToXrp(proof.amountDrops)} XRP)`}
          />
          <ProofField
            label={pt("deliveredAmount")}
            value={`${proof.deliveredAmountDrops} drops`}
          />
          <ProofField label={pt("sourceTag")} value={String(proof.sourceTag)} />
          <ProofField
            label={pt("destinationTag")}
            value={
              proof.destinationTag === null
                ? pt("absent")
                : String(proof.destinationTag)
            }
          />
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-background p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Fingerprint
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-brand"
          />
          <div className="min-w-0">
            <h3 className="font-semibold">{pt("digest")}</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              {pt("digestBody")}
            </p>
            <p
              className="mt-3 break-all font-mono text-xs font-semibold"
              title={proof.proofDigest}
            >
              {proof.proofDigest}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProofMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-heading text-xl font-semibold">{value}</p>
    </div>
  );
}

function ProofField({
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
        {mono ? shortValue(value) : value}
      </dd>
    </div>
  );
}

function ProofLoading() {
  const { pt } = useProofLocalization();
  return (
    <div className="flex min-h-80 items-center justify-center rounded-xl border border-border bg-surface">
      <div className="text-center">
        <LoaderCircle
          aria-hidden="true"
          className="mx-auto size-9 animate-spin text-brand"
        />
        <p className="mt-4 font-semibold">{pt("loading")}</p>
      </div>
    </div>
  );
}

function ProofError({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  const { pt } = useProofLocalization();
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-danger/25 bg-surface p-7 text-center shadow-sm sm:p-9">
      <CircleAlert
        aria-hidden="true"
        className="mx-auto size-11 text-danger"
      />
      <h2 className="mt-4 font-heading text-2xl font-semibold">{title}</h2>
      <p className="mt-3 leading-7 text-muted">{message}</p>
      {action && <div className="mt-6">{action}</div>}
      <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted">
        <Clock3 aria-hidden="true" className="size-3.5" />
        {pt("privacy")}
      </p>
    </section>
  );
}
