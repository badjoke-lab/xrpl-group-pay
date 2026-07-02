"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DetailsErrorPanel,
  LoadingDetailsPanel,
  PaymentSummary,
  UnavailablePanel,
} from "@/components/payment/payment-panels";
import {
  PaymentReadinessPanel,
  paymentReadinessAllowsHandoff,
} from "@/components/payment/payment-readiness-panel";
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
import type { PaymentReadinessResponse } from "@/features/xrpl/payment-readiness-contract";
import { requestPaymentReadiness } from "@/features/xrpl/payment-readiness-client";

import {
  TestnetPaymentForm as ExistingPaymentFlow,
  type TestnetPaymentFormProps,
} from "./testnet-payment-flow-v2";

type LoadState =
  | { kind: "loading" }
  | { kind: "loaded"; details: PaymentDetails }
  | { kind: "error"; message: string; code: string | null };

export function PayerReadyPaymentFlow({
  paymentToken,
}: TestnetPaymentFormProps) {
  const { locale } = useCriticalLocalization();
  const { capability, resolved } = useCapabilityToken(paymentToken);
  const [detailsState, setDetailsState] = useState<LoadState>({
    kind: "loading",
  });
  const [readiness, setReadiness] =
    useState<PaymentReadinessResponse | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [setupWorking, setSetupWorking] = useState(false);
  const [setupPath, setSetupPath] = useState<string | null>(null);

  const recheck = useCallback(async () => {
    if (!capability) return;
    setReadinessLoading(true);
    setReadinessError(null);
    try {
      setReadiness(await requestPaymentReadiness(capability));
    } catch (error) {
      setReadiness(null);
      setReadinessError(
        error instanceof Error
          ? error.message
          : "Payment readiness could not be checked.",
      );
    } finally {
      setReadinessLoading(false);
    }
  }, [capability]);

  const load = useCallback(async () => {
    if (!capability) return;
    setDetailsState({ kind: "loading" });
    setReadiness(null);
    setSetupPath(null);
    try {
      const details = await requestPaymentDetails(capability);
      setDetailsState({ kind: "loaded", details });
      await recheck();
    } catch (error) {
      setDetailsState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : criticalTranslate(locale, "payer.error.details"),
        code:
          error instanceof PaymentDetailsRequestError ? error.code : null,
      });
    }
  }, [capability, locale, recheck]);

  useEffect(() => {
    if (!resolved || !capability) return;
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [capability, load, resolved]);

  useEffect(() => {
    if (!readiness || paymentReadinessAllowsHandoff(readiness)) return;
    const refresh = () => void recheck();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [readiness, recheck]);

  async function prepareRlusdSetup() {
    if (
      detailsState.kind !== "loaded" ||
      detailsState.details.asset.assetType !== "issued"
    ) {
      return;
    }
    setSetupWorking(true);
    setReadinessError(null);
    try {
      const response = await fetch("/api/rlusd/preparations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "payer",
          account: detailsState.details.expectedPayerAddress,
          requiredAmountUnits: detailsState.details.amount.units,
        }),
        cache: "no-store",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || typeof body?.preparationPath !== "string") {
        throw new Error(
          body?.error?.message ?? "RLUSD setup could not be prepared.",
        );
      }
      setSetupPath(body.preparationPath);
    } catch (error) {
      setReadinessError(
        error instanceof Error
          ? error.message
          : "RLUSD setup could not be prepared.",
      );
    } finally {
      setSetupWorking(false);
    }
  }

  if (!resolved) return <LoadingDetailsPanel />;
  if (!capability) return <UnavailablePanel />;
  if (detailsState.kind === "loading") return <LoadingDetailsPanel />;
  if (detailsState.kind === "error") {
    return (
      <DetailsErrorPanel
        message={detailsState.message}
        alreadyPaid={detailsState.code === "SLOT_ALREADY_PAID"}
        onRetry={() => void load()}
      />
    );
  }

  const panel = (
    <PaymentReadinessPanel
      details={detailsState.details}
      readiness={readiness}
      loading={readinessLoading}
      error={readinessError}
      setupWorking={setupWorking}
      setupPath={setupPath}
      onRecheck={() => void recheck()}
      onPrepareSetup={() => void prepareRlusdSetup()}
    />
  );

  if (paymentReadinessAllowsHandoff(readiness)) {
    return (
      <div className="space-y-6">
        {panel}
        <ExistingPaymentFlow paymentToken={capability} />
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <PaymentSummary details={detailsState.details} />
      {panel}
    </div>
  );
}

export type { TestnetPaymentFormProps };
