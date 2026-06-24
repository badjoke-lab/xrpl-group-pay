import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("requires confirmation again after a rejected request", async () => {
  const payloadId = "123e4567-e89b-12d3-a456-426614174000";
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
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response(details))
    .mockResolvedValueOnce(
      response(
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
      ),
    )
    .mockResolvedValueOnce(
      response({ payloadId, status: "rejected", txid: null }),
    );
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
  expect(fetcher).toHaveBeenCalledTimes(3);
});
