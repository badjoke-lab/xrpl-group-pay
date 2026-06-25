import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getRlusdAssetDescriptor,
  getXrpAssetDescriptor,
} from "@/features/assets/registry";

import { TestnetPaymentForm } from "./testnet-payment-form";

const PAYMENT_TOKEN = "a".repeat(64);
const PAYLOAD_ID = "123e4567-e89b-12d3-a456-426614174000";
const TXID = "A".repeat(64);
const XRP = getXrpAssetDescriptor("testnet");

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

const details = {
  billTitle: "XRPL Meetup Dinner",
  participantLabel: "Alex",
  expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  destinationTag: null,
  asset: XRP,
  amount: { code: "XRP", units: "4000000", scale: 6 },
  amountDrops: "4000000",
  sourceTag: 123456,
  invoiceId: "B".repeat(64),
  network: "testnet",
};

const createdPayload = {
  payloadId: PAYLOAD_ID,
  status: "waiting",
  deepLink: `https://xumm.app/sign/${PAYLOAD_ID}`,
  qrPng: `https://xumm.app/sign/${PAYLOAD_ID}_q.png`,
  websocketUrl: `wss://xumm.app/sign/${PAYLOAD_ID}`,
  slot: {
    publicId: "00000000-0000-4000-8000-000000000001",
    billPublicId: "00000000-0000-4000-8000-000000000002",
    ...details,
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
    expect(
      screen.getByRole("heading", { name: "Payment link unavailable" }),
    ).toBeVisible();
  });

  it("loads frozen details without creating a Xaman payload", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(details));
    vi.stubGlobal("fetch", fetcher);

    render(<TestnetPaymentForm paymentToken={PAYMENT_TOKEN} />);

    expect(
      await screen.findByRole("heading", { name: details.billTitle }),
    ).toBeVisible();
    expect(screen.getByText("4", { exact: true })).toBeVisible();
    expect(screen.getByText("Alex")).toBeVisible();
    expect(screen.queryByLabelText("Recipient XRPL address")).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Amount" })).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/payments/details",
      expect.objectContaining({
        body: JSON.stringify({ paymentToken: PAYMENT_TOKEN }),
      }),
    );
  });

  it("shows official RLUSD, issuer, and XRP fee notice before handoff", async () => {
    const asset = getRlusdAssetDescriptor("testnet");
    const rlusdDetails = {
      ...details,
      asset,
      amount: { code: "RLUSD", units: "1250000", scale: 6 },
      amountDrops: null,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(rlusdDetails)));

    render(<TestnetPaymentForm paymentToken={PAYMENT_TOKEN} />);
    await screen.findByRole("heading", { name: details.billTitle });

    expect(screen.getByText("1.25", { exact: true })).toBeVisible();
    expect(screen.getByText("Official RLUSD on XRPL Testnet")).toBeVisible();
    expect(screen.getByTitle(asset.issuer)).toBeVisible();
    expect(screen.getByText(/network fee is paid separately in XRP/i)).toBeVisible();
  });

  it("requires final confirmation before creating the Sign Request", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(details))
      .mockResolvedValueOnce(jsonResponse(createdPayload, 201));
    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("WebSocket", MockWebSocket);

    render(<TestnetPaymentForm paymentToken={PAYMENT_TOKEN} />);
    await screen.findByRole("heading", { name: details.billTitle });

    fireEvent.click(
      screen.getByRole("button", { name: "Review final payment" }),
    );
    expect(
      screen.getByRole("heading", { name: "Confirm the exact Testnet payment" }),
    ).toBeVisible();
    expect(screen.getByText(details.invoiceId)).toBeVisible();
    expect(screen.getByText(String(details.sourceTag))).toBeVisible();
    expect(fetcher).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Back to details" }));
    expect(
      screen.getByRole("heading", { name: "Frozen payment details loaded" }),
    ).toBeVisible();
    expect(fetcher).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Review final payment" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Create Xaman Sign Request" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Waiting for approval in Xaman" }),
    ).toBeVisible();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/api/payments/payload",
      expect.objectContaining({
        body: JSON.stringify({ paymentToken: PAYMENT_TOKEN }),
      }),
    );
  });

  it("loads, confirms, signs, verifies, and settles the stored slot", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(details))
      .mockResolvedValueOnce(jsonResponse(createdPayload, 201))
      .mockResolvedValueOnce(
        jsonResponse({ payloadId: PAYLOAD_ID, status: "submitted", txid: TXID }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "verified",
          proof: {
            network: "testnet",
            transactionId: TXID,
            ledgerIndex: 12345,
            sender: details.expectedPayerAddress,
            destination: details.destinationAddress,
            amountDrops: details.amountDrops,
            deliveredAmountDrops: details.amountDrops,
            sourceTag: details.sourceTag,
            destinationTag: null,
            invoiceId: details.invoiceId,
            idempotencyKey: `testnet:${TXID}`,
            verifiedAt: "2026-06-23T01:02:03.000Z",
          },
          receipt: {
            receiptId: `testnet:${TXID}`,
            status: "created",
            network: "testnet",
            transactionId: TXID,
            invoiceId: details.invoiceId,
            recordedAt: "2026-06-23T01:02:04.000Z",
            proofDigest: "C".repeat(64),
          },
        }),
      );

    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("WebSocket", MockWebSocket);

    render(<TestnetPaymentForm paymentToken={PAYMENT_TOKEN} />);
    await screen.findByRole("heading", { name: details.billTitle });
    fireEvent.click(
      screen.getByRole("button", { name: "Review final payment" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Create Xaman Sign Request" }),
    );

    await screen.findByRole("heading", { name: "Waiting for approval in Xaman" });
    fireEvent.click(screen.getByRole("button", { name: "Check status" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Ledger verified" }),
      ).toBeVisible();
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      4,
      "/api/payments/verify",
      expect.objectContaining({
        body: JSON.stringify({
          paymentToken: PAYMENT_TOKEN,
          payloadId: PAYLOAD_ID,
        }),
      }),
    );
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("shows a completed state for a paid capability without details", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "SLOT_ALREADY_PAID",
            message: "This payment slot is already paid.",
          },
        },
        409,
      ),
    );
    vi.stubGlobal("fetch", fetcher);

    render(<TestnetPaymentForm paymentToken={PAYMENT_TOKEN} />);
    expect(
      await screen.findByRole("heading", { name: "Payment already completed" }),
    ).toBeVisible();
    expect(screen.queryByText(details.destinationAddress)).toBeNull();
  });
});
