"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CardAccent } from "@/components/ui/semantic-status";
import {
  BillRecoveryRequestError,
  requestBillRecovery,
  type BillReviewManagement,
} from "@/features/bills/bill-recovery-client";
import type { BillProgress } from "@/features/bills/progress";
import { useLocalization } from "@/features/localization/provider";
import { billRecoveryTranslate } from "@/features/localization/bill-recovery-catalog";
import { formatMoneyAmount } from "@/features/money/money";

export type BillRecoveryControlsProps = {
  capability: string;
  initialProgress: BillProgress;
  onProgressUpdated(progress: BillProgress): void;
};

type Acknowledgements = Record<
  string,
  { prior: boolean; repeated: boolean }
>;

function explorerHref(network: BillProgress["bill"]["network"], tx: string) {
  const host = network === "mainnet" ? "livenet.xrpl.org" : "testnet.xrpl.org";
  return `https://${host}/transactions/${tx}`;
}

function money(value: BillProgress["bill"]["totalAmount"]) {
  return `${formatMoneyAmount(value)} ${value.code}`;
}

function short(value: string) {
  return value.length > 28
    ? `${value.slice(0, 14)}…${value.slice(-10)}`
    : value;
}

export function BillRecoveryControls({
  capability,
  initialProgress,
  onProgressUpdated,
}: BillRecoveryControlsProps) {
  const { locale } = useLocalization();
  const t = (key: Parameters<typeof billRecoveryTranslate>[1]) =>
    billRecoveryTranslate(locale, key);
  const [management, setManagement] = useState<BillReviewManagement | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgements, setAcknowledgements] =
    useState<Acknowledgements>({});
  const [closureReason, setClosureReason] = useState<
    "operator_closed_incomplete" | "collection_ended"
  >("operator_closed_incomplete");
  const [closureConfirmation, setClosureConfirmation] = useState("");
  const [ackStops, setAckStops] = useState(false);
  const [ackRefunds, setAckRefunds] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    requestBillRecovery({ action: "load", adminToken: capability }).then(
      (result) => {
        if (!active) return;
        setManagement(result);
        setLoading(false);
      },
      (requestError: unknown) => {
        if (!active) return;
        setError(
          requestError instanceof BillRecoveryRequestError
            ? requestError.message
            : t("loadError"),
        );
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
    // Capability is the request identity; locale changes affect copy only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capability]);

  const progress = management?.progress ?? initialProgress;
  const slots = useMemo(
    () => new Map(progress.slots.map((slot) => [slot.publicId, slot])),
    [progress.slots],
  );
  const reviews = management?.reviews ?? [];
  const isClosed = progress.bill.status === "closed_incomplete";
  const isSettled = progress.bill.status === "settled";

  async function authorizeRetry(slotPublicId: string) {
    const acknowledgement = acknowledgements[slotPublicId];
    if (!acknowledgement?.prior || !acknowledgement.repeated) return;
    setBusy(`retry:${slotPublicId}`);
    setError(null);
    try {
      const result = await requestBillRecovery({
        action: "authorize_retry",
        adminToken: capability,
        slotPublicId,
        acknowledgePossiblePriorPayment: true,
        acknowledgeDoublePaymentRisk: true,
      });
      setManagement(result);
      onProgressUpdated(result.progress);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof BillRecoveryRequestError
          ? requestError.message
          : t("actionError"),
      );
    } finally {
      setBusy(null);
    }
  }

  async function closeIncomplete() {
    if (
      closureConfirmation !== "CLOSE_INCOMPLETE" ||
      !ackStops ||
      !ackRefunds
    ) {
      return;
    }
    setBusy("close");
    setError(null);
    try {
      const result = await requestBillRecovery({
        action: "close_incomplete",
        adminToken: capability,
        reasonCode: closureReason,
        confirmation: "CLOSE_INCOMPLETE",
        acknowledgeStopsPayments: true,
        acknowledgeNoAutomaticRefunds: true,
      });
      setManagement(result);
      onProgressUpdated(result.progress);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof BillRecoveryRequestError
          ? requestError.message
          : t("actionError"),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <LockKeyhole aria-hidden="true" className="mt-1 size-6 shrink-0 text-brand" />
        <div>
          <h3 className="font-heading text-2xl font-semibold">{t("title")}</h3>
          <p className="mt-2 max-w-3xl leading-7 text-muted">{t("body")}</p>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-3 text-sm text-muted" role="status">
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
          {t("title")}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-danger/25 bg-danger/10 p-4 text-sm font-semibold text-danger"
        >
          {error}
        </div>
      )}

      {!loading && reviews.length > 0 && (
        <div className="mt-7 space-y-5">
          {reviews.map((review) => {
            const slot = slots.get(review.slotPublicId);
            if (!slot) return null;
            const acknowledgement = acknowledgements[review.slotPublicId] ?? {
              prior: false,
              repeated: false,
            };
            const actionable =
              review.status === "needs_review" ||
              review.status === "verification_failed";
            const transactions = review.details?.transactionIds?.length
              ? review.details.transactionIds
              : review.details?.transactionId
                ? [review.details.transactionId]
                : [];

            return (
              <CardAccent
                key={review.slotPublicId}
                family={actionable ? "action_required" : "neutral"}
                className="rounded-xl border border-border bg-background p-5 sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert
                    aria-hidden="true"
                    className="mt-0.5 size-6 shrink-0 text-danger"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-heading text-xl font-semibold">
                      {t("reviewTitle")}
                    </h4>
                    <p className="mt-1 text-sm font-semibold text-danger">
                      {review.reasonCode ?? slot.reviewReasonCode ?? t("reason")}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <h5 className="font-semibold">{t("expected")}</h5>
                    <dl className="mt-3 space-y-3 text-sm">
                      <Fact label={t("payer")} value={slot.expectedPayerAddress ?? "—"} mono />
                      <Fact
                        label={t("recipient")}
                        value={progress.bill.destinationAddress}
                        mono
                      />
                      <Fact label={t("amount")} value={money(slot.expectedAmount)} />
                      <Fact label={t("invoice")} value={slot.invoiceId ?? "—"} mono />
                    </dl>
                  </div>

                  <div className="rounded-lg border border-border bg-surface p-4">
                    <h5 className="font-semibold">{t("observed")}</h5>
                    {review.details ? (
                      <div className="mt-3 space-y-3 text-sm">
                        <Fact
                          label={t("reason")}
                          value={review.details.reasonCode}
                          mono
                        />
                        <p className="leading-6 text-muted">
                          {review.details.message}
                        </p>
                        {transactions.length > 0 && (
                          <div>
                            <p className="font-semibold text-muted">
                              {transactions.length === 1
                                ? t("transaction")
                                : t("candidates")}
                            </p>
                            <ul className="mt-2 space-y-2">
                              {transactions.map((transaction) => (
                                <li key={transaction}>
                                  <a
                                    href={explorerHref(
                                      progress.bill.network,
                                      transaction,
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    referrerPolicy="no-referrer"
                                    title={transaction}
                                    className="inline-flex max-w-full items-center gap-1.5 break-all font-mono text-xs font-semibold text-brand underline-offset-4 hover:underline"
                                  >
                                    {short(transaction)}
                                    <ExternalLink
                                      aria-hidden="true"
                                      className="size-4 shrink-0"
                                    />
                                    <span className="sr-only">{t("explorer")}</span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-muted">
                        {t("noObservation")}
                      </p>
                    )}
                  </div>
                </div>

                {review.retryAuthorizedAt ? (
                  <div
                    role="status"
                    className="mt-5 rounded-lg border border-success/25 bg-success/10 p-4 text-sm font-semibold text-success"
                  >
                    {t("authorized")}
                  </div>
                ) : actionable ? (
                  <div className="mt-5 rounded-lg border border-danger/25 bg-danger/10 p-4">
                    <div className="flex items-start gap-3">
                      <CircleAlert
                        aria-hidden="true"
                        className="mt-0.5 size-5 shrink-0 text-danger"
                      />
                      <p className="text-sm leading-6 text-danger">
                        {t("retryWarning")}
                      </p>
                    </div>
                    <div className="mt-4 space-y-3">
                      <CheckRow
                        checked={acknowledgement.prior}
                        label={t("acknowledgePrior")}
                        onChange={(checked) =>
                          setAcknowledgements((current) => ({
                            ...current,
                            [review.slotPublicId]: {
                              ...acknowledgement,
                              prior: checked,
                            },
                          }))
                        }
                      />
                      <CheckRow
                        checked={acknowledgement.repeated}
                        label={t("acknowledgeRepeated")}
                        onChange={(checked) =>
                          setAcknowledgements((current) => ({
                            ...current,
                            [review.slotPublicId]: {
                              ...acknowledgement,
                              repeated: checked,
                            },
                          }))
                        }
                      />
                    </div>
                    <Button
                      className="mt-4"
                      variant="danger"
                      disabled={
                        busy !== null ||
                        !acknowledgement.prior ||
                        !acknowledgement.repeated
                      }
                      onClick={() => void authorizeRetry(review.slotPublicId)}
                    >
                      {busy === `retry:${review.slotPublicId}` && (
                        <LoaderCircle
                          aria-hidden="true"
                          className="size-4 animate-spin"
                        />
                      )}
                      {busy === `retry:${review.slotPublicId}`
                        ? t("authorizing")
                        : t("authorize")}
                    </Button>
                  </div>
                ) : null}
              </CardAccent>
            );
          })}
        </div>
      )}

      {!loading && isClosed && (
        <CardAccent
          family="destructive"
          className="mt-7 rounded-xl border border-danger/25 bg-danger/10 p-5 sm:p-6"
        >
          <h4 className="font-heading text-xl font-semibold text-danger">
            {t("closedTitle")}
          </h4>
          <p className="mt-2 leading-7 text-muted">{t("closedBody")}</p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <Fact label={t("paidCount")} value={`${progress.summary.paidCount}/${progress.summary.participantCount}`} />
            <Fact label={t("verifiedAmount")} value={money(progress.summary.paidAmount)} />
            <Fact label={t("unpaidAmount")} value={money(progress.summary.remainingAmount)} />
          </dl>
          <p className="mt-5 text-sm font-semibold text-danger">
            {t("noRefund")}
          </p>
        </CardAccent>
      )}

      {!loading && !isClosed && !isSettled && (
        <CardAccent
          family="destructive"
          className="mt-7 rounded-xl border border-danger/25 bg-background p-5 sm:p-6"
        >
          <h4 className="font-heading text-xl font-semibold">
            {t("closeTitle")}
          </h4>
          <p className="mt-2 leading-7 text-muted">{t("closeBody")}</p>

          <label className="mt-5 block text-sm font-semibold">
            {t("closeReason")}
            <select
              value={closureReason}
              onChange={(event) =>
                setClosureReason(
                  event.target.value as
                    | "operator_closed_incomplete"
                    | "collection_ended",
                )
              }
              className="mt-2 min-h-12 w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-focus/35"
            >
              <option value="operator_closed_incomplete">
                {t("operatorClosed")}
              </option>
              <option value="collection_ended">{t("collectionEnded")}</option>
            </select>
          </label>

          <div className="mt-4 space-y-3">
            <CheckRow
              checked={ackStops}
              label={t("acknowledgeStops")}
              onChange={setAckStops}
            />
            <CheckRow
              checked={ackRefunds}
              label={t("acknowledgeRefunds")}
              onChange={setAckRefunds}
            />
          </div>

          <label className="mt-4 block text-sm font-semibold">
            {t("confirmation")}
            <input
              value={closureConfirmation}
              onChange={(event) => setClosureConfirmation(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="mt-2 min-h-12 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-focus/35"
            />
          </label>

          <Button
            className="mt-5"
            variant="danger"
            disabled={
              busy !== null ||
              closureConfirmation !== "CLOSE_INCOMPLETE" ||
              !ackStops ||
              !ackRefunds
            }
            onClick={() => void closeIncomplete()}
          >
            {busy === "close" && (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            )}
            {busy === "close" ? t("closing") : t("close")}
          </Button>
        </CardAccent>
      )}
    </section>
  );
}

function CheckRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange(checked: boolean): void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-5 shrink-0 accent-brand"
      />
      <span>{label}</span>
    </label>
  );
}

function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </dt>
      <dd className={`mt-1 break-all text-sm font-semibold ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
