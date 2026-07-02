import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type { PaymentDetails } from "@/features/bills/payment-details";
import { readyPaymentReadiness } from "@/test/fixtures/payment-readiness";

import { TestnetPaymentForm } from "./testnet-payment-form";

const PAYMENT_TOKEN = "a".repeat(64);
const PAYLOAD_ID = "123e4567-e89b-12d3-a456-426614174000";
const TXID = "A".repeat(64);
const INVOICE_ID = "B".repeat(64);
const ASSET = getRlusdAssetDescriptor("testnet");

function jsonResponse(body: unknown, status = 200) {
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

class MockWebSocket {
  addEventListener() {}
  removeEventListener() {}
  close() {}
}

const details: PaymentDetails = {
  billTitle: "RLUSD Dinner",
  participantLabel: "Alex",
  expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  destinationTag: null,
  asset: ASSET,
  amount: { code: "RLUSD", units: "1250000", scale: 6 },
  amountDrops: null,
  sourceTag: 123456,
  invoiceId: INVOICE_ID,
  network: "testnet",
};

const createdPayload = {
  payloadId: PAYLOAD_ID,
  status: "waiting",
  deepLink: `https://xaman.app/sign/${PAYLOAD_ID}`,
  qrPng: `https://xaman.app/sign/${PAYLOAD_ID}_q.png`,
  websocketUrl: `wss://xaman.app/sign/${PAYLOAD_ID}`,
  slot: {
    publicId: "00000000-0000-4000-8000-000000000001",
    billPublicId: "00000000-0000-4000-8000-000000000002",
    ...details,
  },
};

function issuedVerification(requestedUnits = "1250000") {
  return {
    status: "verified",
    payment: {
      contractVersion: "xrpl-group-pay:verified-payment:v1",
      receiptContract: ASSET.receiptContract,
      network: "testnet",
      transactionId: TXID,
      ledgerIndex: 12345,
      sender: details.expectedPayerAddress,
      destination: details.destinationAddress,
      asset: ASSET,
      requestedAmount: { code: "RLUSD", units: requestedUnits, scale: 6 },
      deliveredAmount: { code: "RLUSD", units: requestedUnits, scale: 6 },
      sourceTag: details.sourceTag,
      destinationTag: details.destinationTag,
      invoiceId: details.invoiceId,
      idempotencyKey: `testnet:${TXID}`,
      verifiedAt: "2026-06-25T01:02:03.000Z",
    },
    receipt: {
      receiptId: `testnet:${TXID}`,
      status: "recorded",
      network: "testnet",
      transactionId: TXID,
      invoiceId: details.invoiceId,
      assetId: ASSET.id,
      recordedAt: "2026-06-25T01:02:04.000Z",
      verifiedPaymentDigest: "D".repeat(64),
      legacyProofDigest: null,
    },
  };
}

function prepareFetch(verification: unknown) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url === "/api/payments/details") return jsonResponse(details);
    if (url === "/api/payments/readiness") {
      return jsonResponse(readyPaymentReadiness(details));
    }
    if (url === "/api/payments/payload") {
      return jsonResponse(createdPayload, 201);
    }
    if (url === `/api/xaman/payloads/${PAYLOAD_ID}`) {
      return jsonResponse({
        payloadId: PAYLOAD_ID,
        status: "submitted",
        txid: TXID,
      });
    }
    if (url === "/api/payments/verify") {
      return jsonResponse(verification);
    }
    throw new Error(`Unexpected request: ${url}`);
  });
}

async function submitAndVerify() {
  render(<TestnetPaymentForm paymentToken={PAYMENT_TOKEN} />);
  await screen.findByRole("heading", { name: details.billTitle });
  fireEvent.click(screen.getByRole("button", { name: "Review final payment" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Create Xaman Sign Request" }),
  );
  await screen.findByRole("heading", { name: "Waiting for approval in Xaman" });
  fireEvent.click(screen.getByRole("button", { name: "Check status" }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("RLUSD participant verification", () => {
  it("shows the delivered RLUSD amount after validated-ledger verification", async () => {
    const fetcher = prepareFetch(issuedVerification());
    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("WebSocket", MockWebSocket);

    await submitAndVerify();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Ledger verified" }),
      ).toBeVisible();
    });
    expect(
      screen.getByText(/1\.25 RLUSD was delivered directly to the recipient/i),
    ).toBeVisible();
    expect(
      screen.getByText("A durable verification receipt was recorded."),
    ).toBeVisible();
    expect(fetcher).toHaveBeenCalledWith(
      "/api/payments/verify",
      expect.objectContaining({
        body: JSON.stringify({
          paymentToken: PAYMENT_TOKEN,
          payloadId: PAYLOAD_ID,
        }),
      }),
    );
  });

  it("does not show a verified result when the response differs from frozen details", async () => {
    vi.stubGlobal("fetch", prepareFetch(issuedVerification("2500000")));
    vi.stubGlobal("WebSocket", MockWebSocket);

    await submitAndVerify();

    expect(
      await screen.findByRole("heading", { name: "Payment could not be verified" }),
    ).toBeVisible();
    expect(
      screen.getByText(/did not match the frozen participant payment details/i),
    ).toBeVisible();
  });
});
