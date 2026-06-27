import { describe, expect, it, vi } from "vitest";

import { requestXamanJson } from "./mainnet-xaman-attestation-http.mjs";

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Mainnet Xaman HTTP diagnostics", () => {
  it("surfaces a bounded provider error without leaking identifiers", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(
      json(
        {
          error: {
            code: "invalid_payload",
            message:
              "Invalid expiry for 11111111-1111-4111-8111-111111111111 at https://example.com/private",
          },
        },
        400,
      ),
    );

    await expect(
      requestXamanJson(
        fetcher,
        "https://xumm.app/api/v1/platform/payload",
        { method: "POST" },
        "Xaman SignIn creation",
      ),
    ).rejects.toThrow(
      "Xaman SignIn creation was rejected by Xaman with status 400 (invalid_payload: Invalid expiry for [redacted-id] at [redacted-url]).",
    );
  });

  it("keeps rejection output generic when Xaman returns no public detail", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ data: "ignored" }, 400));

    await expect(
      requestXamanJson(
        fetcher,
        "https://xumm.app/api/v1/platform/payload",
        { method: "POST" },
        "Xaman SignIn creation",
      ),
    ).rejects.toThrow(
      "Xaman SignIn creation was rejected by Xaman with status 400.",
    );
  });
});
