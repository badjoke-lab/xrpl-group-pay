import { describe, expect, it } from "vitest";

import {
  makeXamanPayload,
  makeXrplTransaction,
  TEST_SOURCE_TAG,
} from "./test-helpers";
import { verifyXamanPayment } from "./service";
import { XrplTransactionPendingError } from "@/features/xrpl/client";

describe("verifyXamanPayment", () => {
  it("verifies using only server-fetched Xaman and XRPL data", async () => {
    const outcome = await verifyXamanPayment("payload-id", {
      getXamanPayload: async () => makeXamanPayload(),
      getXrplTransaction: async () => makeXrplTransaction(),
      sourceTag: TEST_SOURCE_TAG,
      now: () => new Date("2026-06-23T01:02:03.000Z"),
    });

    expect(outcome).toMatchObject({
      status: "verified",
      proof: { network: "testnet", verifiedAt: "2026-06-23T01:02:03.000Z" },
    });
  });

  it("keeps unresolved Xaman payloads pending without querying XRPL", async () => {
    const payload = makeXamanPayload();
    payload.meta.resolved = false;
    payload.meta.signed = false;
    payload.response.txid = null;
    let xrplCalled = false;

    const outcome = await verifyXamanPayment("payload-id", {
      getXamanPayload: async () => payload,
      getXrplTransaction: async () => {
        xrplCalled = true;
        return makeXrplTransaction();
      },
      sourceTag: TEST_SOURCE_TAG,
    });

    expect(outcome).toMatchObject({
      status: "pending",
      reason: "XAMAN_NOT_RESOLVED",
    });
    expect(xrplCalled).toBe(false);
  });

  it("returns pending when the transaction has not reached a queried ledger", async () => {
    const outcome = await verifyXamanPayment("payload-id", {
      getXamanPayload: async () => makeXamanPayload(),
      getXrplTransaction: async () => {
        throw new XrplTransactionPendingError();
      },
      sourceTag: TEST_SOURCE_TAG,
    });

    expect(outcome).toMatchObject({
      status: "pending",
      reason: "TRANSACTION_NOT_FOUND",
    });
  });

  it("fails before XRPL lookup when the Xaman template is not ours", async () => {
    const payload = makeXamanPayload();
    payload.payload!.request_json.SourceTag = TEST_SOURCE_TAG + 1;

    const outcome = await verifyXamanPayment("payload-id", {
      getXamanPayload: async () => payload,
      getXrplTransaction: async () => makeXrplTransaction(),
      sourceTag: TEST_SOURCE_TAG,
    });

    expect(outcome).toMatchObject({
      status: "failed",
      reason: "INVALID_XAMAN_TEMPLATE",
    });
  });
});
