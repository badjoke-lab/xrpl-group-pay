import { describe, expect, it, vi } from "vitest";

import type { XamanEnvironment } from "@/config/server-env";

import { XamanClient } from "./client";
import type { XamanPaymentPayloadRequest } from "./payment-request";

const environment: XamanEnvironment = {
  XAMAN_API_KEY: "key",
  XAMAN_API_SECRET: "secret",
  XAMAN_API_BASE_URL: "https://xumm.app/api/v1/platform",
  XRPL_SOURCE_TAG: 7,
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  APP_NETWORK: "testnet",
};

const request: XamanPaymentPayloadRequest = {
  txjson: {
    TransactionType: "Payment",
    Destination: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    Amount: "1000000",
    SourceTag: 7,
    InvoiceID: "AA".repeat(32),
  },
  options: { submit: true, expire: 5, force_network: "TESTNET" },
};

describe("XamanClient", () => {
  it("keeps credentials in request headers and sends the transaction template", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          next: { always: "https://xumm.app/sign/1" },
          refs: {
            qr_png: "https://xumm.app/sign/1_q.png",
            websocket_status: "wss://xumm.app/sign/1",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await new XamanClient(environment, fetcher as typeof fetch).createPayload(request);

    const [, init] = fetcher.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-API-Key")).toBe("key");
    expect(headers.get("X-API-Secret")).toBe("secret");
    expect(JSON.parse(init.body as string)).toEqual(request);
    expect(JSON.stringify(request)).not.toContain("secret");
  });
});
