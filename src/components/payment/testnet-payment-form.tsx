"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, LoaderCircle, Smartphone, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

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
  | { kind: "submitted"; payload: CreatedPayload; txid: string }
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

  const refreshStatus = useCallback(async (payload: CreatedPayload) => {
    const response = await fetch(`/api/xaman/payloads/${payload.payloadId}`, {
      cache: "no-store",
    });
    const status = (await readJson(response)) as PayloadStatus;

    if (status.status === "submitted" && status.txid) {
      setState({ kind: "submitted", payload, txid: status.txid });
    } else if (status.status === "rejected") {
      setState({ kind: "rejected", payload });
    } else if (status.status === "expired") {
      setState({ kind: "expired", payload });
    }
  }, []);

  useEffect(() => {
    if (state.kind !== "waiting") return;

    const payload = state.payload;
    const interval = window.setInterval(() => {
      void refreshStatus(payload).catch(() => undefined);
    }, 3_000);

    let socket: WebSocket | undefined;
    try {
      socket = new WebSocket(payload.websocketUrl);
      socket.addEventListener("message", () => {
        void refreshStatus(payload).catch(() => undefined);
      });
    } catch {
      socket = undefined;
    }

    return () => {
      window.clearInterval(interval);
      socket?.close();
    };
  }, [refreshStatus, state]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  const terminalPayload =
    state.kind === "submitted" || state.kind === "rejected" || state.kind === "expired"
      ? state.payload
      : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8"
      >
        <h2 className="font-heading text-2xl font-semibold">Create a Testnet Payment</h2>
        <p className="mt-2 leading-7 text-muted">
          This flow creates an XRP Payment Sign Request and forces Xaman to use XRPL Testnet.
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

        <Button className="mt-7 w-full" type="submit" disabled={state.kind === "creating" || state.kind === "waiting"}>
          {state.kind === "creating" ? (
            <><LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> Preparing Xaman request</>
          ) : (
            "Continue to Xaman"
          )}
        </Button>

        {state.kind === "error" && (
          <p role="alert" className="mt-4 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
            {state.message}
          </p>
        )}
      </form>

      <section aria-live="polite" className="rounded-xl border border-border bg-surface p-6 sm:p-8">
        {state.kind === "idle" || state.kind === "creating" ? (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <Smartphone aria-hidden="true" className="size-12 text-brand" />
            <h2 className="mt-5 font-heading text-xl font-semibold">Xaman handoff preview</h2>
            <p className="mt-2 max-w-sm leading-7 text-muted">
              The recipient, amount, Source Tag, and opaque InvoiceID are fixed before Xaman opens.
            </p>
          </div>
        ) : state.kind === "waiting" ? (
          <div className="text-center">
            <LoaderCircle aria-hidden="true" className="mx-auto size-10 animate-spin text-brand" />
            <h2 className="mt-4 font-heading text-xl font-semibold">Waiting for approval in Xaman</h2>
            <p className="mt-2 text-muted">Review the Testnet transaction in your wallet before signing.</p>
            {/* The QR URL is produced by Xaman for this short-lived payload. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.payload.qrPng} alt="QR code to open this Xaman Testnet sign request" className="mx-auto mt-6 size-52 rounded-lg border border-border" />
            <a href={state.payload.deepLink} className="mt-5 inline-flex items-center gap-2 font-semibold text-brand underline underline-offset-4">
              Open securely in Xaman <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          </div>
        ) : state.kind === "submitted" ? (
          <div>
            <CheckCircle2 aria-hidden="true" className="size-11 text-success" />
            <h2 className="mt-4 font-heading text-2xl font-semibold">Transaction submitted</h2>
            <p className="mt-2 leading-7 text-muted">
              Xaman returned a transaction ID. This is not yet displayed as paid or verified; validated-ledger verification is the next safety gate.
            </p>
            <p className="mt-5 break-all rounded-lg bg-background p-4 font-mono text-xs">{state.txid}</p>
          </div>
        ) : (
          <div>
            <XCircle aria-hidden="true" className="size-11 text-warning" />
            <h2 className="mt-4 font-heading text-2xl font-semibold">
              {state.kind === "expired" ? "Sign request expired" : "Payment not signed"}
            </h2>
            <p className="mt-2 leading-7 text-muted">
              No payment is recorded. Create a new request only after checking the recipient and amount again.
            </p>
            <Button className="mt-6" variant="secondary" onClick={() => setState({ kind: "idle" })}>
              Start again
            </Button>
          </div>
        )}

        {terminalPayload && (
          <p className="mt-6 text-xs text-muted">Payload: {terminalPayload.payloadId}</p>
        )}
      </section>
    </div>
  );
}
