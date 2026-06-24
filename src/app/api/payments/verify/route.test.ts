import { describe, expect, it, vi } from "vitest";

import { PaymentSlotNotFoundError } from "@/features/bills/payment-slot";
import {
  PaymentSlotSettlementConflictError,
  PaymentSlotSettlementDatabaseError,
} from "@/features/bills/settle-slot";
import type { PaymentVerificationApiOutcome } from "@/features/payment-verification/types";

import {
  handleVerificationRequest,
  POST,
  type VerificationRouteDependencies,
} from "./route";

const PAYMENT_TOKEN = "a".repeat(64);
const PAYLOAD_ID = "123e4567-e89b-12d3-a456-426614174000";
const TXID = "A".repeat(64);
const INVOICE_ID = "B".repeat(64);

const verifiedOutcome: PaymentVerificationApiOutcome = {
  status: "verified",
  proof: {
    network: "testnet",
    transactionId: TXID,
    ledgerIndex: 12345,
    sender: "rSender",
    destination: "rDestination",
    amountDrops: "4000000",
    deliveredAmountDrops: "4000000",
    sourceTag: 123456,
    destinationTag: null,
    invoiceId: INVOICE_ID,
    idempotencyKey: `testnet:${TXID}`,
    verifiedAt: "2026-06-23T01:02:03.000Z",
  },
  receipt: {
    receiptId: `testnet:${TXID}`,
    status: "created",
    network: "testnet",
    transactionId: TXID,
    invoiceId: INVOICE_ID,
    recordedAt: "2026-06-23T01:02:04.000Z",
    proofDigest: "C".repeat(64),
  },
};

function request(
  body: unknown = { paymentToken: PAYMENT_TOKEN, payloadId: PAYLOAD_ID },
) {
  return new Request("http://localhost/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dependencies(
  outcome: PaymentVerificationApiOutcome,
): VerificationRouteDependencies & {
  verifyAndRecord: ReturnType<typeof vi.fn>;
} {
  return {
    verifyAndRecord: vi.fn().mockResolvedValue(outcome),
  };
}

describe("POST /api/payments/verify", () => {
  it("rejects non-JSON requests without touching external services", async () => {
    const response = await POST(
      new Request("http://localhost/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "payload",
      }),
    );

    expect(response.status).toBe(415);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("uses a uniform not-found response for malformed capabilities", async () => {
    const deps = dependencies(verifiedOutcome);
    const response = await handleVerificationRequest(
      request({ paymentToken: "invalid", payloadId: PAYLOAD_ID }),
      deps,
    );

    expect(response.status).toBe(404);
    expect(deps.verifyAndRecord).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and invalid payload identifiers", async () => {
    const malformed = await POST(
      new Request("http://localhost/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );
    expect(malformed.status).toBe(400);

    const invalidId = await POST(
      request({ paymentToken: PAYMENT_TOKEN, payloadId: "not-a-uuid" }),
    );
    expect(invalidId.status).toBe(400);
  });

  it("rejects oversized verification bodies and declared lengths", async () => {
    const oversizedBody = await POST(
      request({ paymentToken: PAYMENT_TOKEN, payloadId: "x".repeat(600) }),
    );
    expect(oversizedBody.status).toBe(413);

    const oversizedDeclaredLength = await POST(
      new Request("http://localhost/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "513",
        },
        body: "{}",
      }),
    );
    expect(oversizedDeclaredLength.status).toBe(413);
  });

  it("returns verified only after slot settlement is durable", async () => {
    const deps = dependencies(verifiedOutcome);
    const response = await handleVerificationRequest(request(), deps);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(verifiedOutcome);
    expect(deps.verifyAndRecord).toHaveBeenCalledWith(
      PAYMENT_TOKEN,
      PAYLOAD_ID,
    );
  });

  it.each([
    {
      outcome: {
        status: "pending",
        reason: "TRANSACTION_NOT_VALIDATED",
        transactionId: TXID,
        message: "Pending",
      } satisfies PaymentVerificationApiOutcome,
      status: 202,
    },
    {
      outcome: {
        status: "failed",
        reason: "AMOUNT_MISMATCH",
        transactionId: TXID,
        message: "Mismatch",
      } satisfies PaymentVerificationApiOutcome,
      status: 422,
    },
  ])("returns a $outcome.status outcome without settlement", async ({ outcome, status }) => {
    const deps = dependencies(outcome);
    const response = await handleVerificationRequest(request(), deps);

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual(outcome);
  });

  it("keeps settlement storage failures retryable", async () => {
    const deps = dependencies(verifiedOutcome);
    deps.verifyAndRecord.mockRejectedValue(
      new PaymentSlotSettlementDatabaseError(),
    );

    const response = await handleVerificationRequest(request(), deps);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "SLOT_SETTLEMENT_UNAVAILABLE" },
    });
  });

  it("reports a conflicting second transaction", async () => {
    const deps = dependencies(verifiedOutcome);
    deps.verifyAndRecord.mockRejectedValue(
      new PaymentSlotSettlementConflictError(
        "SLOT_ALREADY_PAID",
        "This slot already accepted another transaction.",
      ),
    );

    const response = await handleVerificationRequest(request(), deps);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "SLOT_ALREADY_PAID",
        message: "This slot already accepted another transaction.",
      },
    });
  });

  it("does not reveal whether an unknown capability was well formed", async () => {
    const deps = dependencies(verifiedOutcome);
    deps.verifyAndRecord.mockRejectedValue(new PaymentSlotNotFoundError());

    const response = await handleVerificationRequest(request(), deps);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "PAYMENT_SLOT_NOT_FOUND" },
    });
  });
});
