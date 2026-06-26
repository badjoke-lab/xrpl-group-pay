import { describe, expect, it, vi } from "vitest";

import { inspectMainnetXamanApplication } from "./mainnet-xaman-attestation-ping.mjs";
import { readCallbackDetails } from "./mainnet-xaman-attestation-context.mjs";

function response(webhookurl, disabled = 0) {
  return new Response(
    JSON.stringify({
      pong: true,
      auth: {
        application: {
          uuidv4: "11111111-1111-4111-8111-111111111111",
          webhookurl,
          disabled,
        },
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("Mainnet Xaman callback configuration", () => {
  it("rejects a callback mismatch", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        response("https://other.example.com/api/xaman/callback"),
      );
    await expect(
      inspectMainnetXamanApplication({
        baseUrl: "https://xumm.app/api/v1/platform",
        callback: readCallbackDetails(
          "https://pay.example.com/api/xaman/callback",
        ),
        headers: {},
        fetcher,
      }),
    ).rejects.toThrow("does not match");
  });

  it("rejects a disabled application", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        response("https://pay.example.com/api/xaman/callback", 1),
      );
    await expect(
      inspectMainnetXamanApplication({
        baseUrl: "https://xumm.app/api/v1/platform",
        callback: readCallbackDetails(
          "https://pay.example.com/api/xaman/callback",
        ),
        headers: {},
        fetcher,
      }),
    ).rejects.toThrow("disabled");
  });
});
