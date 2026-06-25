import { z } from "zod";

import {
  getXamanEnvironment,
  XamanConfigurationError,
} from "@/config/server-env";
import {
  loadPaymentSlotByToken,
  PaymentSlotNotFoundError,
} from "@/features/bills/payment-slot";
import {
  PaymentSlotSettlementConflictError,
  PaymentSlotSettlementDatabaseError,
} from "@/features/bills/settle-slot";
import { verifyAndSettleStoredSlotPayment } from "@/features/bills/verify-and-settle-slot";
import {
  getPaymentsDatabase,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";
import type { AssetPaymentVerificationApiOutcome } from "@/features/payment-verification/types";
import { WalletProviderError } from "@/features/wallet-providers/types";
import { XamanApiError, XamanClient } from "@/features/xaman/client";
import { XamanStatusReader } from "@/features/xaman/status-reader";
import {
  XrplNodeUnavailableError,
  XrplTestnetClient,
} from "@/features/xrpl/client";

export const dynamic = "force-dynamic";

const MAX_VERIFICATION_REQUEST_BYTES = 512;
const capabilitySchema = z.string().regex(/^[a-f0-9]{64}$/i);
const payloadIdSchema = z.string().uuid();
const requestBodySchema = z
  .object({ paymentToken: z.string(), payloadId: z.string() })
  .strict();

export type VerificationRouteDependencies = {
  verifyAndRecord(
    paymentToken: string,
    payloadId: string,
  ): Promise<AssetPaymentVerificationApiOutcome>;
};

const defaultDependencies: VerificationRouteDependencies = {
  async verifyAndRecord(paymentToken, payloadId) {
    const database = await getPaymentsDatabase();
    const environment = getXamanEnvironment();
    const xaman = new XamanClient(environment);
    const providerStatus = new XamanStatusReader(xaman);
    const xrpl = new XrplTestnetClient();
    const slot = await loadPaymentSlotByToken(database, paymentToken);

    return verifyAndSettleStoredSlotPayment(database, slot, payloadId, {
      verification: {
        readProviderStatus: (id) => providerStatus.readStatus(id),
        getXrplTransaction: (transactionId) =>
          xrpl.getTransaction(transactionId),
        sourceTag: environment.XRPL_SOURCE_TAG,
      },
    });
  },
};

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function requestTooLarge() {
  return json(
    {
      error: {
        code: "VERIFICATION_REQUEST_TOO_LARGE",
        message: "The verification request is too large.",
      },
    },
    413,
  );
}

export async function handleVerificationRequest(
  request: Request,
  dependencies: VerificationRouteDependencies = defaultDependencies,
) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Send the verification request as JSON.",
        },
      },
      415,
    );
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_VERIFICATION_REQUEST_BYTES
    ) {
      return requestTooLarge();
    }
  }

  let rawInput: z.infer<typeof requestBodySchema>;
  try {
    const raw = await request.text();
    if (
      new TextEncoder().encode(raw).byteLength > MAX_VERIFICATION_REQUEST_BYTES
    ) {
      return requestTooLarge();
    }
    rawInput = requestBodySchema.parse(JSON.parse(raw) as unknown);
  } catch {
    return json(
      {
        error: {
          code: "INVALID_VERIFICATION_INPUT",
          message: "Provide a valid payment capability and wallet request identifier.",
        },
      },
      400,
    );
  }

  if (!capabilitySchema.safeParse(rawInput.paymentToken).success) {
    return json(
      {
        error: {
          code: "PAYMENT_SLOT_NOT_FOUND",
          message: "The payment link is invalid or unavailable.",
        },
      },
      404,
    );
  }
  if (!payloadIdSchema.safeParse(rawInput.payloadId).success) {
    return json(
      {
        error: {
          code: "INVALID_VERIFICATION_INPUT",
          message: "Provide a valid wallet request identifier.",
        },
      },
      400,
    );
  }

  try {
    const outcome = await dependencies.verifyAndRecord(
      rawInput.paymentToken,
      rawInput.payloadId,
    );
    if (outcome.status === "pending") return json(outcome, 202);
    if (outcome.status === "failed") return json(outcome, 422);
    return json(outcome, 200);
  } catch (error) {
    if (error instanceof PaymentSlotNotFoundError) {
      return json(
        {
          error: {
            code: "PAYMENT_SLOT_NOT_FOUND",
            message: "The payment link is invalid or unavailable.",
          },
        },
        404,
      );
    }
    if (error instanceof PaymentSlotSettlementConflictError) {
      return json(
        { error: { code: error.code, message: error.message } },
        409,
      );
    }
    if (
      error instanceof PaymentsDatabaseUnavailableError ||
      error instanceof PaymentSlotSettlementDatabaseError
    ) {
      return json(
        {
          error: {
            code: "SLOT_SETTLEMENT_UNAVAILABLE",
            message: error.message,
          },
        },
        503,
      );
    }
    if (error instanceof XamanConfigurationError) {
      return json(
        { error: { code: "XAMAN_NOT_CONFIGURED", message: error.message } },
        503,
      );
    }
    if (error instanceof WalletProviderError) {
      return json(
        {
          error: {
            code: "WALLET_PROVIDER_ERROR",
            provider: error.providerId,
            reason: error.code,
            message: error.message,
          },
        },
        502,
      );
    }
    if (error instanceof XamanApiError) {
      return json(
        { error: { code: "XAMAN_API_ERROR", message: error.message } },
        502,
      );
    }
    if (error instanceof XrplNodeUnavailableError) {
      return json(
        { error: { code: "XRPL_UNAVAILABLE", message: error.message } },
        502,
      );
    }
    return json(
      {
        error: {
          code: "PAYMENT_VERIFICATION_FAILED",
          message: "The Payment could not be verified and recorded.",
        },
      },
      500,
    );
  }
}

export function POST(request: Request) {
  return handleVerificationRequest(request);
}
