import { describe, expect, it, vi } from "vitest";

import {
  PaymentSlotNotFoundError,
  PaymentSlotStateError,
} from "@/features/bills/payment-slot";
import { XamanApiError } from "@/features/xaman/client";

import {
  handleCreateSlotPayloadRequest,
  type SlotPayloadRouteDependencies,
} from "./route";

const paymentToken = "a".repeat(64);
const payload = {
  payloadId: "00000000-0000-4000-8000-000000000001",
  status: "waiting",
  deepLink: "xaman://payload",
  qrPng: "https://example.test/qr.png",
  websocketUrl: "wss://example.test/socket",
  slot: {
    publicId: "00000000-0000-4000-8000-000000000002",
    billPublicId: "00000000-0000-4000-8000-000000000003",
    billTitle: "Dinner",
    participantLabel: "Alex",
    expectedPayerAddress: "rPayer",
    destinationAddress: "rDestination",
    destinationTag: null,
    amountDrops: "1000000",
    invoiceId: "B".repeat(64),
    network: "testnet",
  },
};

function request(body: unknown = { paymentToken }) {
  return new Request("http://localhost/api/payments/payload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dependencies(): SlotPayloadRouteDependencies & {
  createPayload: ReturnType<typeof vi.fn>;
} {
  return { createPayload: vi.fn().mockResolvedValue(payload) };
}

describe("POST /api/payments/payload", () => {
  it("accepts only the payment capability and returns a slot-bound payload", async () => {
    const deps = dependencies();
    const response = await handleCreateSlotPayloadRequest(request(), deps);

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual(payload);
    expect(deps.createPayload).toHaveBeenCalledWith(paymentToken);
  });

  it("uses a uniform not-found response for malformed capabilities", async () => {
    const deps = dependencies();
    const response = await handleCreateSlotPayloadRequest(
      request({ paymentToken: "invalid" }),
      deps,
    );

    expect(response.status).toBe(404);
    expect(deps.createPayload).not.toHaveBeenCalled();
  });

  it("maps unavailable slots, state conflicts, and Xaman failures", async () => {
    const missingDeps = dependencies();
    missingDeps.createPayload.mockRejectedValue(new PaymentSlotNotFoundError());
    expect(
      (await handleCreateSlotPayloadRequest(request(), missingDeps)).status,
    ).toBe(404);

    const stateDeps = dependencies();
    stateDeps.createPayload.mockRejectedValue(
      new PaymentSlotStateError("SLOT_ALREADY_PAID", "Already paid."),
    );
    expect(
      (await handleCreateSlotPayloadRequest(request(), stateDeps)).status,
    ).toBe(409);

    const xamanDeps = dependencies();
    xamanDeps.createPayload.mockRejectedValue(
      new XamanApiError("Xaman unavailable.", 503),
    );
    expect(
      (await handleCreateSlotPayloadRequest(request(), xamanDeps)).status,
    ).toBe(502);
  });
});
