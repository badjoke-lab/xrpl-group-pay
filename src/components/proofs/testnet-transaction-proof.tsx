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

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function requestErrorMessage(error: unknown) {
  return error instanceof PublicProofRequestError
    ? error.message
    : "The transaction proof could not be loaded.";
}

export function TestnetTransactionProof({
  proofToken,
}: TestnetTransactionProofProps) {
  const { capability, resolved } = useCapabilityToken(proofToken);

  if (!resolved) return <ProofLoading />;
  if (!capability) {
    return (
      <ProofError
        title="Transaction proof unavailable"
        message="This proof link is incomplete or invalid. Ask for a new verified-payment link."
      />
    );
  }

  return <ProofLoader key={capability} proofToken={capability} />;
}

function ProofLoader({ proofToken }: { proofToken: string }) {
  const [state, setState] = useState<ProofState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

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
        title="Transaction proof unavailable"
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
            Try again
          </Button>
        }
      />
    );
  }

  return <ProofSnapshot proof={state.proof} />;
}

function ProofSnapshot({ proof }: { proof: PublicTransactionProof }) {
  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-xl border border-success/25 bg-surface shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-success/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-success">
                  <BadgeCheck aria-hidden="true" className="size-3.5" />
                  Ledger verified
                </span>
                <span className="rounded-pill bg-brand-subtle px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-brand">
                  Testnet
                </span>
              </div>
              <h2 className="mt-5 font-heading text-3xl font-semibold sm:text-4xl">
                {dropsToXrp(proof.amountDrops)} XRP delivered
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted">
                This receipt records a successful XRP Payment observed on a
                validated ledger. It contains public transaction facts only.
              </p>
            </div>
            <ShieldCheck
              aria-hidden="true"
              className="size-14 shrink-0 text-success"
            />
          </div>
        </div>

        <div className="grid border-t border-border sm:grid-cols-3">
          <ProofMetric label="Validation" value="Validated" />
          <ProofMetric label="Result" value={proof.transactionResult} />
          <ProofMetric label="Ledger index" value={String(proof.ledgerIndex)} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <Fingerprint aria-hidden="true" className="size-6 text-brand" />
          <div>
            <h3 className="font-heading text-2xl font-semibold">
              Verified transaction facts
            </h3>
            <p className="mt-1 text-sm text-muted">
              Bill titles, participant labels, expected pre-payment data, and
              Xaman payload identifiers are not included.
            </p>
          </div>
        </div>

        <dl className="mt-7 grid gap-5 lg:grid-cols-2">
          <ProofField label="Transaction ID" value={proof.transactionId} mono />
          <ProofField label="InvoiceID" value={proof.invoiceId} mono />
          <ProofField label="Sender" value={proof.sender} mono />
          <ProofField label="Destination" value={proof.destination} mono />
          <ProofField
            label="Amount"
            value={`${proof.amountDrops} drops (${dropsToXrp(proof.amountDrops)} XRP)`}
          />
          <ProofField
            label="Delivered amount"
            value={`${proof.deliveredAmountDrops} drops`}
          />
          <ProofField label="Source Tag" value={String(proof.sourceTag)} />
          <ProofField
            label="Destination Tag"
            value={proof.destinationTag === null ? "Not present" : String(proof.destinationTag)}
          />
          <ProofField
            label="Ledger verified at"
            value={`${formatTimestamp(proof.verifiedAt)} UTC`}
          />
          <ProofField
            label="Receipt recorded at"
            value={`${formatTimestamp(proof.recordedAt)} UTC`}
          />
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-background p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Fingerprint aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" />
          <div className="min-w-0">
            <h3 className="font-semibold">Proof digest</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              This identifier is derived from the normalized immutable receipt
              facts and is used to retrieve this public proof.
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
  return (
    <div className="flex min-h-80 items-center justify-center rounded-xl border border-border bg-surface">
      <div className="text-center">
        <LoaderCircle
          aria-hidden="true"
          className="mx-auto size-9 animate-spin text-brand"
        />
        <p className="mt-4 font-semibold">Loading transaction proof</p>
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
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-danger/25 bg-surface p-7 text-center shadow-sm sm:p-9">
      <CircleAlert aria-hidden="true" className="mx-auto size-11 text-danger" />
      <h2 className="mt-4 font-heading text-2xl font-semibold">{title}</h2>
      <p className="mt-3 leading-7 text-muted">{message}</p>
      {action && <div className="mt-6">{action}</div>}
      <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted">
        <Clock3 aria-hidden="true" className="size-3.5" />
        Proof pages contain public ledger facts, not private bill details.
      </p>
    </section>
  );
}
