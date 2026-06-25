import { describe, expect, it } from "vitest";

import {
  makeXamanPayload,
  TEST_TXID,
} from "@/features/payment-verification/test-helpers";

import { XamanStatusReader } from "./status-reader";

describe("XamanStatusReader", () => {
  it("normalizes a submitted Xaman payload", async () => {
    const reader = new XamanStatusReader({
      getPayload: async () => makeXamanPayload(),
    });

    await expect(reader.readStatus("request-id")).resolves.toEqual({
      providerId: "xaman",
      requestId: "request-id",
      status: "submitted",
      transactionId: TEST_TXID,
    });
  });
});
