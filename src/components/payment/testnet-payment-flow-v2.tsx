"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import {
  DetailsErrorPanel,
  FinalConfirmation,
  LoadingDetailsPanel,
  PaymentSummary,
  StatusPanel,
  UnavailablePanel,
  WaitingPanel,
} from "@/components/payment/payment-panels";
import { Button } from "@/components/ui/button";
import type { PaymentDetails } from "@/features/bills/payment-details";
import {
  PaymentDetailsRequestError,
  requestPaymentDetails,
} from "@/features/bills/payment-details-client";
import { requestPaymentVerification } from "@/features/payment-verification/browser-client";
import type {
  LedgerVerificationProof,
  PaymentVerificationApiOutcome,
} from "@/features/payment-verification/types";
import { shouldRefreshFromXamanWebsocket } from "@/features/xaman/status";

const CAPABILITY_PATTERN = /^[a-f0-9]{64}$/i;
const HASH_CAPABILITY_PENDING = "__pending__";

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
  | { kind: "error"; message: string; code: string | null };

type ViewState =
  | { kind: "ready" }
  | { kind: "creating" }
  | { kind: "waiting"; payload: CreatedPayload }
  | { kind: "verifying"; payload: CreatedPayload; txid: string }
  | {
      kind: "verificationPending";
      payload: CreatedPayload;
      txid: string;
      message: string;
    }
  | {
      kind: "verified";
      payload: CreatedPayload;
      proof: LedgerVerificationProof;
      receiptStatus: "created" | "existing";
    }
  | {
      kind: "verificationFailed";
      payload: CreatedPayload;
      txid: string;
      message: string;
    }
  | { kind: "rejected"; payload: CreatedPayload }
  | { kind: "expired"; payload: CreatedPayload }
  | { kind: "error"; message: string };

export type TestnetPaymentFormProps = {
  paymentToken?: string;
};

function parseCapabilityFromHash() {
  const raw = window.location.hash.slice(1);
  const candidate = raw.startsWith("token=")
    ? new URLSearchParams(raw).get("token")
    : raw;
  return candidate && CAPABILITY_PATTERN.test(candidate)
    ? candidate.toLowerCase()
    : null;
}

function subscribeToHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function getHashCapabilitySnapshot() {
  return parseCapabilityFromHash() ?? "";
}

function getServerHashCapabilitySnapshot() {
  return HASH_CAPABILITY_PENDING;
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      body?.error?.message ?? "The payment request could not be completed.",
    );
  }
  return body;
}

