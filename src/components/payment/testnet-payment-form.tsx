"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PaymentDetailsRequestError,
  requestPaymentDetails,
} from "@/features/bills/payment-details-client";
import type { PaymentDetails } from "@/features/bills/payment-details";
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
  slot: {
    publicId: string;
    billPublicId: string;
    billTitle: string;
    participantLabel: string | null;
    expectedPayerAddress: string;
    destinationAddress: string;
    destinationTag: number | null;
    amountDrops: string;
    sourceTag: number;
    invoiceId: string;
    network: "testnet";
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

function dropsToXrp(drops: string) {
  const padded = drops.padStart(7, "0");
  const whole = padded.slice(0, -6);
  const fraction = padded.slice(-6).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function shortValue(value: string, start = 10, end = 8) {
  return value.length > start + end + 1
    ? `${value.slice(0, start)}…${value.slice(-end)}`
    : value;
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
    setDetailsState({ kind: "loading" });
    setConfirming(false);
    setState({ kind: "ready" });
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
    const handleFocus = () => refreshSilently();
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

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      socket?.removeEventListener("message", handleSocketMessage);
      socket?.close();
      window.removeEventListener("focus", handleFocus);
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
      const payload = (await readJson(response)) as CreatedPayload;
      setState({ kind: "waiting", payload });
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

  if (!capability) {
    return <UnavailablePanel />;
  }

  if (detailsState.kind === "error") {
    const alreadyPaid = detailsState.code === "SLOT_ALREADY_PAID";
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-danger/25 bg-surface p-7 text-center shadow-sm sm:p-9">
        {alreadyPaid ? (
          <CheckCircle2
            aria-hidden="true"
            className="mx-auto size-11 text-success"
          />
        ) : (
          <TriangleAlert
            aria-hidden="true"
            className="mx-auto size-11 text-danger"
          />
        )}
        <h2 className="mt-4 font-heading text-2xl font-semibold">
          {alreadyPaid ? "Payment already completed" : "Payment link unavailable"}
        </h2>
        <p className="mt-3 leading-7 text-muted">{detailsState.message}</p>
        {!alreadyPaid && (
          <Button className="mt-6" variant="secondary" onClick={() => void loadDetails()}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Try again
          </Button>
        )}
      </section>
    );
  }

  if (detailsState.kind === "loading") {
    return (
      <section className="flex min-h-80 items-center justify-center rounded-xl border border-border bg-surface">
        <div className="text-center">
          <LoaderCircle
            aria-hidden="true"
            className="mx-auto size-10 animate-spin text-brand"
          />
          <p className="mt-4 font-semibold">Loading frozen payment details</p>
        </div>
      </section>
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
        {confirming && (state.kind === "ready" || state.kind === "error") ? (
          <FinalConfirmation
            details={details}
            onBack={() => setConfirming(false)}
            onConfirm={() => void createPayload()}
          />
        ) : state.kind === "ready" || state.kind === "error" ? (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <Smartphone aria-hidden="true" className="size-12 text-brand" />
            <h2 className="mt-5 font-heading text-xl font-semibold">
              Frozen payment details loaded
            </h2>
            <p className="mt-2 max-w-sm leading-7 text-muted">
              Review the exact Testnet payment once more before Group Pay creates
              a short-lived Xaman Sign Request.
            </p>
            {state.kind === "error" && (
              <p
                role="alert"
                className="mt-4 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {state.message}
              </p>
            )}
            <Button className="mt-6" onClick={() => setConfirming(true)}>
              <ShieldCheck aria-hidden="true" className="size-4" />
              Review final payment
            </Button>
          </div>
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
          <div className="text-center">
            <LoaderCircle
              aria-hidden="true"
              className="mx-auto size-10 animate-spin text-brand"
            />
            <h2 className="mt-4 font-heading text-xl font-semibold">
              Waiting for approval in Xaman
            </h2>
            <p className="mt-2 text-muted">
              Compare the transaction in your wallet with the confirmed details
              before signing.
            </p>
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
            icon={
              <Clock3 aria-hidden="true" className="size-11 text-action" />
            }
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
            icon={
              <XCircle aria-hidden="true" className="size-11 text-danger" />
            }
            title="Request rejected"
            body="No XRP was sent. Review the frozen details again before creating another short-lived request."
            action={
              <Button onClick={() => setConfirming(true)}>Review and try again</Button>
            }
          />
        ) : (
          <StatusPanel
            icon={
              <Clock3 aria-hidden="true" className="size-11 text-action" />
            }
            title="Request expired"
            body="No XRP was sent. Review the frozen details again before creating a fresh Xaman request."
            action={
              <Button onClick={() => setConfirming(true)}>
                Review and create new request
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}

function UnavailablePanel() {
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-danger/25 bg-surface p-7 text-center shadow-sm sm:p-9">
      <TriangleAlert
        aria-hidden="true"
        className="mx-auto size-11 text-danger"
      />
      <h2 className="mt-4 font-heading text-2xl font-semibold">
        Payment link unavailable
      </h2>
      <p className="mt-3 leading-7 text-muted">
        This link is incomplete or invalid. Ask the bill creator for a new
        participant payment link.
      </p>
    </section>
  );
}

function PaymentSummary({ details }: { details: PaymentDetails }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
            Participant payment
          </p>
          <h2 className="mt-3 font-heading text-2xl font-semibold">
            {details.billTitle}
          </h2>
        </div>
        <span className="rounded-pill bg-brand-subtle px-3 py-1 text-xs font-bold text-brand">
          TESTNET
        </span>
      </div>

      <div className="mt-7 space-y-4">
        <div className="rounded-lg border border-border bg-background p-5 text-center">
          <p className="text-sm font-medium text-muted">Your share</p>
          <p className="mt-2 font-heading text-4xl font-bold text-brand">
            {dropsToXrp(details.amountDrops)} <span className="text-xl">XRP</span>
          </p>
        </div>
        <dl className="space-y-3 text-sm">
          {details.participantLabel && (
            <SummaryRow label="Participant" value={details.participantLabel} />
          )}
          <SummaryRow
            label="Recipient"
            value={shortValue(details.destinationAddress)}
            title={details.destinationAddress}
            mono
          />
          <SummaryRow
            label="Expected wallet"
            value={shortValue(details.expectedPayerAddress)}
            title={details.expectedPayerAddress}
            mono
          />
          <SummaryRow
            label="Destination Tag"
            value={
              details.destinationTag === null
                ? "Not present"
                : String(details.destinationTag)
            }
          />
        </dl>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-lg bg-brand-subtle p-4 text-sm leading-6 text-brand">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0"
        />
        <p>
          These values are frozen by the private payment capability. Group Pay
          cannot edit them and never receives the XRP.
        </p>
      </div>
    </section>
  );
}

function SummaryRow({
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
    <div className="flex justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd
        className={`text-right font-semibold ${mono ? "font-mono" : ""}`}
        title={title}
      >
        {value}
      </dd>
    </div>
  );
}

function FinalConfirmation({
  details,
  onBack,
  onConfirm,
}: {
  details: PaymentDetails;
  onBack(): void;
  onConfirm(): void;
}) {
  return (
    <div className="min-h-80">
      <div className="flex items-start gap-3">
        <LockKeyhole
          aria-hidden="true"
          className="mt-1 size-7 shrink-0 text-brand"
        />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-action">
            Final confirmation
          </p>
          <h2 className="mt-2 font-heading text-2xl font-semibold">
            Confirm the exact Testnet payment
          </h2>
          <p className="mt-2 leading-7 text-muted">
            Group Pay will create a short-lived Sign Request containing these
            immutable fields. You must still inspect and approve it in Xaman.
          </p>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <ConfirmationField
          label="Amount"
          value={`${dropsToXrp(details.amountDrops)} XRP`}
        />
        <ConfirmationField label="Network" value="XRPL Testnet" />
        <ConfirmationField
          label="Destination"
          value={details.destinationAddress}
          mono
        />
        <ConfirmationField
          label="Expected signer"
          value={details.expectedPayerAddress}
          mono
        />
        <ConfirmationField
          label="Destination Tag"
          value={
            details.destinationTag === null
              ? "Not present"
              : String(details.destinationTag)
          }
        />
        <ConfirmationField label="Source Tag" value={String(details.sourceTag)} />
        <div className="sm:col-span-2">
          <ConfirmationField label="InvoiceID" value={details.invoiceId} mono />
        </div>
      </dl>

      <div className="mt-6 rounded-lg border border-action/25 bg-action/10 p-4">
        <p className="font-semibold text-action">No XRP moves at this step.</p>
        <p className="mt-1 text-sm leading-6">
          XRP moves directly to the recipient only after you approve the exact
          transaction in Xaman.
        </p>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to details
        </Button>
        <Button type="button" onClick={onConfirm}>
          <ExternalLink aria-hidden="true" className="size-4" />
          Create Xaman Sign Request
        </Button>
      </div>
    </div>
  );
}

function ConfirmationField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd
        className={`mt-2 break-all text-sm font-semibold ${mono ? "font-mono" : ""}`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusPanel({
  icon,
  title,
  body,
  detail,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center text-center">
      {icon}
      <h2 className="mt-5 font-heading text-xl font-semibold">{title}</h2>
      <p className="mt-3 max-w-md leading-7 text-muted">{body}</p>
      {detail && (
        <p className="mt-3 text-sm font-medium text-foreground">{detail}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
