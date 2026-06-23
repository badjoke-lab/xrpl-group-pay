"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clock3,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { requestPaymentVerification } from "@/features/payment-verification/browser-client";
import type {
  LedgerVerificationProof,
  PaymentVerificationOutcome,
} from "@/features/payment-verification/types";
import { shouldRefreshFromXamanWebsocket } from "@/features/xaman/status";

type CreatedPayload = {
  payloadId: string;
  status: "waiting";
  deepLink: string;
  qrPng: string;
  websocketUrl: string;
  invoiceId: string;
  transaction: {
    destination: string;
    destinationTag: number | null;
    amountDrops: string;
    sourceTag: number;
    network: "testnet";
  };
};

type PayloadStatus = {
  payloadId: string;
  status: "waiting" | "submitted" | "rejected" | "expired";
  txid: string | null;
};

type ViewState =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "waiting"; payload: CreatedPayload }
  | { kind: "verifying"; payload: CreatedPayload; txid: string }
  | {
      kind: "verificationPending";
      payload: CreatedPayload;
      txid: string;
      message: string;
    }
  | { kind: "verified"; payload: CreatedPayload; proof: LedgerVerificationProof }
  | {
      kind: "verificationFailed";
      payload: CreatedPayload;
      txid: string;
      message: string;
    }
  | { kind: "rejected"; payload: CreatedPayload }
  | { kind: "expired"; payload: CreatedPayload }
  | { kind: "error"; message: string };

async function readJson(response: Response) {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? "The request failed.");
  }
  return body;
}

