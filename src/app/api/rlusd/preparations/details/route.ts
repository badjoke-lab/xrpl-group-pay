import { z } from "zod";

import {
  getPaymentsDatabase,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";
import {
  loadRlusdTrustSetLaunch,
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

export type RlusdPreparationDetailsDependencies = {
  load(preparationToken: string): Promise<unknown>;
};

const defaultDependencies: RlusdPreparationDetailsDependencies = {
  async load(preparationToken) {
    return loadRlusdTrustSetLaunch(
      await getPaymentsDatabase(),
      preparationToken,
    );
  },
};

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function handleRlusdPreparationDetailsRequest(
  request: Request,
  dependencies: RlusdPreparationDetailsDependencies = defaultDependencies,
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
    return json(await dependencies.load(input.preparationToken), 200);
  } catch (error) {
    if (error instanceof RlusdTrustSetNotFoundError) {
      return json(
        { error: { code: "PREPARATION_NOT_FOUND", message: error.message } },
        404,
      );
    }
    if (
      error instanceof PaymentsDatabaseUnavailableError ||
      error instanceof RlusdTrustSetStoreError
    ) {
      return json(
        { error: { code: "PREPARATION_UNAVAILABLE", message: error.message } },
        503,
      );
    }
    return json(
      { error: { code: "PREPARATION_LOAD_FAILED", message: "The RLUSD preparation could not be loaded." } },
      500,
    );
  }
}

export function POST(request: Request) {
  return handleRlusdPreparationDetailsRequest(request);
}
