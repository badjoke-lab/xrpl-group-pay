import { describe, expect, it } from "vitest";

import {
  createXamanWebhookSignature,
  XAMAN_WEBHOOK_SIGNATURE_HEADER,
  XAMAN_WEBHOOK_TIMESTAMP_HEADER,
} from "@/features/xaman/webhook";

import {
  handleXamanCallbackRequest,
  type XamanCallbackRouteDependencies,
} from "./route";

const secret = "11111111-2222-3333-4444-555555555555";
const timestamp = "1782552000";
const applicationId = "11111111-1111-4111-8111-111111111111";
const payloadId = "22222222-2222-4222-8222-222222222222";

function notification(overrides: Record<string, unknown> = {}) {
  return {
    meta: {
      url: "https://xgp.badjoke-lab.com/api/xaman/callback",
      application_uuidv4: applicationId,
      payload_uuidv4: payloadId,
      opened_by_deeplink: true,
    },
    custom_meta: {
      identifier: "slot-reference",
      blob: {},
      instruction: "Pay the requested share",
    },
    payloadResponse: {
      payload_uuidv4: payloadId,
      reference_call_uuidv4: "33333333-3333-4333-8333-333333333333",
      signed: true,
      txid: "A".repeat(64),
    },
    userToken: {
      user_token: "44444444-4444-4444-8444-444444444444",
    },
    ...overrides,
  };
}

function signedRequest(payload: unknown, signatureOverride?: string) {
  const signature =
    signatureOverride ??
    createXamanWebhookSignature(secret, timestamp, payload);
  return new Request("https://xgp.badjoke-lab.com/api/xaman/callback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [XAMAN_WEBHOOK_TIMESTAMP_HEADER]: timestamp,
      [XAMAN_WEBHOOK_SIGNATURE_HEADER]: signature,
    },
    body: JSON.stringify(payload),
  });
}

function dependencies(
  accepted: unknown[],
): XamanCallbackRouteDependencies {
  return {
    readSecret: () => secret,
    accept(value) {
      accepted.push(value);
    },
  };
}

describe("Xaman callback route", () => {
  it("accepts an authenticated callback without treating it as payment proof", async () => {
    const accepted: unknown[] = [];
    const response = await handleXamanCallbackRequest(
      signedRequest(notification()),
      dependencies(accepted),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ received: true });
    expect(accepted).toHaveLength(1);

    const publicResponse = JSON.stringify(await response.clone().json().catch(() => ({})));
    expect(publicResponse).not.toContain("user_token");
    expect(publicResponse).not.toContain("txid");
    expect(publicResponse).not.toContain(secret);
  });

  it("rejects a callback with an invalid signature before processing", async () => {
    const accepted: unknown[] = [];
    const response = await handleXamanCallbackRequest(
      signedRequest(notification(), "0".repeat(40)),
      dependencies(accepted),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_XAMAN_SIGNATURE" },
    });
    expect(accepted).toHaveLength(0);
  });

  it("rejects mismatched payload identifiers", async () => {
    const accepted: unknown[] = [];
    const payload = notification({
      payloadResponse: {
        payload_uuidv4: "55555555-5555-4555-8555-555555555555",
        signed: false,
      },
    });
    const response = await handleXamanCallbackRequest(
      signedRequest(payload),
      dependencies(accepted),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_XAMAN_WEBHOOK" },
    });
    expect(accepted).toHaveLength(0);
  });

  it("rejects non-JSON and oversized callbacks", async () => {
    const accepted: unknown[] = [];
    const unsupported = await handleXamanCallbackRequest(
      new Request("https://xgp.badjoke-lab.com/api/xaman/callback", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "callback",
      }),
      dependencies(accepted),
    );
    expect(unsupported.status).toBe(415);

    const oversized = await handleXamanCallbackRequest(
      new Request("https://xgp.badjoke-lab.com/api/xaman/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(64 * 1024 + 1),
        },
        body: JSON.stringify(notification()),
      }),
      dependencies(accepted),
    );
    expect(oversized.status).toBe(413);
    expect(accepted).toHaveLength(0);
  });
});
