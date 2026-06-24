import { describe, expect, it, vi } from "vitest";

import {
  PaymentSlotNotFoundError,
  PaymentSlotStateError,
} from "@/features/bills/payment-slot";
import type { PaymentDetails } from "@/features/bills/payment-details";

import {
  handlePaymentDetailsRequest,
  type PaymentDetailsRouteDependencies,
} from "./route";

const token = "a".repeat(64);
const details: PaymentDetails = {
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

function request(body: unknown = { paymentToken: token }) {
  return new Request("http://localhost/api/payments/details", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dependencies(): PaymentDetailsRouteDependencies & {
  loadDetails: ReturnType<typeof vi.fn>;
} {
  return { loadDetails: vi.fn().mockResolvedValue(details) };
}

describe("POST /api/payments/details", () => {
  it("returns no-store frozen details without creating a payload", async () => {
    const deps = dependencies();
    const response = await handlePaymentDetailsRequest(request(), deps);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual(details);
    expect(deps.loadDetails).toHaveBeenCalledWith(token);
  });

  it("uses uniform not-found behavior for malformed and unknown capabilities", async () => {
    const deps = dependencies();
    expect(
      (await handlePaymentDetailsRequest(request({ paymentToken: "bad" }), deps))
        .status,
    ).toBe(404);

    deps.loadDetails.mockRejectedValue(new PaymentSlotNotFoundError());
    expect((await handlePaymentDetailsRequest(request(), deps)).status).toBe(404);
  });

  it("returns state conflicts without exposing payment details", async () => {
    const deps = dependencies();
    deps.loadDetails.mockRejectedValue(
      new PaymentSlotStateError("SLOT_ALREADY_PAID", "This payment slot is already paid."),
    );
    const response = await handlePaymentDetailsRequest(request(), deps);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "SLOT_ALREADY_PAID",
        message: "This payment slot is already paid.",
      },
    });
  });

  it("rejects oversized requests before loading details", async () => {
    const deps = dependencies();
    const response = await handlePaymentDetailsRequest(
      new Request("http://localhost/api/payments/details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "257",
        },
        body: "{}",
      }),
      deps,
    );

    expect(response.status).toBe(413);
    expect(deps.loadDetails).not.toHaveBeenCalled();
  });
});
