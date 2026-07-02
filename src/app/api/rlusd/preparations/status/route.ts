import { z } from "zod";

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
  loadRlusdTrustSetLaunch,
  RlusdTrustSetServiceError,
  synchronizeRlusdTrustSetPayload,
} from "@/features/xrpl/rlusd-trustset-service";
import {
  RlusdTrustSetNotFoundError,
  RlusdTrustSetStoreError,
} from "@/features/xrpl/rlusd-trustset-store";

export const dynamic = "force-dynamic";

const inputSchema = z
  .object({
    preparationToken: z.string().regex(/^[a-f0-9]{64}$/i),
  })
  .strict();

export type RlusdPreparationStatusDependencies = {
  synchronize(preparationToken: string): Promise<unknown>;
};

const defaultDependencies: RlusdPreparationStatusDependencies = {
  async synchronize(preparationToken) {
    const { database, target } = await getPaymentsDatabaseContext();
    const launch = await loadRlusdTrustSetLaunch(database, preparationToken);
    if (!launch.payloadId) return launch;

    const environment = getXamanEnvironment();
    if (environment.APP_NETWORK !== target.network || launch.network !== target.network) {
      throw new XamanConfigurationError();
    }
    const mainnetAccess =
      target.network === "mainnet" && target.mainnetGateApproved
        ? ({ network: "mainnet", mainnetGateApproved: true } as const)
        : undefined;
    const client = new XamanClient(environment);
    const reader = createXrplAccountReadClient(target.network, {
      mainnetAccess,
    });
    return synchronizeRlusdTrustSetPayload(database, launch.payloadId, {
      reader,
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

export async function handleRlusdPreparationStatusRequest(
  request: Request,
  dependencies: RlusdPreparationStatusDependencies = defaultDependencies,
) {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return json(
      { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Send the preparation capability as JSON." } },
      415,
    );
  }

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
    return json(await dependencies.synchronize(input.preparationToken), 200);
  } catch (error) {
    if (error instanceof RlusdTrustSetNotFoundError) {
      return json(
        { error: { code: "PREPARATION_NOT_FOUND", message: error.message } },
        404,
      );
    }
    if (
      error instanceof PaymentsDatabaseUnavailableError ||
      error instanceof XamanConfigurationError ||
      error instanceof RlusdTrustSetStoreError
    ) {
      return json(
        { error: { code: "PREPARATION_UNAVAILABLE", message: error.message } },
        503,
        { "Retry-After": "15" },
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
        { "Retry-After": "15" },
      );
    }
    return json(
      { error: { code: "PREPARATION_STATUS_FAILED", message: "The RLUSD preparation status could not be checked." } },
      500,
    );
  }
}

export function POST(request: Request) {
  return handleRlusdPreparationStatusRequest(request);
}
