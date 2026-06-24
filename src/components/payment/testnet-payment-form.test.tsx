import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TestnetPaymentForm } from "./testnet-payment-form";

const PAYMENT_TOKEN = "a".repeat(64);
const PAYLOAD_ID = "123e4567-e89b-12d3-a456-426614174000";
const TXID = "A".repeat(64);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

class MockWebSocket {
  addEventListener() {}
  removeEventListener() {}
  close() {}
}

const createdPayload = {
  payloadId: PAYLOAD_ID,
  status: "waiting",
  deepLink: `https://xumm.app/sign/${PAYLOAD_ID}`,
  qrPng: `https://xumm.app/sign/${PAYLOAD_ID}_q.png`,
  websocketUrl: `wss://xumm.app/sign/${PAYLOAD_ID}`,
  slot: {
    publicId: "00000000-0000-4000-8000-000000000001",
    billPublicId: "00000000-0000-4000-8000-000000000002",
    billTitle: "XRPL Meetup Dinner",
    participantLabel: "Alex",
    expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
    destinationTag: null,
    amountDrops: "4000000",
    invoiceId: "B".repeat(64),
    network: "testnet",
  },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TestnetPaymentForm", () => {
  it("rejects an invalid participant link", () => {
    render(<TestnetPaymentForm paymentToken="invalid" />);
    expect(screen.getByRole("heading", { name: "Payment link unavailable" })).toBeVisible();
  });

  it("keeps stored recipient and amount read-only", () => {
    render(<TestnetPaymentForm paymentToken={PAYMENT_TOKEN} />);
    expect(screen.getByRole("heading", { name: "Review your assigned XRP share" })).toBeVisible();
    expect(screen.queryByLabelText("Recipient XRPL address")).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Amount" })).toBeNull();
    expect(screen.getByRole("button", { name: "Continue to Xaman" })).toBeEnabled();
  });

  it("loads, signs, verifies, and settles the stored slot", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(createdPayload, 201))
      .mockResolvedValueOnce(jsonResponse({ payloadId: PAYLOAD_ID, status: "submitted", txid: TXID }))
      .mockResolvedValueOnce(jsonResponse({
        status: "verified",
        proof: {
          network: "testnet",
          transactionId: TXID,
          ledgerIndex: 12345,
          sender: createdPayload.slot.expectedPayerAddress,
          destination: createdPayload.slot.destinationAddress,
          amountDrops: "4000000",
          deliveredAmountDrops: "4000000",
          sourceTag: 123456,
          destinationTag: null,
          invoiceId: createdPayload.slot.invoiceId,
          idempotencyKey: `testnet:${TXID}`,
          verifiedAt: "2026-06-23T01:02:03.000Z",
        },
        receipt: {
          receiptId: `testnet:${TXID}`,
          status: "created",
          network: "testnet",
          transactionId: TXID,
          invoiceId: createdPayload.slot.invoiceId,
          recordedAt: "2026-06-23T01:02:04.000Z",
          proofDigest: "C".repeat(64),
        },
      }));

    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("WebSocket", MockWebSocket);

    render(<TestnetPaymentForm paymentToken={PAYMENT_TOKEN} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue to Xaman" }));

    await screen.findByRole("heading", { name: "Waiting for approval in Xaman" });
    expect(screen.getByText("4 XRP")).toBeVisible();
    expect(screen.getByText("Alex")).toBeVisible();
    expect(fetcher).toHaveBeenNthCalledWith(1, "/api/payments/payload", expect.objectContaining({
      body: JSON.stringify({ paymentToken: PAYMENT_TOKEN }),
    }));

    fireEvent.click(screen.getByRole("button", { name: "Check status" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Ledger verified" })).toBeVisible();
    });

    expect(fetcher).toHaveBeenNthCalledWith(3, "/api/payments/verify", expect.objectContaining({
      body: JSON.stringify({ paymentToken: PAYMENT_TOKEN, payloadId: PAYLOAD_ID }),
    }));
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
