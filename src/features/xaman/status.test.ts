import { describe, expect, it } from "vitest";

import type { XamanPayloadResponse } from "./schemas";
import {
  normalizeXamanStatus,
  shouldRefreshFromXamanWebsocket,
} from "./status";

function payload(
  overrides: Partial<XamanPayloadResponse["meta"]> = {},
  txid: string | null = null,
): XamanPayloadResponse {
  return {
    meta: {
      resolved: false,
      signed: false,
      cancelled: false,
      expired: false,
      ...overrides,
    },
    response: { txid },
  };
}

describe("normalizeXamanStatus", () => {
  it("does not claim payment before a signed transaction ID exists", () => {
    expect(normalizeXamanStatus(payload())).toEqual({
      status: "waiting",
      txid: null,
    });
    expect(
      normalizeXamanStatus(payload({ resolved: true, signed: true })),
    ).toEqual({ status: "waiting", txid: null });
  });

  it("returns submitted, rejected, and expired states", () => {
    expect(
      normalizeXamanStatus(
        payload({ resolved: true, signed: true }, "ABC"),
      ),
    ).toEqual({ status: "submitted", txid: "ABC" });
    expect(
      normalizeXamanStatus(payload({ resolved: true, signed: false })),
    ).toEqual({ status: "rejected", txid: null });
    expect(normalizeXamanStatus(payload({ expired: true }))).toEqual({
      status: "expired",
      txid: null,
    });
  });

  it("keeps a late signed resolution submitted even when expired is true", () => {
    expect(
      normalizeXamanStatus(
        payload(
          { resolved: true, signed: true, expired: true },
          "LATE_TXID",
        ),
      ),
    ).toEqual({ status: "submitted", txid: "LATE_TXID" });
  });
});

describe("shouldRefreshFromXamanWebsocket", () => {
  it("refreshes only for terminal or resolved signals", () => {
    expect(
      shouldRefreshFromXamanWebsocket(
        JSON.stringify({ payload_uuidv4: "payload", signed: true }),
      ),
    ).toBe(true);
    expect(
      shouldRefreshFromXamanWebsocket(JSON.stringify({ expired: true })),
    ).toBe(true);
    expect(
      shouldRefreshFromXamanWebsocket(
        JSON.stringify({ expires_in_seconds: 54 }),
      ),
    ).toBe(false);
    expect(
      shouldRefreshFromXamanWebsocket(JSON.stringify({ opened: true })),
    ).toBe(false);
    expect(shouldRefreshFromXamanWebsocket("not-json")).toBe(false);
  });
});
