import { describe, expect, it, vi } from "vitest";

import {
  PUBLIC_PROOF_FIXTURE,
  PUBLIC_PROOF_TOKEN,
} from "@/test/fixtures/public-proof";

import {
  PublicProofRequestError,
  requestPublicProof,
} from "./public-proof-client";

function response(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("requestPublicProof", () => {
  it("returns a validated proof response", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(response(PUBLIC_PROOF_FIXTURE, 200));

    await expect(
      requestPublicProof(PUBLIC_PROOF_TOKEN, fetcher as unknown as typeof fetch),
    ).resolves.toEqual(PUBLIC_PROOF_FIXTURE);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/proofs",
      expect.objectContaining({
        body: JSON.stringify({ proofToken: PUBLIC_PROOF_TOKEN }),
        cache: "no-store",
      }),
    );
  });

  it("rejects malformed success bodies and network failures", async () => {
    const malformed = vi.fn().mockResolvedValue(response({ ok: true }, 200));
    await expect(
      requestPublicProof(
        PUBLIC_PROOF_TOKEN,
        malformed as unknown as typeof fetch,
      ),
    ).rejects.toBeInstanceOf(PublicProofRequestError);

    const offline = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(
      requestPublicProof(PUBLIC_PROOF_TOKEN, offline as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(PublicProofRequestError);
  });
});
