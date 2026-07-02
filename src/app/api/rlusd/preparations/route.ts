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
  getPaymentsDatabaseContext,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";
import { createXrplAccountReadClient } from "@/features/xrpl/account-read-client";
import {
  planRlusdTrustSetPreparation,
  RlusdTrustSetPlanError,
  type RlusdTrustSetPlan,
} from "@/features/xrpl/rlusd-trustset-plan";
import { RlusdTrustSetStoreError } from "@/features/xrpl/rlusd-trustset-store";

export const dynamic = "force-dynamic";

const inputSchema = z
  .object({
    purpose: z.enum(["recipient", "payer"]),
    account: z.string().trim().min(1).max(80),
    requiredAmountUnits: z.string().regex(/^[1-9]\d{0,63}$/),
  })
  .strict();

export type RlusdPreparationRouteDependencies = {
  authorize?: MainnetAcceptanceAuthorizer;
  create(input: z.infer<typeof inputSchema>): Promise<RlusdTrustSetPlan>;
};

const defaultDependencies: RlusdPreparationRouteDependencies = {
  async create(input) {
    assertPaymentOperationAllowed(process.env, "create");
    const { database, target } = await getPaymentsDatabaseContext();
    const mainnetAccess =
      target.network === "mainnet" && target.mainnetGateApproved
        ? ({
            network: "mainnet",
            mainnetGateApproved: true,
          } as const)
        : undefined;
    const reader = createXrplAccountReadClient(target.network, {
      mainnetAccess,
    });
    return planRlusdTrustSetPreparation({
      database,
      reader,
      network: target.network,
      purpose: input.purpose,
      account: input.account,
      requiredAmountUnits: input.requiredAmountUnits,
      mainnetAccess,
    });
  },
};

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export async function handleCreateRlusdPreparationRequest(
  request: Request,
  dependencies: RlusdPreparationRouteDependencies = defaultDependencies,
) {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return json(
      { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Send the preparation request as JSON." } },
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
    if (new TextEncoder().encode(raw).byteLength > 1024) {
      return json(
        { error: { code: "PREPARATION_REQUEST_TOO_LARGE", message: "The preparation request is too large." } },
        413,
      );
    }
    input = inputSchema.parse(JSON.parse(raw) as unknown);
  } catch {
    return json(
      { error: { code: "INVALID_PREPARATION_INPUT", message: "Check the account, purpose, and RLUSD amount." } },
      400,
    );
  }

  try {
    const result = await dependencies.create(input);
    if (result.status === "blocked") {
      return json({ readiness: result }, 422);
    }
    if (result.status === "unavailable") {
      return json({ readiness: result }, 503, { "Retry-After": "30" });
    }
    return json(
      {
        ...result,
        preparationPath: `/rlusd/prepare#token=${result.capabilityToken}`,
      },
      201,
    );
  } catch (error) {
    if (error instanceof PaymentOperationsHaltedError) {
      return json(
        { error: { code: error.code, message: error.message } },
        503,
        { "Retry-After": "60" },
      );
    }
    if (error instanceof PaymentOperationsConfigurationError) {
      return json(
        { error: { code: "PAYMENT_OPERATIONS_UNAVAILABLE", message: error.message } },
        503,
      );
    }
    if (error instanceof RlusdTrustSetPlanError) {
      return json(
        { error: { code: "INVALID_PREPARATION_INPUT", message: error.message } },
        400,
      );
    }
    if (
      error instanceof PaymentsDatabaseUnavailableError ||
      error instanceof RlusdTrustSetStoreError
    ) {
      return json(
        { error: { code: "PREPARATION_STORAGE_UNAVAILABLE", message: error.message } },
        503,
      );
    }
    return json(
      { error: { code: "PREPARATION_CREATION_FAILED", message: "The RLUSD preparation link could not be created." } },
      500,
    );
  }
}

export function POST(request: Request) {
  return handleCreateRlusdPreparationRequest(request);
}
