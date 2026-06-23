import { z } from "zod";

import {
  getXamanEnvironment,
  XamanConfigurationError,
} from "@/config/server-env";
import {
  getPaymentsDatabase,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";
import type { RecordedPaymentReceipt } from "@/features/persistence/types";
import {
  PaymentReceiptConflictError,
  PaymentReceiptDatabaseError,
  PaymentReceiptInputError,
  recordVerifiedPayment,
} from "@/features/persistence/verified-payment-receipts";
import { verifyXamanPayment } from "@/features/payment-verification/service";
import type {
  LedgerVerificationProof,
  PaymentVerificationOutcome,
} from "@/features/payment-verification/types";
import { XamanApiError, XamanClient } from "@/features/xaman/client";
import {
  XrplNodeUnavailableError,
  XrplTestnetClient,
} from "@/features/xrpl/client";

export const dynamic = "force-dynamic";

const MAX_VERIFICATION_REQUEST_BYTES = 512;

const verificationInputSchema = z
  .object({ payloadId: z.string().uuid() })
  .strict();

export type VerificationRouteDependencies = {
  verifyPayment(payloadId: string): Promise<PaymentVerificationOutcome>;
  recordPayment(proof: LedgerVerificationProof): Promise<RecordedPaymentReceipt>;
};

const defaultDependencies: VerificationRouteDependencies = {
  async verifyPayment(payloadId) {
    const environment = getXamanEnvironment();
    const xaman = new XamanClient(environment);
    const xrpl = new XrplTestnetClient();
    return verifyXamanPayment(payloadId, {
      getXamanPayload: (id) => xaman.getPayload(id),
      getXrplTransaction: (transactionId) =>
        xrpl.getTransaction(transactionId),
      sourceTag: environment.XRPL_SOURCE_TAG,
    });
  },
  async recordPayment(proof) {
    const database = await getPaymentsDatabase();
    return recordVerifiedPayment(database, proof);
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

  let input: z.infer<typeof verificationInputSchema>;
  try {
    const raw = await request.text();
    if (
      new TextEncoder().encode(raw).byteLength > MAX_VERIFICATION_REQUEST_BYTES
    ) {
      return requestTooLarge();
    }
    input = verificationInputSchema.parse(JSON.parse(raw) as unknown);
  } catch {
    return json(
      {
        error: {
          code: "INVALID_VERIFICATION_INPUT",
          message: "Provide a valid Xaman payload identifier.",
        },
      },
      400,
    );
  }

  try {
    const outcome = await dependencies.verifyPayment(input.payloadId);

    if (outcome.status === "pending") {
      return json(outcome, 202);
    }
    if (outcome.status === "failed") {
      return json(outcome, 422);
    }

    const receipt = await dependencies.recordPayment(outcome.proof);
    return json({ ...outcome, receipt }, 200);
  } catch (error) {
    if (error instanceof XamanConfigurationError) {
      return json(
        { error: { code: "XAMAN_NOT_CONFIGURED", message: error.message } },
        503,
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
    if (
      error instanceof PaymentsDatabaseUnavailableError ||
      error instanceof PaymentReceiptDatabaseError
    ) {
      return json(
        {
          error: {
            code: "RECEIPT_STORAGE_UNAVAILABLE",
            message: error.message,
          },
        },
        503,
      );
    }
    if (error instanceof PaymentReceiptConflictError) {
      return json(
        { error: { code: error.code, message: error.message } },
        409,
      );
    }
    if (error instanceof PaymentReceiptInputError) {
      return json(
        {
          error: {
            code: "INVALID_VERIFIED_RECEIPT",
            message: "The verified Payment proof could not be normalized.",
          },
        },
        500,
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
