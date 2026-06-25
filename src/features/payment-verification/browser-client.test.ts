import { describe, expect, it, vi } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";

import {
  PaymentVerificationRequestError,
  requestPaymentVerification,
} from "./browser-client";

const PAYMENT_TOKEN = "a".repeat(64);
const PAYLOAD_ID = "123e4567-e89b-12d3-a456-426614174000";
const TXID = "A".repeat(64);
const INVOICE_ID = "B".repeat(64);

function response(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const xrpVerified = {
  status: "verified" as const,
  proof: {
    network: "testnet" as const,
    transactionId: TXID,
    ledgerIndex: 1,
    sender: "rSender",
    destination: "rDestination",
    amountDrops: "1",
    deliveredAmountDrops: "1",
    sourceTag: 1,
    destinationTag: null,
    invoiceId: INVOICE_ID,
    idempotencyKey: `testnet:${TXID}`,
    verifiedAt: "2026-06-23T00:00:00.000Z",
  },
  receipt: {
    receiptId: `testnet:${TXID}`,
    status: "created" as const,
    network: "testnet" as const,
    transactionId: TXID,
    invoiceId: INVOICE_ID,
    recordedAt: "2026-06-23T00:00:01.000Z",
    proofDigest: "C".repeat(64),
  },
};

function issuedVerified() {
  const asset = getRlusdAssetDescriptor("testnet");
  return {
    status: "verified" as const,
    payment: {
      contractVersion: "xrpl-group-pay:verified-payment:v1" as const,
      receiptContract: asset.receiptContract,
      network: "testnet" as const,
      transactionId: TXID,
      ledgerIndex: 1,
      sender: "rSender",
      destination: "rDestination",
      asset,
      requestedAmount: { code: "RLUSD", units: "1250000", scale: 6 },
      deliveredAmount: { code: "RLUSD", units: "1250000", scale: 6 },
      sourceTag: 1,
      destinationTag: null,
      invoiceId: INVOICE_ID,
      idempotencyKey: `testnet:${TXID}`,
      verifiedAt: "2026-06-25T00:00:00.000Z",
    },
    receipt: {
      receiptId: `testnet:${TXID}`,
      status: "recorded" as const,
      network: "testnet" as const,
      transactionId: TXID,
      invoiceId: INVOICE_ID,
      assetId: asset.id,
      recordedAt: "2026-06-25T00:00:01.000Z",
      verifiedPaymentDigest: "D".repeat(64),
      legacyProofDigest: null,
    },
  };
}

describe("requestPaymentVerification", () => {
  it.each([
    [xrpVerified, 200],
    [
      {
        status: "pending",
        reason: "TRANSACTION_NOT_FOUND",
        transactionId: TXID,
        message: "Pending",
      },
      202,
    ],
    [
      {
        status: "failed",
        reason: "AMOUNT_MISMATCH",
        transactionId: TXID,
        message: "Mismatch",
      },
      422,
    ],
  ])("accepts a complete XRP-compatible outcome with HTTP %s", async (outcome, status) => {
    const fetcher = vi.fn().mockResolvedValue(response(outcome, status));

    await expect(
      requestPaymentVerification(
        PAYMENT_TOKEN,
        PAYLOAD_ID,
        fetcher as unknown as typeof fetch,
      ),
    ).resolves.toEqual(outcome);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/payments/verify",
      expect.objectContaining({
        body: JSON.stringify({
          paymentToken: PAYMENT_TOKEN,
          payloadId: PAYLOAD_ID,
        }),
      }),
    );
  });

  it("accepts a canonical issued-asset verification result", async () => {
    const outcome = issuedVerified();
    const fetcher = vi.fn().mockResolvedValue(response(outcome, 200));

    await expect(
      requestPaymentVerification(
        PAYMENT_TOKEN,
        PAYLOAD_ID,
        fetcher as unknown as typeof fetch,
      ),
    ).resolves.toEqual(outcome);
  });

  it("keeps infrastructure failures retryable", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response(
        { error: { message: "XRPL Testnet is temporarily unavailable." } },
        502,
      ),
    );

    await expect(
      requestPaymentVerification(
        PAYMENT_TOKEN,
        PAYLOAD_ID,
        fetcher as unknown as typeof fetch,
      ),
    ).resolves.toEqual({
      status: "pending",
      reason: "VERIFICATION_UNAVAILABLE",
      transactionId: null,
      message: "XRPL Testnet is temporarily unavailable.",
    });

    const unreachable = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(
      requestPaymentVerification(
        PAYMENT_TOKEN,
        PAYLOAD_ID,
        unreachable as unknown as typeof fetch,
      ),
    ).resolves.toMatchObject({
      status: "pending",
      reason: "VERIFICATION_UNAVAILABLE",
    });
  });

  it.each([
    [{ unexpected: true }, 200],
    [{ status: "verified" }, 200],
    [
      {
        status: "verified",
        proof: xrpVerified.proof,
      },
      200,
    ],
    [
      {
        status: "pending",
        reason: "TRANSACTION_NOT_FOUND",
        transactionId: TXID,
        message: "Pending",
      },
      200,
    ],
    [
      (() => {
        const outcome = issuedVerified();
        return {
          ...outcome,
          receipt: { ...outcome.receipt, assetId: "wrong-asset" },
        };
      })(),
      200,
    ],
  ])("rejects malformed or status-inconsistent responses", async (body, status) => {
    const fetcher = vi.fn().mockResolvedValue(response(body, status));

    await expect(
      requestPaymentVerification(
        PAYMENT_TOKEN,
        PAYLOAD_ID,
        fetcher as unknown as typeof fetch,
      ),
    ).rejects.toBeInstanceOf(PaymentVerificationRequestError);
  });
});