export function TestnetPaymentForm() {
  const [state, setState] = useState<ViewState>({ kind: "idle" });
  const [isChecking, setIsChecking] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const verificationInFlight = useRef(new Set<string>());

  const applyVerificationOutcome = useCallback(
    (
      payload: CreatedPayload,
      transactionId: string,
      outcome: PaymentVerificationOutcome,
    ) => {
      if (outcome.status === "verified") {
        setState({ kind: "verified", payload, proof: outcome.proof });
        return;
      }

      if (outcome.status === "pending") {
        setState({
          kind: "verificationPending",
          payload,
          txid: outcome.transactionId ?? transactionId,
          message: outcome.message,
        });
        return;
      }

      setState({
        kind: "verificationFailed",
        payload,
        txid: outcome.transactionId ?? transactionId,
        message: outcome.message,
      });
    },
    [],
  );

  const verifySubmittedPayment = useCallback(
    async (payload: CreatedPayload, transactionId: string) => {
      if (verificationInFlight.current.has(payload.payloadId)) {
        return;
      }

      verificationInFlight.current.add(payload.payloadId);
      setState({ kind: "verifying", payload, txid: transactionId });

      try {
        const outcome = await requestPaymentVerification(payload.payloadId);
        applyVerificationOutcome(payload, transactionId, outcome);
      } catch (error) {
        setState({
          kind: "verificationFailed",
          payload,
          txid: transactionId,
          message:
            error instanceof Error
              ? error.message
              : "The validated ledger could not be checked.",
        });
      } finally {
        verificationInFlight.current.delete(payload.payloadId);
      }
    },
    [applyVerificationOutcome],
  );

  const refreshStatus = useCallback(
    async (payload: CreatedPayload) => {
      const response = await fetch(`/api/xaman/payloads/${payload.payloadId}`, {
        cache: "no-store",
      });
      const status = (await readJson(response)) as PayloadStatus;

      if (status.status === "submitted" && status.txid) {
        await verifySubmittedPayment(payload, status.txid);
      } else if (status.status === "rejected") {
        setState({ kind: "rejected", payload });
      } else if (status.status === "expired") {
        setState({ kind: "expired", payload });
      }

      return status;
    },
    [verifySubmittedPayment],
  );

  useEffect(() => {
    if (state.kind !== "waiting") return;

    const payload = state.payload;
    const refreshSilently = () => {
      void refreshStatus(payload).catch(() => undefined);
    };
    const handleFocus = () => refreshSilently();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshSilently();
      }
    };
    const handleSocketMessage = (event: MessageEvent) => {
      if (shouldRefreshFromXamanWebsocket(event.data)) {
        refreshSilently();
      }
    };

    let socket: WebSocket | undefined;
    try {
      socket = new WebSocket(payload.websocketUrl);
      socket.addEventListener("message", handleSocketMessage);
    } catch {
      socket = undefined;
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      socket?.removeEventListener("message", handleSocketMessage);
      socket?.close();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshStatus, state]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusError(null);
    setState({ kind: "creating" });

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/xaman/payloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: formData.get("destination"),
          amountXrp: formData.get("amountXrp"),
          destinationTag: formData.get("destinationTag"),
        }),
      });
      const payload = (await readJson(response)) as CreatedPayload;
      setState({ kind: "waiting", payload });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "The request failed.",
      });
    }
  }

  async function handleStatusCheck(payload: CreatedPayload) {
    setIsChecking(true);
    setStatusError(null);

    try {
      await refreshStatus(payload);
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : "The Xaman status could not be checked.",
      );
    } finally {
      setIsChecking(false);
    }
  }

  const terminalPayload =
    "payload" in state ? state.payload : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8"
      >
        <h2 className="font-heading text-2xl font-semibold">
          Create a Testnet Payment
        </h2>
        <p className="mt-2 leading-7 text-muted">
          This flow creates an XRP Payment Sign Request and forces Xaman to use
          XRPL Testnet.
        </p>

        <div className="mt-7 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold">Recipient XRPL address</span>
            <input
              name="destination"
              required
              autoComplete="off"
              placeholder="r..."
              className="mt-2 min-h-12 w-full rounded-md border border-border bg-background px-4 font-mono text-sm outline-none focus:border-brand focus:ring-3 focus:ring-focus/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Amount</span>
            <div className="mt-2 flex rounded-md border border-border bg-background focus-within:border-brand focus-within:ring-3 focus-within:ring-focus/20">
              <input
                name="amountXrp"
                required
                inputMode="decimal"
                placeholder="4"
                className="min-h-12 min-w-0 flex-1 bg-transparent px-4 outline-none"
              />
              <span className="flex items-center border-l border-border px-4 text-sm font-semibold text-brand">
                XRP
              </span>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Destination Tag</span>
            <span className="ml-2 text-sm text-muted">Optional</span>
            <input
              name="destinationTag"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="12345"
              className="mt-2 min-h-12 w-full rounded-md border border-border bg-background px-4 outline-none focus:border-brand focus:ring-3 focus:ring-focus/20"
            />
          </label>
        </div>

        <Button
          className="mt-7 w-full"
          type="submit"
          disabled={state.kind === "creating" || state.kind === "waiting"}
        >
          {state.kind === "creating" ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Preparing Xaman request
            </>
          ) : (
            "Continue to Xaman"
          )}
        </Button>

        {state.kind === "error" && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {state.message}
          </p>
        )}
      </form>

      <section
        aria-live="polite"
        className="rounded-xl border border-border bg-surface p-6 sm:p-8"
      >
        {state.kind === "idle" ||
        state.kind === "creating" ||
        state.kind === "error" ? (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <Smartphone aria-hidden="true" className="size-12 text-brand" />
            <h2 className="mt-5 font-heading text-xl font-semibold">
              Xaman handoff preview
            </h2>
            <p className="mt-2 max-w-sm leading-7 text-muted">
              The recipient, amount, Source Tag, and opaque InvoiceID are fixed
              before Xaman opens.
            </p>
          </div>
        ) : state.kind === "waiting" ? (
          <div className="text-center">
            <LoaderCircle
              aria-hidden="true"
              className="mx-auto size-10 animate-spin text-brand"
            />
            <h2 className="mt-4 font-heading text-xl font-semibold">
              Waiting for approval in Xaman
            </h2>
            <p className="mt-2 text-muted">
              Review the Testnet transaction in your wallet before signing.
            </p>
            {/* The QR URL is produced by Xaman for this short-lived payload. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.payload.qrPng}
              alt="QR code to open this Xaman Testnet sign request"
              className="mx-auto mt-6 size-52 rounded-lg border border-border"
            />
            <a
              href={state.payload.deepLink}
              className="mt-5 inline-flex items-center gap-2 font-semibold text-brand underline underline-offset-4"
            >
              Open securely in Xaman
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
            <div className="mt-5">
              <Button
                variant="secondary"
                onClick={() => void handleStatusCheck(state.payload)}
                disabled={isChecking}
              >
                {isChecking ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                ) : (
                  <RefreshCw aria-hidden="true" className="size-4" />
                )}
                Check status
              </Button>
            </div>
            {statusError && (
              <p role="alert" className="mt-4 text-sm text-danger">
                {statusError}
              </p>
            )}
          </div>
        ) : state.kind === "verifying" ? (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <LoaderCircle
              aria-hidden="true"
              className="size-11 animate-spin text-brand"
            />
            <h2 className="mt-5 font-heading text-2xl font-semibold">
              Verifying on XRPL
            </h2>
            <p className="mt-2 max-w-sm leading-7 text-muted">
              The signed transaction is being compared with a validated Testnet
              ledger. A transaction ID alone is not enough.
            </p>
            <p className="mt-5 break-all rounded-lg bg-background p-4 font-mono text-xs">
              {state.txid}
            </p>
          </div>
        ) : state.kind === "verificationPending" ? (
          <div>
            <Clock3 aria-hidden="true" className="size-11 text-warning" />
            <h2 className="mt-4 font-heading text-2xl font-semibold">
              Waiting for validated ledger
            </h2>
            <p className="mt-2 leading-7 text-muted">{state.message}</p>
            <p className="mt-5 break-all rounded-lg bg-background p-4 font-mono text-xs">
              {state.txid}
            </p>
            <Button
              className="mt-6"
              variant="secondary"
              onClick={() =>
                void verifySubmittedPayment(state.payload, state.txid)
              }
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Check validated ledger
            </Button>
          </div>
        ) : state.kind === "verified" ? (
          <div>
            <ShieldCheck aria-hidden="true" className="size-11 text-success" />
            <h2 className="mt-4 font-heading text-2xl font-semibold">
              Ledger verified
            </h2>
            <p className="mt-2 leading-7 text-muted">
              The Payment matches the Xaman Sign Request and a validated XRPL
              Testnet ledger.
            </p>
            <dl className="mt-6 grid gap-4 rounded-lg bg-success-subtle p-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Delivered</dt>
                <dd className="mt-1 font-mono font-semibold">
                  {state.proof.deliveredAmountDrops} drops
                </dd>
              </div>
              <div>
                <dt className="text-muted">Ledger index</dt>
                <dd className="mt-1 font-mono font-semibold">
                  {state.proof.ledgerIndex}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Transaction ID</dt>
                <dd className="mt-1 break-all font-mono text-xs font-semibold">
                  {state.proof.transactionId}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-muted">
              Durable bill status and duplicate enforcement are added with
              persistence; this screen proves the current transaction only.
            </p>
          </div>
        ) : state.kind === "verificationFailed" ? (
          <div>
            <TriangleAlert aria-hidden="true" className="size-11 text-danger" />
            <h2 className="mt-4 font-heading text-2xl font-semibold">
              Ledger verification failed
            </h2>
            <p className="mt-2 leading-7 text-muted">{state.message}</p>
            <p className="mt-5 break-all rounded-lg bg-background p-4 font-mono text-xs">
              {state.txid}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() =>
                  void verifySubmittedPayment(state.payload, state.txid)
                }
              >
                <RefreshCw aria-hidden="true" className="size-4" />
                Check again
              </Button>
              <Button variant="ghost" onClick={() => setState({ kind: "idle" })}>
                Start again
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <XCircle aria-hidden="true" className="size-11 text-warning" />
            <h2 className="mt-4 font-heading text-2xl font-semibold">
              {state.kind === "expired"
                ? "Sign request expired"
                : "Payment not signed"}
            </h2>
            <p className="mt-2 leading-7 text-muted">
              No payment is recorded. Create a new request only after checking
              the recipient and amount again.
            </p>
            <Button
              className="mt-6"
              variant="secondary"
              onClick={() => setState({ kind: "idle" })}
            >
              Start again
            </Button>
          </div>
        )}

        {terminalPayload && (
          <p className="mt-6 text-xs text-muted">
            Payload: {terminalPayload.payloadId}
          </p>
        )}
      </section>
    </div>
  );
}
