import { z } from "zod";

import {
  loadPublicProofByToken,
  PublicProofDatabaseError,
  PublicProofNotFoundError,
} from "@/features/proofs/load-public-proof";
import type { PublicTransactionProof } from "@/features/proofs/types";
import {
  getPaymentsDatabase,
  PaymentsDatabaseUnavailableError,
} from "@/features/persistence/cloudflare-d1";

export const dynamic = "force-dynamic";

const MAX_PROOF_REQUEST_BYTES = 512;
const requestSchema = z
  .object({ proofToken: z.string().regex(/^[A-F0-9]{64}$/i) })
  .strict();

export type PublicProofRouteDependencies = {
  loadProof(proofToken: string): Promise<PublicTransactionProof>;
};

const defaultDependencies: PublicProofRouteDependencies = {
  async loadProof(proofToken) {
    const database = await getPaymentsDatabase();
    return loadPublicProofByToken(database, proofToken);
  },
};

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function notFound() {
  return json(
    {
      error: {
        code: "PUBLIC_PROOF_NOT_FOUND",
        message: "The transaction proof is invalid or unavailable.",
      },
    },
    404,
  );
}

function tooLarge() {
  return json(
    {
      error: {
        code: "PUBLIC_PROOF_REQUEST_TOO_LARGE",
        message: "The transaction proof request is too large.",
      },
    },
    413,
  );
}

export async function handlePublicProofRequest(
  request: Request,
  dependencies: PublicProofRouteDependencies = defaultDependencies,
) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Send the transaction proof request as JSON.",
        },
      },
      415,
    );
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_PROOF_REQUEST_BYTES
  ) {
    return tooLarge();
  }

  let proofToken: string;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_PROOF_REQUEST_BYTES) {
      return tooLarge();
    }
    proofToken = requestSchema.parse(JSON.parse(raw) as unknown).proofToken;
  } catch {
    return notFound();
  }

  try {
    return json(await dependencies.loadProof(proofToken), 200);
  } catch (error) {
    if (error instanceof PublicProofNotFoundError) return notFound();
    if (
      error instanceof PublicProofDatabaseError ||
      error instanceof PaymentsDatabaseUnavailableError
    ) {
      return json(
        {
          error: {
            code: "PUBLIC_PROOF_UNAVAILABLE",
            message: error.message,
          },
        },
        503,
      );
    }
    return json(
      {
        error: {
          code: "PUBLIC_PROOF_FAILED",
          message: "The transaction proof could not be loaded.",
        },
      },
      500,
    );
  }
}

export function POST(request: Request) {
  return handlePublicProofRequest(request);
}