export function TestnetPaymentForm({ paymentToken }: TestnetPaymentFormProps) {
  const normalizedProp =
    paymentToken && CAPABILITY_PATTERN.test(paymentToken)
      ? paymentToken.toLowerCase()
      : null;
  const hashCapability = useSyncExternalStore(
    subscribeToHash,
    getHashCapabilitySnapshot,
    getServerHashCapabilitySnapshot,
  );
  const capability =
    paymentToken !== undefined
      ? normalizedProp
      : CAPABILITY_PATTERN.test(hashCapability)
        ? hashCapability.toLowerCase()
        : null;
  const capabilityResolved =
    paymentToken !== undefined || hashCapability !== HASH_CAPABILITY_PENDING;

  const [detailsState, setDetailsState] = useState<DetailsState>({
    kind: "loading",
  });
  const [state, setState] = useState<ViewState>({ kind: "ready" });
  const [confirming, setConfirming] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const verificationInFlight = useRef(new Set<string>());

  const loadDetails = useCallback(async () => {
    if (!capability) return;
    await Promise.resolve();
    setDetailsState({ kind: "loading" });
    setState({ kind: "ready" });
    setConfirming(false);
    try {
      setDetailsState({
        kind: "loaded",
        details: await requestPaymentDetails(capability),
      });
    } catch (error) {
      setDetailsState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "The frozen payment details could not be loaded.",
        code:
          error instanceof PaymentDetailsRequestError ? error.code : null,
      });
    }
  }, [capability]);

  useEffect(() => {
    if (!capabilityResolved || !capability) return;
    void loadDetails();
  }, [capability, capabilityResolved, loadDetails]);

  const applyVerificationOutcome = useCallback(
    (
      payload: CreatedPayload,
      transactionId: string,
      outcome: PaymentVerificationApiOutcome,
    ) => {
      if (outcome.status === "verified") {
        setState({
          kind: "verified",
          payload,
          proof: outcome.proof,
          receiptStatus: outcome.receipt.status,
        });
      } else if (outcome.status === "pending") {
        setState({
          kind: "verificationPending",
          payload,
          txid: outcome.transactionId ?? transactionId,
          message: outcome.message,
        });
      } else {
        setState({
          kind: "verificationFailed",
          payload,
          txid: outcome.transactionId ?? transactionId,
          message: outcome.message,
        });
      }
    },
    [],
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
    [applyVerificationOutcome, capability],
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
        payload: (await readJson(response)) as CreatedPayload,
      });
    } catch (error) {
      setState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "The payment request could not be created.",
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

  function reopenConfirmation() {
    setState({ kind: "ready" });
    setConfirming(true);
  }

  if (!capabilityResolved) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-xl border border-border bg-surface">
        <LoaderCircle
          aria-label="Loading payment link"
          className="size-8 animate-spin text-brand"
        />
      </div>
    );
  }
  if (!capability) return <UnavailablePanel />;
  if (detailsState.kind === "loading") return <LoadingDetailsPanel />;
  if (detailsState.kind === "error") {
    return (
      <DetailsErrorPanel
        message={detailsState.message}
        alreadyPaid={detailsState.code === "SLOT_ALREADY_PAID"}
        onRetry={() => void loadDetails()}
      />
    );
  }

  const details = detailsState.details;
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
        ) : state.kind === "ready" || state.kind === "error" ? (
          <ReadyPanel
            error={state.kind === "error" ? state.message : null}
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
            title="Preparing secure request"
            body="The confirmed frozen conditions are being placed into a short-lived Testnet Xaman Sign Request."
          />
        ) : state.kind === "waiting" ? (
          <WaitingPanel
            qrPng={state.payload.qrPng}
            deepLink={state.payload.deepLink}
            isChecking={isChecking}
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
            title="Verifying on the XRP Ledger"
            body="The submitted transaction must appear in a validated Testnet ledger and match every frozen slot condition."
          />
        ) : state.kind === "verificationPending" ? (
          <StatusPanel
            icon={<Clock3 aria-hidden="true" className="size-11 text-action" />}
            title="Ledger confirmation pending"
            body={state.message}
            action={
              <Button
                variant="secondary"
                onClick={() =>
                  void verifySubmittedPayment(state.payload, state.txid)
                }
              >
                <RefreshCw aria-hidden="true" className="size-4" />
                Check again
              </Button>
            }
          />
        ) : state.kind === "verified" ? (
          <StatusPanel
            icon={
              <CheckCircle2
                aria-hidden="true"
                className="size-12 text-success"
              />
            }
            title="Ledger verified"
            body={`${state.proof.amountDrops} drops were delivered directly and the payment slot is now marked paid.`}
            detail={
              state.receiptStatus === "existing"
                ? "This exact transaction was already recorded safely."
                : "A durable verification receipt was recorded."
            }
          />
        ) : state.kind === "verificationFailed" ? (
          <StatusPanel
            icon={
              <TriangleAlert
                aria-hidden="true"
                className="size-11 text-danger"
              />
            }
            title="Payment could not be verified"
            body={state.message}
          />
        ) : state.kind === "rejected" ? (
          <StatusPanel
            icon={<XCircle aria-hidden="true" className="size-11 text-danger" />}
            title="Request rejected"
            body="No XRP was sent. Review the frozen details again before creating another short-lived request."
            action={<Button onClick={reopenConfirmation}>Review and try again</Button>}
          />
        ) : (
          <StatusPanel
            icon={<Clock3 aria-hidden="true" className="size-11 text-action" />}
            title="Request expired"
            body="No XRP was sent. Review the frozen details again before creating a fresh Xaman request."
            action={
              <Button onClick={reopenConfirmation}>
                Review and create new request
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}

function ReadyPanel({
  error,
  onContinue,
}: {
  error: string | null;
  onContinue(): void;
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center text-center">
      <Smartphone aria-hidden="true" className="size-12 text-brand" />
      <h2 className="mt-5 font-heading text-xl font-semibold">
        Frozen payment details loaded
      </h2>
      <p className="mt-2 max-w-sm leading-7 text-muted">
        Review the exact Testnet payment once more before Group Pay creates a
        short-lived Xaman Sign Request.
      </p>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <Button className="mt-6" onClick={onContinue}>
        <ShieldCheck aria-hidden="true" className="size-4" />
        Review final payment
      </Button>
    </div>
  );
}
