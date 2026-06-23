import { describe, expect, it } from "vitest";

import { normalizeXamanStatus } from "./status";
import type { XamanPayloadResponse } from "./schemas";

function payload(overrides: Partial<XamanPayloadResponse["meta"]> = {}, txid: string | null = null): XamanPayloadResponse {
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
    expect(normalizeXamanStatus(payload())).toEqual({ status: "waiting", txid: null });
    expect(normalizeXamanStatus(payload({ resolved: true, signed: true }))).toEqual({ status: "waiting", txid: null });
  });

  it("returns submitted, rejected, and expired states", () => {
    expect(normalizeXamanStatus(payload({ resolved: true, signed: true }, "ABC"))).toEqual({ status: "submitted", txid: "ABC" });
    expect(normalizeXamanStatus(payload({ resolved: true, signed: false }))).toEqual({ status: "rejected", txid: null });
    expect(normalizeXamanStatus(payload({ expired: true }))).toEqual({ status: "expired", txid: null });
  });
});
