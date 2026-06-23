import { describe, expect, it, vi } from "vitest";

import {
  PaymentReceiptConflictError,
  PaymentReceiptDatabaseError,
} from "@/features/persistence/verified-payment-receipts";
import type { PaymentVerificationOutcome } from "@/features/payment-verification/types";

import {
  handleVerificationRequest,
  POST,
  type VerificationRouteDependencies,
} from "./route";

const PAYLOAD_ID = "123e4567-e89b-12d3-a456-426614174000";
const TXID = "A".repeat(64);
const INVOICE_ID = "B".repeat(64);

const verifiedOutcome: PaymentVerificationOutcome = {
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
};

const receipt = {
  receiptId: `testnet:${TXID}`,
  status: "created" as const,
  network: "testnet" as const,
  transactionId: TXID,
  invoiceId: INVOICE_ID,
  recordedAt: "2026-06-23T01:02:04.000Z",
  proofDigest: "C".repeat(64),
};

function validRequest() {
  return new Request("http://localhost/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payloadId: PAYLOAD_ID }),
  });
}

function dependencies(
  outcome: PaymentVerificationOutcome,
): VerificationRouteDependencies & {
  verifyPayment: ReturnType<typeof vi.fn>;
  recordPayment: ReturnType<typeof vi.fn>;
} {
  return {
    verifyPayment: vi.fn().mockResolvedValue(outcome),
    recordPayment: vi.fn().mockResolvedValue(receipt),
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

  it("rejects malformed and invalid payload identifiers", async () => {
    const malformed = await POST(
      new Request("http://localhost/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );
    expect(malformed.status).toBe(400);

    const invalidId = await POST(
      new Request("http://localhost/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payloadId: "not-a-uuid" }),
      }),
    );
    expect(invalidId.status).toBe(400);
  });

  it("rejects oversized verification bodies and declared lengths", async () => {
    const oversizedBody = await POST(
      new Request("http://localhost/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payloadId: "x".repeat(600) }),
      }),
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

  it("returns verified only after the durable receipt is stored", async () => {
    const deps = dependencies(verifiedOutcome);
    const response = await handleVerificationRequest(validRequest(), deps);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ...verifiedOutcome,
      receipt,
    });
    expect(deps.verifyPayment).toHaveBeenCalledWith(PAYLOAD_ID);
    expect(deps.recordPayment).toHaveBeenCalledWith(verifiedOutcome.proof);
  });

  it.each([
    {
      outcome: {
        status: "pending",
        reason: "TRANSACTION_NOT_VALIDATED",
        transactionId: TXID,
        message: "Pending",
      } satisfies PaymentVerificationOutcome,
      status: 202,
    },
    {
      outcome: {
        status: "failed",
        reason: "AMOUNT_MISMATCH",
        transactionId: TXID,
        message: "Mismatch",
      } satisfies PaymentVerificationOutcome,
      status: 422,
    },
  ])("does not store a $outcome.status outcome", async ({ outcome, status }) => {
    const deps = dependencies(outcome);
    const response = await handleVerificationRequest(validRequest(), deps);

    expect(response.status).toBe(status);
    expect(deps.recordPayment).not.toHaveBeenCalled();
  });

  it("keeps receipt storage failures retryable", async () => {
    const deps = dependencies(verifiedOutcome);
    deps.recordPayment.mockRejectedValue(new PaymentReceiptDatabaseError());

    const response = await handleVerificationRequest(validRequest(), deps);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "RECEIPT_STORAGE_UNAVAILABLE" },
    });
  });

  it("reports durable transaction or InvoiceID conflicts", async () => {
    const deps = dependencies(verifiedOutcome);
    deps.recordPayment.mockRejectedValue(
      new PaymentReceiptConflictError(
        "INVOICE_ALREADY_RECORDED",
        "Invoice already recorded.",
      ),
    );

    const response = await handleVerificationRequest(validRequest(), deps);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INVOICE_ALREADY_RECORDED",
        message: "Invoice already recorded.",
      },
    });
  });
});
