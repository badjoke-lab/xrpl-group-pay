import {
  publicTransactionProofSchema,
  type PublicTransactionProof,
} from "./types";

export class PublicProofRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicProofRequestError";
  }
}

export async function requestPublicProof(
  proofToken: string,
  fetcher: typeof fetch = fetch,
): Promise<PublicTransactionProof> {
  let response: Response;
  try {
    response = await fetcher("/api/proofs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proofToken }),
      cache: "no-store",
    });
  } catch {
    throw new PublicProofRequestError(
      "The transaction proof is temporarily unavailable.",
    );
  }

  const body: unknown = await response.json().catch(() => null);
  const parsed = publicTransactionProofSchema.safeParse(body);
  if (response.status === 200 && parsed.success) return parsed.data;

  const message =
    body && typeof body === "object"
      ? (body as { error?: { message?: unknown } }).error?.message
      : undefined;
  throw new PublicProofRequestError(
    typeof message === "string"
      ? message
      : "The transaction proof response was invalid.",
  );
}
