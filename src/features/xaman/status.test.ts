import { describe, expect, it } from "vitest";

import type { XamanPayloadResponse } from "./schemas";
import {
  normalizeXamanLifecycle,
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

describe("normalizeXamanLifecycle", () => {
  it("distinguishes available, opened, and signed states", () => {
    expect(normalizeXamanLifecycle(payload())).toEqual({
      status: "available",
      transactionId: null,
    });
    expect(
      normalizeXamanLifecycle(payload({ opened_by_deeplink: true })),
    ).toEqual({ status: "opened", transactionId: null });
    expect(normalizeXamanLifecycle(payload({ signed: true }))).toEqual({
      status: "signed",
      transactionId: null,
    });
  });

  it("uses submitted transaction identity over nominal expiry", () => {
    const txid = "A".repeat(64);
    expect(
      normalizeXamanLifecycle(
        payload(
          { resolved: true, signed: true, expired: true },
          txid.toLowerCase(),
        ),
      ),
    ).toEqual({ status: "submitted", transactionId: txid });
  });

  it("normalizes rejection and expiry as terminal handoff states", () => {
    expect(
      normalizeXamanLifecycle(payload({ resolved: true, signed: false })),
    ).toEqual({ status: "rejected", transactionId: null });
    expect(normalizeXamanLifecycle(payload({ expired: true }))).toEqual({
      status: "expired",
      transactionId: null,
    });
  });
});

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

  it("returns submitted, rejected, and expired public states", () => {
    const txid = "B".repeat(64);
    expect(
      normalizeXamanStatus(
        payload({ resolved: true, signed: true }, txid),
      ),
    ).toEqual({ status: "submitted", txid });
    expect(
      normalizeXamanStatus(payload({ resolved: true, signed: false })),
    ).toEqual({ status: "rejected", txid: null });
    expect(normalizeXamanStatus(payload({ expired: true }))).toEqual({
      status: "expired",
      txid: null,
    });
  });
});

describe("shouldRefreshFromXamanWebsocket", () => {
  it("refreshes for opened, terminal, and resolution signals", () => {
    expect(
      shouldRefreshFromXamanWebsocket(
        JSON.stringify({ payload_uuidv4: "payload", signed: true }),
      ),
    ).toBe(true);
    expect(
      shouldRefreshFromXamanWebsocket(JSON.stringify({ expired: true })),
    ).toBe(true);
    expect(
      shouldRefreshFromXamanWebsocket(JSON.stringify({ opened: true })),
    ).toBe(true);
    expect(
      shouldRefreshFromXamanWebsocket(
        JSON.stringify({ expires_in_seconds: 54 }),
      ),
    ).toBe(false);
    expect(shouldRefreshFromXamanWebsocket("not-json")).toBe(false);
  });
});
