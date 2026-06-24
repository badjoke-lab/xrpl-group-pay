import { describe, expect, it, vi } from "vitest";

import {
  PublicProofDatabaseError,
  PublicProofNotFoundError,
} from "@/features/proofs/load-public-proof";
import {
  PUBLIC_PROOF_FIXTURE,
  PUBLIC_PROOF_TOKEN,
} from "@/test/fixtures/public-proof";

import { handlePublicProofRequest } from "./route";

function request(body: unknown = { proofToken: PUBLIC_PROOF_TOKEN }) {
  return new Request("http://localhost/api/proofs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/proofs", () => {
  it("returns a no-store public proof", async () => {
    const loadProof = vi.fn().mockResolvedValue(PUBLIC_PROOF_FIXTURE);
    const response = await handlePublicProofRequest(request(), { loadProof });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual(PUBLIC_PROOF_FIXTURE);
    expect(loadProof).toHaveBeenCalledWith(PUBLIC_PROOF_TOKEN);
  });

  it("uses one not-found response for malformed and unknown identifiers", async () => {
    const malformed = await handlePublicProofRequest(
      request({ proofToken: "bad" }),
      { loadProof: vi.fn() },
    );
    const loadProof = vi.fn().mockRejectedValue(new PublicProofNotFoundError());
    const unknown = await handlePublicProofRequest(request(), { loadProof });

    expect(malformed.status).toBe(404);
    expect(unknown.status).toBe(404);
    await expect(malformed.json()).resolves.toEqual(
      await unknown.clone().json(),
    );
  });

  it("keeps storage failures retryable", async () => {
    const loadProof = vi.fn().mockRejectedValue(new PublicProofDatabaseError());
    const response = await handlePublicProofRequest(request(), { loadProof });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "PUBLIC_PROOF_UNAVAILABLE" },
    });
  });
});
