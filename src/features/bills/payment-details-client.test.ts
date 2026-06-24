import { describe, expect, it, vi } from "vitest";

import {
  PaymentDetailsRequestError,
  requestPaymentDetails,
} from "./payment-details-client";

const token = "a".repeat(64);
const details = {
  billTitle: "Dinner",
  participantLabel: "Alex",
  expectedPayerAddress: "rPayer",
  destinationAddress: "rDestination",
  destinationTag: null,
  amountDrops: "4000000",
  sourceTag: 123456,
  invoiceId: "B".repeat(64),
  network: "testnet",
};

function response(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("requestPaymentDetails", () => {
  it("returns a validated frozen payment snapshot", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(details, 200));

    await expect(
      requestPaymentDetails(token, fetcher as unknown as typeof fetch),
    ).resolves.toEqual(details);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/payments/details",
      expect.objectContaining({
        body: JSON.stringify({ paymentToken: token }),
        cache: "no-store",
      }),
    );
  });

  it("rejects malformed success bodies", async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ ok: true }, 200));
    await expect(
      requestPaymentDetails(token, fetcher as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(PaymentDetailsRequestError);
  });
});
