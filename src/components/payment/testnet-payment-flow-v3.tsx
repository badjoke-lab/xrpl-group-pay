"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import {
  FinalConfirmation,
  LoadingDetailsPanel,
  PaymentSummary,
  StatusPanel,
  UnavailablePanel,
  WaitingPanel,
} from "@/components/payment/payment-panels";
import { PayerLifecyclePanel } from "@/components/payment/payer-lifecycle-panel";
import { Button } from "@/components/ui/button";
import type { PaymentDetails } from "@/features/bills/payment-details";
import {
  PaymentDetailsRequestError,
  requestPaymentDetails,
} from "@/features/bills/payment-details-client";
import { useCapabilityToken } from "@/features/capabilities/use-capability-token";
import {
  criticalTranslate,
  useCriticalLocalization,
} from "@/features/localization/critical-catalog";
import { formatMoneyAmount } from "@/features/money/money";
import type { AssetPaymentVerificationApiOutcome } from "@/features/payment-verification/asset-api-outcome";
import { requestPaymentVerification } from "@/features/payment-verification/browser-client";
import {
  payerLifecycleFromApiError,
  payerLifecycleFromProviderState,
  payerLifecycleFromVerification,
  type PayerLifecycleView,
} from "@/features/payment-recovery/payer-lifecycle";
import {
  verifiedPaymentFromXrpProof,
  type VerifiedPayment,
} from "@/features/payment-verification/verified-payment";
import { shouldRefreshFromXamanWebsocket } from "@/features/xaman/status";

export type PayerLifecyclePaymentFlowProps = {
  paymentToken?: string;
  onReadinessInvalidated?(): void;
};

type CreatedPayload = {
  payloadId: string;
  status: "waiting";
  deepLink: string;
  qrPng: string;
  websocketUrl: string;
  slot: PaymentDetails & {
    publicId: string;
    billPublicId: string;
  };
};

type PayloadStatus = {
  payloadId: string;
  status: "waiting" | "submitted" | "rejected" | "expired";
  txid: string | null;
};

type DetailsState =
  | { kind: "loading" }
  | { kind: "loaded"; details: PaymentDetails }
  | {
      kind: "lifecycle";
      lifecycle: PayerLifecycleView;
      message: string;
    };

type ViewState =
  | { kind: "ready" }
  | { kind: "creating" }
  | { kind: "waiting"; payload: CreatedPayload }
  | { kind: "verifying"; payload: CreatedPayload; txid: string }
  | {
      kind: "recovery";
      lifecycle: PayerLifecycleView;
      message: string;
      payload: CreatedPayload | null;
      txid: string | null;
    }
  | {
      kind: "verified";
      payload: CreatedPayload;
      payment: VerifiedPayment;
      receiptStatus: "recorded" | "existing";
    };

class PayerFlowRequestError extends Error {
  constructor(
    readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = "PayerFlowRequestError";
  }
}

async function readJson(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new PayerFlowRequestError(
      body?.error?.code ?? null,
      body?.error?.message ?? fallback,
    );
  }
  return body;
}

function paymentMatchesFrozenSlot(
  payment: VerifiedPayment,
  payload: CreatedPayload,
) {
  const slot = payload.slot;
  return (
    payment.network === slot.network &&
    payment.asset.id === slot.asset.id &&
    payment.requestedAmount.code === slot.amount.code &&
    payment.requestedAmount.units === slot.amount.units &&
    payment.requestedAmount.scale === slot.amount.scale &&
    payment.sender === slot.expectedPayerAddress &&
    payment.destination === slot.destinationAddress &&
    payment.destinationTag === slot.destinationTag &&
    payment.sourceTag === slot.sourceTag &&
    payment.invoiceId === slot.invoiceId
  );
}

