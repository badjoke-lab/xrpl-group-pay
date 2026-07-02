import { z } from "zod";

import { getConfiguredSourceTag, SourceTagConfigurationError } from "@/config/source-tag";
import { loadPayablePaymentDetails } from "@/features/bills/payment-details";
import { PaymentSlotNotFoundError, PaymentSlotStateError } from "@/features/bills/payment-slot";
import { getPaymentsDatabaseContext, PaymentsDatabaseUnavailableError } from "@/features/persistence/cloudflare-d1";
import { createXrplAccountReadClient, XrplAccountReadConfigurationError } from "@/features/xrpl/account-read-client";
import { checkAssetReadiness, type AssetReadinessAssessment } from "@/features/xrpl/asset-readiness";
import { PayerReadinessConfigurationError } from "@/features/xrpl/payer-readiness";
import { RecipientReadinessConfigurationError } from "@/features/xrpl/recipient-readiness";

export const dynamic = "force-dynamic";

const inputSchema = z.object({ paymentToken: z.string().regex(/^[a-f0-9]{64}$/i) }).strict();

export type PaymentReadinessResponse = {
  payer: AssetReadinessAssessment;
  recipient: AssetReadinessAssessment;
};

export type PaymentReadinessRouteDependencies = {
  assess(paymentToken: string): Promise<PaymentReadinessResponse>;
};

const defaultDependencies: PaymentReadinessRouteDependencies = {
  async assess(paymentToken) {
    const { database, target } = await getPaymentsDatabaseContext();
    const details = await loadPayablePaymentDetails(database, paymentToken, getConfiguredSourceTag());
    if (details.network !== target.network) {
      throw new XrplAccountReadConfigurationError("The payment and deployment networks do not match.");
    }
    const mainnetAccess =
      target.network === "mainnet" && target.mainnetGateApproved
        ? ({ network: "mainnet", mainnetGateApproved: true } as const)
        : undefined;
    const reader = createXrplAccountReadClient(details.network, { mainnetAccess });
    const [payer, recipient] = await Promise.all([
      checkAssetReadiness({
        role: "payer",
        reader,
        account: details.expectedPayerAddress,
        asset: details.asset,
        amountUnits: details.amount.units,
        mainnetAccess,
      }),
      checkAssetReadiness({
        role: "recipient",
        reader,
        account: details.destinationAddress,
        destinationTag: details.destinationTag,
        asset: details.asset,
        amountUnits: details.amount.units,
        mainnetAccess,
      }),
    ]);
    return { payer, recipient };
  },
};

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function handlePaymentReadinessRequest(
  request: Request,
  dependencies: PaymentReadinessRouteDependencies = defaultDependencies,
) {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Send the payment capability as JSON." } }, 415);
  }

  let input: z.infer<typeof inputSchema>;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 256) {
      return json({ error: { code: "PAYMENT_READINESS_REQUEST_TOO_LARGE", message: "The payment readiness request is too large." } }, 413);
    }
    input = inputSchema.parse(JSON.parse(raw) as unknown);
  } catch {
    return json({ error: { code: "INVALID_PAYMENT_CAPABILITY", message: "The payment link is invalid or unavailable." } }, 404);
  }

  try {
    const result = await dependencies.assess(input.paymentToken);
    const unavailable = result.payer.status === "unavailable" || result.recipient.status === "unavailable";
    return json(result, unavailable ? 503 : 200, unavailable ? { "Retry-After": "15" } : {});
  } catch (error) {
    if (error instanceof PaymentSlotNotFoundError) {
      return json({ error: { code: "PAYMENT_SLOT_NOT_FOUND", message: "The payment link is invalid or unavailable." } }, 404);
    }
    if (error instanceof PaymentSlotStateError) {
      return json({ error: { code: error.code, message: error.message } }, 409);
    }
    if (
      error instanceof PaymentsDatabaseUnavailableError ||
      error instanceof SourceTagConfigurationError ||
      error instanceof XrplAccountReadConfigurationError ||
      error instanceof PayerReadinessConfigurationError ||
      error instanceof RecipientReadinessConfigurationError
    ) {
      return json({ error: { code: "PAYMENT_READINESS_UNAVAILABLE", message: error.message } }, 503, { "Retry-After": "15" });
    }
    return json({ error: { code: "PAYMENT_READINESS_FAILED", message: "Payment readiness could not be checked." } }, 500);
  }
}

export function POST(request: Request) {
  return handlePaymentReadinessRequest(request);
}
