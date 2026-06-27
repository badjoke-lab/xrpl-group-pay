import { describe, expect, it, vi } from "vitest";

import {
  assertCancellationResult,
  assertSafeSignInStatus,
  requestXamanJson,
} from "./mainnet-xaman-attestation-http.mjs";

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function unresolved(response) {
  return {
    meta: {
      submit: false,
      resolved: false,
      signed: false,
      cancelled: false,
      expired: false,
    },
    payload: {
      tx_type: "SignIn",
      request_json: { TransactionType: "SignIn" },
    },
    response,
  };
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

describe("Mainnet Xaman SignIn status validation", () => {
  it("accepts null, false, and empty unresolved response placeholders", () => {
    expect(() =>
      assertSafeSignInStatus(
        unresolved({ txid: "", hex: false, account: null }),
        "initial",
      ),
    ).not.toThrow();
  });

  it("rejects actual ledger submission values", () => {
    expect(() =>
      assertSafeSignInStatus(
        unresolved({ txid: "A".repeat(64), hex: "", account: "" }),
        "initial",
      ),
    ).toThrow("Xaman initial status contains ledger submission data.");
  });

  it("accepts the authoritative cancellation result without relying on immediately refreshed metadata", () => {
    expect(() =>
      assertCancellationResult({
        result: { cancelled: true, reason: "OK" },
      }),
    ).not.toThrow();
    expect(() =>
      assertCancellationResult({
        result: { cancelled: true, reason: "ALREADY_CANCELLED" },
        meta: { signed: false, cancelled: false, expired: false },
      }),
    ).not.toThrow();
  });

  it("rejects a cancellation result that did not cancel the payload", () => {
    expect(() =>
      assertCancellationResult({
        result: { cancelled: false, reason: "ALREADY_OPENED" },
      }),
    ).toThrow("Xaman did not confirm payload cancellation.");
  });
});