export function PayerLifecyclePaymentFlow({
  paymentToken,
  onReadinessInvalidated,
}: PayerLifecyclePaymentFlowProps) {
  const { locale, ct } = useCriticalLocalization();
  const { capability, resolved } = useCapabilityToken(paymentToken);
  const [detailsState, setDetailsState] = useState<DetailsState>({
    kind: "loading",
  });
  const [state, setState] = useState<ViewState>({ kind: "ready" });
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const verificationInFlight = useRef(new Set<string>());

  const loadDetails = useCallback(async () => {
    if (!capability) return;
    setDetailsState({ kind: "loading" });
    setState({ kind: "ready" });
    setConfirming(false);
    try {
      setDetailsState({
        kind: "loaded",
        details: await requestPaymentDetails(capability),
      });
    } catch (error) {
      const code =
        error instanceof PaymentDetailsRequestError ? error.code : null;
      setDetailsState({
        kind: "lifecycle",
        lifecycle: payerLifecycleFromApiError(code),
        message:
          error instanceof Error
            ? error.message
            : criticalTranslate(locale, "payer.error.details"),
      });
    }
  }, [capability, locale]);

  useEffect(() => {
    if (!resolved || !capability) return;
    const timeoutId = window.setTimeout(() => void loadDetails(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [capability, loadDetails, resolved]);

  const applyVerificationOutcome = useCallback(
    (
      payload: CreatedPayload,
      transactionId: string,
      outcome: AssetPaymentVerificationApiOutcome,
    ) => {
      if (outcome.status === "verified") {
        const payment =
          "payment" in outcome
            ? outcome.payment
            : verifiedPaymentFromXrpProof(outcome.proof);
        if (!paymentMatchesFrozenSlot(payment, payload)) {
          setState({
            kind: "recovery",
            lifecycle: payerLifecycleFromApiError("PAYMENT_REQUIRES_REVIEW"),
            payload,
            txid: transactionId,
            message: criticalTranslate(locale, "payer.error.mismatch"),
          });
          return;
        }
        setState({
          kind: "verified",
          payload,
          payment,
          receiptStatus:
            outcome.receipt.status === "existing" ? "existing" : "recorded",
        });
        return;
      }

      setState({
        kind: "recovery",
        lifecycle: payerLifecycleFromVerification(outcome),
        payload,
        txid: outcome.transactionId ?? transactionId,
        message: outcome.message,
      });
    },
    [locale],
  );

  const verifySubmittedPayment = useCallback(
    async (payload: CreatedPayload, transactionId: string) => {
      if (!capability || verificationInFlight.current.has(payload.payloadId)) {
        return;
      }
      verificationInFlight.current.add(payload.payloadId);
      setState({ kind: "verifying", payload, txid: transactionId });
      try {
        const outcome = await requestPaymentVerification(
          capability,
          payload.payloadId,
        );
        applyVerificationOutcome(payload, transactionId, outcome);
      } catch (error) {
        const code =
          error instanceof PayerFlowRequestError ? error.code : null;
        setState({
          kind: "recovery",
          lifecycle: payerLifecycleFromApiError(code ?? "PAYMENT_SERVICE_UNAVAILABLE"),
          payload,
          txid: transactionId,
          message:
            error instanceof Error
              ? error.message
              : criticalTranslate(locale, "payer.error.ledger"),
        });
      } finally {
        verificationInFlight.current.delete(payload.payloadId);
      }
    },
    [applyVerificationOutcome, capability, locale],
  );

  const refreshStatus = useCallback(
    async (payload: CreatedPayload) => {
      const response = await fetch(`/api/xaman/payloads/${payload.payloadId}`, {
        cache: "no-store",
      });
      const status = (await readJson(
        response,
        criticalTranslate(locale, "payer.error.request"),
      )) as PayloadStatus;
      if (status.status === "submitted" && status.txid) {
        await verifySubmittedPayment(payload, status.txid);
      } else if (status.status === "rejected" || status.status === "expired") {
        setState({
          kind: "recovery",
          lifecycle: payerLifecycleFromProviderState(status.status),
          payload,
          txid: null,
          message: criticalTranslate(
            locale,
            status.status === "rejected"
              ? "payer.state.rejected.body"
              : "payer.state.expired.body",
          ),
        });
      }
      return status;
    },
    [locale, verifySubmittedPayment],
  );

  useEffect(() => {
    if (state.kind !== "waiting") return;
    const payload = state.payload;
    const refreshSilently = () => {
      void refreshStatus(payload).catch(() => undefined);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshSilently();
    };
    const handleSocketMessage = (event: MessageEvent) => {
      if (shouldRefreshFromXamanWebsocket(event.data)) refreshSilently();
    };
    let socket: WebSocket | undefined;
    try {
      socket = new WebSocket(payload.websocketUrl);
      socket.addEventListener("message", handleSocketMessage);
    } catch {
      socket = undefined;
    }
    window.addEventListener("focus", refreshSilently);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      socket?.removeEventListener("message", handleSocketMessage);
      socket?.close();
      window.removeEventListener("focus", refreshSilently);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshStatus, state]);

  async function createPayload() {
    if (!capability || detailsState.kind !== "loaded") return;
    setConfirming(false);
    setStatusError(null);
    setState({ kind: "creating" });
    try {
      const response = await fetch("/api/payments/payload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentToken: capability }),
        cache: "no-store",
      });
      setState({
        kind: "waiting",
        payload: (await readJson(
          response,
          criticalTranslate(locale, "payer.error.create"),
        )) as CreatedPayload,
      });
    } catch (error) {
      const code = error instanceof PayerFlowRequestError ? error.code : null;
      setState({
        kind: "recovery",
        lifecycle: payerLifecycleFromApiError(code),
        payload: null,
        txid: null,
        message:
          error instanceof Error
            ? error.message
            : criticalTranslate(locale, "payer.error.create"),
      });
    }
  }

  async function handleStatusCheck(payload: CreatedPayload) {
    setWorking(true);
    setStatusError(null);
    try {
      await refreshStatus(payload);
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : criticalTranslate(locale, "payer.error.status"),
      );
    } finally {
      setWorking(false);
    }
  }

  function retryAfterReconciliation() {
    setState({ kind: "ready" });
    setConfirming(true);
  }

  async function recheckRecovery() {
    if (state.kind !== "recovery") return;
    setWorking(true);
    try {
      if (state.payload && state.txid) {
        await verifySubmittedPayment(state.payload, state.txid);
      } else if (state.payload) {
        await refreshStatus(state.payload);
      } else {
        await loadDetails();
      }
    } finally {
      setWorking(false);
    }
  }

  if (!resolved) return <LoadingDetailsPanel />;
  if (!capability) return <UnavailablePanel />;
  if (detailsState.kind === "loading") return <LoadingDetailsPanel />;
  if (detailsState.kind === "lifecycle") {
    return (
      <section className="mx-auto max-w-2xl rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <PayerLifecyclePanel
          lifecycle={detailsState.lifecycle}
          message={detailsState.message}
          working={working}
          onRecheck={() => void loadDetails()}
        />
      </section>
    );
  }

  const details = detailsState.details;
  const networkLabel = details.network === "mainnet" ? "Mainnet" : "Testnet";

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <PaymentSummary details={details} />
      <section
        aria-live="polite"
        className="rounded-xl border border-border bg-surface p-6 sm:p-8"
      >
        {confirming ? (
          <FinalConfirmation
            details={details}
            onBack={() => setConfirming(false)}
            onConfirm={() => void createPayload()}
          />
        ) : state.kind === "ready" ? (
          <ReadyPanel
            networkLabel={networkLabel}
            onContinue={() => setConfirming(true)}
          />
        ) : state.kind === "creating" ? (
          <StatusPanel
            icon={
              <LoaderCircle
                aria-hidden="true"
                className="size-11 animate-spin text-brand"
              />
            }
            title={ct("payer.state.preparing.title")}
            body={ct("payer.state.preparing.body", { network: networkLabel })}
          />
        ) : state.kind === "waiting" ? (
          <WaitingPanel
            qrPng={state.payload.qrPng}
            deepLink={state.payload.deepLink}
            isChecking={working}
            statusError={statusError}
            onCheck={() => void handleStatusCheck(state.payload)}
          />
        ) : state.kind === "verifying" ? (
          <StatusPanel
            icon={
              <LoaderCircle
                aria-hidden="true"
                className="size-11 animate-spin text-brand"
              />
            }
            title={ct("payer.state.verifying.title")}
            body={ct("payer.state.verifying.body", { network: networkLabel })}
          />
        ) : state.kind === "verified" ? (
          <StatusPanel
            icon={
              <CheckCircle2
                aria-hidden="true"
                className="size-12 text-success"
              />
            }
            title={ct("payer.state.verified.title")}
            body={ct("payer.state.verified.body", {
              amount: formatMoneyAmount(state.payment.deliveredAmount),
              asset: state.payment.deliveredAmount.code,
            })}
            detail={
              state.receiptStatus === "existing"
                ? ct("payer.state.receiptExisting")
                : ct("payer.state.receiptRecorded")
            }
          />
        ) : (
          <PayerLifecyclePanel
            lifecycle={state.lifecycle}
            message={state.message}
            transactionId={state.txid}
            working={working}
            onRetry={
              state.lifecycle.retryAllowed
                ? retryAfterReconciliation
                : undefined
            }
            onRecheck={
              state.lifecycle.recheckAllowed
                ? () => void recheckRecovery()
                : undefined
            }
            onSetup={
              state.lifecycle.setupAllowed
                ? onReadinessInvalidated
                : undefined
            }
          />
        )}
      </section>
    </div>
  );
}

function ReadyPanel({
  networkLabel,
  onContinue,
}: {
  networkLabel: string;
  onContinue(): void;
}) {
  const { ct } = useCriticalLocalization();
  return (
    <div className="flex min-h-80 flex-col items-center justify-center text-center">
      <Smartphone aria-hidden="true" className="size-12 text-brand" />
      <h2 className="mt-5 font-heading text-xl font-semibold">
        {ct("payer.ready.title")}
      </h2>
      <p className="mt-2 max-w-sm leading-7 text-muted">
        {ct("payer.ready.body", { network: networkLabel })}
      </p>
      <Button className="mt-6" onClick={onContinue}>
        <ShieldCheck aria-hidden="true" className="size-4" />
        {ct("payer.ready.review")}
      </Button>
    </div>
  );
}

export function PayerRecoveryRefreshIcon({ working }: { working: boolean }) {
  return (
    <RefreshCw
      aria-hidden="true"
      className={`size-4 ${working ? "animate-spin" : ""}`}
    />
  );
}
