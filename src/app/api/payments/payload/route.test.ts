import { describe, expect, it, vi } from "vitest";

import { MainnetAcceptanceAuthorizationError } from "@/config/mainnet-acceptance-authorization";
import { PaymentOperationsHaltedError } from "@/config/payment-operations";
import {
  PaymentSlotNotFoundError,
  PaymentSlotStateError,
} from "@/features/bills/payment-slot";
import {
  PaymentReconciliationReviewRequiredError,
  PaymentReconciliationUnavailableError,
} from "@/features/bills/reconcile-replacement-payment";
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
  authorize: ReturnType<typeof vi.fn>;
  createPayload: ReturnType<typeof vi.fn>;
} {
  return {
    authorize: vi.fn().mockResolvedValue(undefined),
    createPayload: vi.fn().mockResolvedValue(payload),
  };
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

  it("rejects controlled Mainnet requests before reading the capability", async () => {
    const deps = dependencies();
    deps.authorize.mockRejectedValue(
      new MainnetAcceptanceAuthorizationError(),
    );

    const response = await handleCreateSlotPayloadRequest(request(), deps);

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Bearer");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "MAINNET_ACCEPTANCE_UNAUTHORIZED" },
    });
    expect(deps.createPayload).not.toHaveBeenCalled();
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

  it("returns a retryable operational halt without creating a handoff", async () => {
    const deps = dependencies();
    deps.createPayload.mockRejectedValue(
      new PaymentOperationsHaltedError("create", "verify-only"),
    );

    const response = await handleCreateSlotPayloadRequest(request(), deps);

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "PAYMENT_OPERATIONS_HALTED",
        operation: "create",
        mode: "verify-only",
      },
    });
  });

  it("returns review-required and retryable reconciliation outcomes", async () => {
    const reviewDeps = dependencies();
    reviewDeps.createPayload.mockRejectedValue(
      new PaymentReconciliationReviewRequiredError(2),
    );
    const reviewResponse = await handleCreateSlotPayloadRequest(
      request(),
      reviewDeps,
    );
    expect(reviewResponse.status).toBe(409);
    await expect(reviewResponse.json()).resolves.toMatchObject({
      error: {
        code: "PAYMENT_REQUIRES_REVIEW",
        matchCount: 2,
      },
    });

    const unavailableDeps = dependencies();
    unavailableDeps.createPayload.mockRejectedValue(
      new PaymentReconciliationUnavailableError(),
    );
    const unavailableResponse = await handleCreateSlotPayloadRequest(
      request(),
      unavailableDeps,
    );
    expect(unavailableResponse.status).toBe(503);
    expect(unavailableResponse.headers.get("retry-after")).toBe("30");
    await expect(unavailableResponse.json()).resolves.toMatchObject({
      error: { code: "PAYMENT_RECONCILIATION_UNAVAILABLE" },
    });
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
