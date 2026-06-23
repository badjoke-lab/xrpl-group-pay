import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TestnetPaymentForm } from "./testnet-payment-form";

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TestnetPaymentForm", () => {
  it("renders a Testnet-only, user-approved payment form", () => {
    render(<TestnetPaymentForm />);

    expect(
      screen.getByRole("heading", { name: "Create a Testnet Payment" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Recipient XRPL address")).toBeRequired();
    expect(screen.getByRole("textbox", { name: "Amount" })).toBeRequired();
    expect(
      screen.getByRole("button", { name: "Continue to Xaman" }),
    ).toBeEnabled();
    expect(screen.getByText(/forces Xaman to use XRPL Testnet/i)).toBeVisible();
  });

  it("moves from Xaman submission to a stored validated-ledger proof", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            payloadId: PAYLOAD_ID,
            status: "waiting",
            deepLink: `https://xumm.app/sign/${PAYLOAD_ID}`,
            qrPng: `https://xumm.app/sign/${PAYLOAD_ID}_q.png`,
            websocketUrl: `wss://xumm.app/sign/${PAYLOAD_ID}`,
            invoiceId: "B".repeat(64),
            transaction: {
              destination: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
              destinationTag: null,
              amountDrops: "4000000",
              sourceTag: 123456,
              network: "testnet",
            },
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          payloadId: PAYLOAD_ID,
          status: "submitted",
          txid: TXID,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "verified",
          proof: {
            network: "testnet",
            transactionId: TXID,
            ledgerIndex: 12345,
            sender: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
            destination: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
            amountDrops: "4000000",
            deliveredAmountDrops: "4000000",
            sourceTag: 123456,
            destinationTag: null,
            invoiceId: "B".repeat(64),
            idempotencyKey: `testnet:${TXID}`,
            verifiedAt: "2026-06-23T01:02:03.000Z",
          },
          receipt: {
            receiptId: `testnet:${TXID}`,
            status: "created",
            network: "testnet",
            transactionId: TXID,
            invoiceId: "B".repeat(64),
            recordedAt: "2026-06-23T01:02:04.000Z",
            proofDigest: "C".repeat(64),
          },
        }),
      );

    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("WebSocket", MockWebSocket);

    render(<TestnetPaymentForm />);
    fireEvent.change(screen.getByLabelText("Recipient XRPL address"), {
      target: { value: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue to Xaman" }));

    await screen.findByRole("heading", {
      name: "Waiting for approval in Xaman",
    });
    fireEvent.click(screen.getByRole("button", { name: "Check status" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Ledger verified" }),
      ).toBeVisible();
    });
    expect(screen.getByText("4000000 drops")).toBeVisible();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
