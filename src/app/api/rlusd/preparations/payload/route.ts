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
import {
  getPaymentsDatabaseContext,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";
import { XamanApiError, XamanClient } from "@/features/xaman/client";
import { createXrplAccountReadClient } from "@/features/xrpl/account-read-client";
import {
  createOrResumeRlusdTrustSetHandoff,
  RlusdTrustSetServiceError,
} from "@/features/xrpl/rlusd-trustset-service";
import {
  RlusdTrustSetNotFoundError,
  RlusdTrustSetStoreError,
} from "@/features/xrpl/rlusd-trustset-store";
import {
  createXrplSigningStateClient,
  XrplSigningStateUnavailableError,
} from "@/features/xrpl/signing-state-client";

export const dynamic = "force-dynamic";

const inputSchema = z
  .object({
    preparationToken: z.string().regex(/^[a-f0-9]{64}$/i),
  })
  .strict();

export type RlusdPreparationPayloadDependencies = {
  authorize?: MainnetAcceptanceAuthorizer;
  create(preparationToken: string): Promise<unknown>;
};

const defaultDependencies: RlusdPreparationPayloadDependencies = {
  async create(preparationToken) {
    assertPaymentOperationAllowed(process.env, "create");
    const { database, target } = await getPaymentsDatabaseContext();
    const environment = getXamanEnvironment();
    if (environment.APP_NETWORK !== target.network) {
      throw new XamanConfigurationError();
    }
    const mainnetAccess =
      target.network === "mainnet" && target.mainnetGateApproved
        ? ({ network: "mainnet", mainnetGateApproved: true } as const)
        : undefined;
    const client = new XamanClient(environment);
    const signingState = createXrplSigningStateClient(target.network, {
      deploymentNetwork: target.network,
      mainnetAccess,
    });
    const reader = createXrplAccountReadClient(target.network, {
      mainnetAccess,
    });

    return createOrResumeRlusdTrustSetHandoff(database, preparationToken, {
      mainnetAccess,
      reader,
      getSigningState: (account) => signingState.getSigningState(account),
      createPayload: (request) => client.createPayload(request),
      getPayload: (payloadId) => client.getPayload(payloadId),
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

export async function handleRlusdPreparationPayloadRequest(
  request: Request,
  dependencies: RlusdPreparationPayloadDependencies = defaultDependencies,
) {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return json(
      { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Send the preparation capability as JSON." } },
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
        { error: { code: "PREPARATION_REQUEST_TOO_LARGE", message: "The preparation request is too large." } },
        413,
      );
    }
    input = inputSchema.parse(JSON.parse(raw) as unknown);
  } catch {
    return json(
      { error: { code: "PREPARATION_NOT_FOUND", message: "The RLUSD preparation link is invalid or unavailable." } },
      404,
    );
  }

  try {
    const result = await dependencies.create(input.preparationToken);
    return json(result, 201);
  } catch (error) {
    if (error instanceof PaymentOperationsHaltedError) {
      return json(
        { error: { code: error.code, message: error.message } },
        503,
        { "Retry-After": "60" },
      );
    }
    if (
      error instanceof PaymentOperationsConfigurationError ||
      error instanceof PaymentsDatabaseUnavailableError ||
      error instanceof XamanConfigurationError ||
      error instanceof RlusdTrustSetStoreError ||
      error instanceof XrplSigningStateUnavailableError
    ) {
      return json(
        { error: { code: "PREPARATION_SERVICE_UNAVAILABLE", message: error.message } },
        503,
      );
    }
    if (error instanceof RlusdTrustSetNotFoundError) {
      return json(
        { error: { code: "PREPARATION_NOT_FOUND", message: error.message } },
        404,
      );
    }
    if (error instanceof RlusdTrustSetServiceError) {
      return json(
        { error: { code: error.code, message: error.message } },
        409,
      );
    }
    if (error instanceof XamanApiError) {
      return json(
        { error: { code: "XAMAN_API_ERROR", message: error.message } },
        502,
      );
    }
    return json(
      { error: { code: "TRUSTSET_HANDOFF_FAILED", message: "The RLUSD TrustSet handoff could not be created." } },
      500,
    );
  }
}

export function POST(request: Request) {
  return handleRlusdPreparationPayloadRequest(request);
}
