import { describe, expect, it, vi } from "vitest";

import {
  PaymentVerificationRequestError,
  requestPaymentVerification,
} from "./browser-client";

function response(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("requestPaymentVerification", () => {
  it.each([200, 202, 422])(
    "accepts a typed verification outcome with HTTP %s",
    async (status) => {
      const outcome =
        status === 200
          ? {
              status: "verified",
              proof: {
                network: "testnet",
                transactionId: "A".repeat(64),
                ledgerIndex: 1,
                sender: "rSender",
                destination: "rDestination",
                amountDrops: "1",
                deliveredAmountDrops: "1",
                sourceTag: 1,
                destinationTag: null,
                invoiceId: "B".repeat(64),
                idempotencyKey: `testnet:${"A".repeat(64)}`,
                verifiedAt: "2026-06-23T00:00:00.000Z",
              },
            }
          : status === 202
            ? {
                status: "pending",
                reason: "TRANSACTION_NOT_FOUND",
                transactionId: "A".repeat(64),
                message: "Pending",
              }
            : {
                status: "failed",
                reason: "AMOUNT_MISMATCH",
                transactionId: "A".repeat(64),
                message: "Mismatch",
              };
      const fetcher = vi.fn().mockResolvedValue(response(outcome, status));

      await expect(
        requestPaymentVerification(
          "123e4567-e89b-12d3-a456-426614174000",
          fetcher as unknown as typeof fetch,
        ),
      ).resolves.toEqual(outcome);
    },
  );

  it("rejects malformed and infrastructure error responses", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response(
        { error: { message: "XRPL Testnet is temporarily unavailable." } },
        502,
      ),
    );

    await expect(
      requestPaymentVerification(
        "123e4567-e89b-12d3-a456-426614174000",
        fetcher as unknown as typeof fetch,
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PaymentVerificationRequestError>>({
        name: "PaymentVerificationRequestError",
        message: "XRPL Testnet is temporarily unavailable.",
      }),
    );
  });
});
