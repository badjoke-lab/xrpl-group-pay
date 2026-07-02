import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { getXrpAssetDescriptor } from "@/features/assets/registry";
import type { PaymentDetails } from "@/features/bills/payment-details";
import { readyPaymentReadiness } from "@/test/fixtures/payment-readiness";

import { TestnetPaymentForm } from "./testnet-payment-form";

class MockWebSocket {
  addEventListener() {}
  removeEventListener() {}
  close() {}
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("requires confirmation again after a rejected request", async () => {
  const payloadId = "123e4567-e89b-12d3-a456-426614174000";
  const asset = getXrpAssetDescriptor("testnet");
  const details: PaymentDetails = {
    billTitle: "Dinner",
    participantLabel: "Alex",
    expectedPayerAddress: "rPayer",
    destinationAddress: "rDestination",
    destinationTag: null,
    asset,
    amount: { code: "XRP", units: "4000000", scale: 6 },
    amountDrops: "4000000",
    sourceTag: 123456,
    invoiceId: "B".repeat(64),
    network: "testnet",
  };
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url === "/api/payments/details") return response(details);
    if (url === "/api/payments/readiness") {
      return response(readyPaymentReadiness(details));
    }
    if (url === "/api/payments/payload") {
      return response(
        {
          payloadId,
          status: "waiting",
          deepLink: "https://example.com/open",
          qrPng: "https://example.com/qr.png",
          websocketUrl: "wss://example.com/status",
          slot: {
            publicId: "00000000-0000-4000-8000-000000000001",
            billPublicId: "00000000-0000-4000-8000-000000000002",
            ...details,
          },
        },
        201,
      );
    }
    if (url === `/api/xaman/payloads/${payloadId}`) {
      return response({ payloadId, status: "rejected", txid: null });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("WebSocket", MockWebSocket);

  render(<TestnetPaymentForm paymentToken={"a".repeat(64)} />);
  await screen.findByRole("heading", { name: "Dinner" });
  fireEvent.click(screen.getByRole("button", { name: "Review final payment" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Create Xaman Sign Request" }),
  );
  await screen.findByRole("heading", { name: "Waiting for approval in Xaman" });
  fireEvent.click(screen.getByRole("button", { name: "Check status" }));
  await screen.findByRole("heading", { name: "Request rejected" });
  fireEvent.click(screen.getByRole("button", { name: "Review and try again" }));

  expect(
    screen.getByRole("heading", { name: "Confirm the exact Testnet payment" }),
  ).toBeVisible();
  expect(fetcher).toHaveBeenCalledWith(
    `/api/xaman/payloads/${payloadId}`,
    expect.objectContaining({ cache: "no-store" }),
  );
});
