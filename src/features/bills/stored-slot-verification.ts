import {
  dispatchAssetPaymentVerification,
  dispatchPaymentVerification,
} from "@/features/payment-verification/strategy";
import type { AssetVerificationOutcome } from "@/features/payment-verification/asset-outcome";
import type { PaymentVerificationOutcome } from "@/features/payment-verification/types";
import type { ProviderRequestStatus } from "@/features/wallet-providers/status-reader";
import { XrplTransactionPendingError } from "@/features/xrpl/client";
import type { XrplTxResult } from "@/features/xrpl/schemas";

import type { ResolvedPaymentSlot } from "./payment-slot";
import { buildStoredSlotPaymentIntent } from "./slot-payment-request";

export type StoredSlotVerificationDependencies = {
  readProviderStatus(requestId: string): Promise<ProviderRequestStatus>;
  getXrplTransaction(transactionId: string): Promise<XrplTxResult>;
  sourceTag: number;
  now?: () => Date;
};

type PreliminaryOutcome = Extract<
  AssetVerificationOutcome,
  { status: "pending" | "failed" }
>;

function providerOutcome(
  request: ProviderRequestStatus,
): PreliminaryOutcome | null {
  if (
    request.status === "created" ||
    request.status === "available" ||
    request.status === "opened" ||
    request.status === "signed"
  ) {
    return {
      status: "pending",
      reason: "HANDOFF_NOT_SUBMITTED",
      transactionId: request.transactionId,
      message: "The wallet request has not produced a submitted transaction yet.",
    };
  }

  if (
    request.status === "rejected" ||
    request.status === "expired" ||
    request.status === "failed"
  ) {
    return {
      status: "failed",
      reason: "HANDOFF_FAILED",
      transactionId: request.transactionId,
      message: `The wallet request ended with status ${request.status}.`,
    };
  }

  if (request.status !== "submitted" || !request.transactionId) {
    return {
      status: "failed",
      reason: "INVALID_PROVIDER_HANDOFF",
      transactionId: request.transactionId,
      message: "The wallet provider did not return a submitted transaction ID.",
    };
  }

  return null;
}

export async function verifyStoredSlotAssetPayment(
  slot: ResolvedPaymentSlot,
  requestId: string,
  dependencies: StoredSlotVerificationDependencies,
): Promise<AssetVerificationOutcome> {
  const now = dependencies.now?.() ?? new Date();
  const request = await dependencies.readProviderStatus(requestId);
  const preliminary = providerOutcome(request);
  if (preliminary) return preliminary;

  const transactionId = request.transactionId as string;
  const intent = buildStoredSlotPaymentIntent(
    slot,
    dependencies.sourceTag,
    now,
  );

  try {
    const transaction = await dependencies.getXrplTransaction(transactionId);
    return dispatchAssetPaymentVerification(
      intent,
      transactionId,
      transaction,
      now,
    );
  } catch (error) {
    if (error instanceof XrplTransactionPendingError) {
      return {
        status: "pending",
        reason: "TRANSACTION_NOT_FOUND",
        transactionId,
        message:
          "The transaction is not available on a validated Testnet ledger yet.",
      };
    }
    throw error;
  }
}

export async function verifyStoredSlotPayment(
  slot: ResolvedPaymentSlot,
  requestId: string,
  dependencies: StoredSlotVerificationDependencies,
): Promise<PaymentVerificationOutcome> {
  const outcome = await verifyStoredSlotAssetPayment(
    slot,
    requestId,
    dependencies,
  );
  if (outcome.status !== "verified") return outcome;
  if (outcome.legacyProof !== null) {
    return { status: "verified", proof: outcome.legacyProof };
  }

  const intent = buildStoredSlotPaymentIntent(
    slot,
    dependencies.sourceTag,
    dependencies.now?.() ?? new Date(),
  );
  return dispatchPaymentVerification(
    intent,
    outcome.payment.transactionId,
    {
      hash: outcome.payment.transactionId,
      validated: true,
      ledger_index: outcome.payment.ledgerIndex,
      tx_json: {},
      meta: { TransactionResult: "tesSUCCESS" },
    },
  );
}
