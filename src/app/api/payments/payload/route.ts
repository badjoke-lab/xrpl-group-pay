import { z } from "zod";

import {
  controlledMainnetAuthorizationFailure,
  type MainnetAcceptanceAuthorizer,
} from "@/config/mainnet-acceptance-http";
import {
  assertPaymentOperationAllowed,
  PaymentOperationsConfigurationError,
  PaymentOperationsHaltedError,
} from "@/config/payment-operations";
import {
  getXamanEnvironment,
  XamanConfigurationError,
} from "@/config/server-env";
import { createPersistedSlotPayload } from "@/features/bills/create-persisted-payload";
import { loadPayablePaymentDetails } from "@/features/bills/payment-details";
import {
  PaymentSlotNotFoundError,
  PaymentSlotStateError,
} from "@/features/bills/payment-slot";
import {
  PaymentReconciliationReviewRequiredError,
  PaymentReconciliationUnavailableError,
  reconcileReplacementPayment,
} from "@/features/bills/reconcile-replacement-payment";
import {
  getPaymentsDatabaseContext,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";
import {
  ActiveRequestError,
  RequestPersistenceError,
} from "@/features/persistence/request-state-errors";
import { WalletProviderError } from "@/features/wallet-providers/types";
import { XamanApiError } from "@/features/xaman/client";
import { createXamanProvider } from "@/features/xaman/provider";
import {
  createXrplAccountReadClient,
  XrplAccountReadConfigurationError,
} from "@/features/xrpl/account-read-client";
import { createXrplAccountTransactionClient } from "@/features/xrpl/account-transaction-client";
import {
  PaymentReadinessGateError,
  requirePaymentReadiness,
} from "@/features/xrpl/payment-readiness-gate";
import { PayerReadinessConfigurationError } from "@/features/xrpl/payer-readiness";
import { RecipientReadinessConfigurationError } from "@/features/xrpl/recipient-readiness";

export const dynamic = "force-dynamic";

const inputSchema = z
  .object({
    paymentToken: z.string().regex(/^[a-f0-9]{64}$/i),
  })
  .strict();

export type SlotPayloadRouteDependencies = {
  authorize?: MainnetAcceptanceAuthorizer;
  createPayload(paymentToken: string): Promise<unknown>;
};

const defaultDependencies: SlotPayloadRouteDependencies = {
  async createPayload(paymentToken) {
    assertPaymentOperationAllowed(process.env, "create");
    const { database, target } = await getPaymentsDatabaseContext();
    const environment = getXamanEnvironment();
    const provider = createXamanProvider(environment);
    const mainnetAccess =
      environment.APP_NETWORK === "mainnet" &&
      environment.MAINNET_GATE_APPROVED === true
        ? ({
            network: "mainnet",
            mainnetGateApproved: true,
          } as const)
        : undefined;
    if (target.network !== environment.APP_NETWORK) {
      throw new XrplAccountReadConfigurationError(
        "The payment database and wallet provider networks do not match.",
      );
    }
    const details = await loadPayablePaymentDetails(
      database,
      paymentToken,
      environment.XRPL_SOURCE_TAG,
    );
    const readinessReader = createXrplAccountReadClient(
      environment.APP_NETWORK,
      { mainnetAccess },
    );
    await requirePaymentReadiness({
      details,
      reader: readinessReader,
      mainnetAccess,
    });
    const history = createXrplAccountTransactionClient(
      environment.APP_NETWORK,
      {
        deploymentNetwork: environment.APP_NETWORK,
        mainnetAccess,
      },
    );

    return createPersistedSlotPayload(database, paymentToken, {
      sourceTag: environment.XRPL_SOURCE_TAG,
      createHandoff: (intent) => provider.createHandoff(intent),
      reconcileReplacement: (targetDatabase, slot, now) =>
        reconcileReplacementPayment(targetDatabase, slot, {
          sourceTag: environment.XRPL_SOURCE_TAG,
          findTransactions: (account, invoiceId) =>
            history.findByInvoiceId(account, invoiceId),
          now: () => now,
        }),
    });
  },
};

function json(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export async function handleCreateSlotPayloadRequest(
  request: Request,
  dependencies: SlotPayloadRouteDependencies = defaultDependencies,
) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Send the payment capability as JSON.",
        },
      },
      415,
    );
  }

  const authorizationFailure = await controlledMainnetAuthorizationFailure(
    request,
    dependencies.authorize,
  );
  if (authorizationFailure) return authorizationFailure;

  let input: z.infer<typeof inputSchema>;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 256) {
      return json(
        {
          error: {
            code: "PAYLOAD_REQUEST_TOO_LARGE",
            message: "The payload request is too large.",
          },
        },
        413,
      );
    }
    input = inputSchema.parse(JSON.parse(raw) as unknown);
  } catch {
    return json(
      {
        error: {
          code: "INVALID_PAYMENT_CAPABILITY",
          message: "The payment link is invalid or unavailable.",
        },
      },
      404,
    );
  }

  try {
    return json(await dependencies.createPayload(input.paymentToken), 201);
  } catch (error) {
    if (error instanceof PaymentOperationsHaltedError) {
      return json(
        {
          error: {
            code: error.code,
            operation: error.operation,
            mode: error.mode,
            message: error.message,
          },
        },
        503,
        { "Retry-After": "60" },
      );
    }
    if (error instanceof PaymentOperationsConfigurationError) {
      return json(
        {
          error: {
            code: "PAYMENT_OPERATIONS_UNAVAILABLE",
            message: error.message,
          },
        },
        503,
      );
    }
    if (error instanceof PaymentReadinessGateError) {
      return json(
        {
          error: {
            code: error.code,
            message: error.message,
            payer: error.payer,
            recipient: error.recipient,
          },
        },
        error.code === "PAYMENT_READINESS_BLOCKED" ? 422 : 503,
        error.code === "PAYMENT_READINESS_UNAVAILABLE"
          ? { "Retry-After": "15" }
          : {},
      );
    }
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
    if (error instanceof PaymentSlotStateError) {
      return json(
        { error: { code: error.code, message: error.message } },
        409,
      );
    }
    if (error instanceof ActiveRequestError) {
      return json(
        {
          error: {
            code: "ACTIVE_HANDOFF_EXISTS",
            message: error.message,
          },
        },
        409,
      );
    }
    if (error instanceof PaymentReconciliationReviewRequiredError) {
      return json(
        {
          error: {
            code: error.code,
            matchCount: error.matchCount,
            message: error.message,
          },
        },
        409,
      );
    }
    if (error instanceof PaymentReconciliationUnavailableError) {
      return json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        503,
        { "Retry-After": "30" },
      );
    }
    if (
      error instanceof PaymentsDatabaseUnavailableError ||
      error instanceof XamanConfigurationError ||
      error instanceof XrplAccountReadConfigurationError ||
      error instanceof PayerReadinessConfigurationError ||
      error instanceof RecipientReadinessConfigurationError ||
      error instanceof RequestPersistenceError
    ) {
      return json(
        {
          error: {
            code: "PAYMENT_SERVICE_UNAVAILABLE",
            message: error.message,
          },
        },
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
        error.code === "UNSUPPORTED_INTENT" ? 422 : 502,
      );
    }
    if (error instanceof XamanApiError) {
      return json(
        { error: { code: "WALLET_PROVIDER_ERROR", message: error.message } },
        502,
      );
    }
    return json(
      {
        error: {
          code: "PAYLOAD_CREATION_FAILED",
          message: "The Wallet Handoff could not be created.",
        },
      },
      500,
    );
  }
}

export function POST(request: Request) {
  return handleCreateSlotPayloadRequest(request);
}
