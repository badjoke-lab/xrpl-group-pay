import { describe, expect, it } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import { createRlusdPaymentIntent } from "@/features/payment-intents/rlusd";
import { createXrpPaymentIntent } from "@/features/payment-intents/xrp";
import type { XamanPaymentPayloadRequest } from "./payment-request";
import {
  XAMAN_PROVIDER_CAPABILITIES,
  XamanProvider,
  type XamanPayloadClient,
} from "./provider";
import type { XamanCreatePayloadResponse } from "./schemas";

const DESTINATION = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const PAYER = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const INVOICE_ID = "AB".repeat(32);
const RESPONSE: XamanCreatePayloadResponse = {
  uuid: "00000000-0000-4000-8000-000000000001",
  next: { always: "https://xaman.app/sign/00000000-0000-4000-8000-000000000001" },
  refs: {
    qr_png: "https://xaman.app/qr.png",
    qr_matrix: "qr-data",
    websocket_status: "wss://xaman.app/socket",
  },
  pushed: false,
};

class Client implements XamanPayloadClient {
  requests: XamanPaymentPayloadRequest[] = [];

  async createPayload(
    request: XamanPaymentPayloadRequest,
  ): Promise<XamanCreatePayloadResponse> {
    this.requests.push(request);
    return RESPONSE;
  }
}

describe("Xaman provider capabilities", () => {
  it("declares Testnet native and issued Asset support", () => {
    expect(XAMAN_PROVIDER_CAPABILITIES.networks).toEqual(["testnet"]);
    expect(XAMAN_PROVIDER_CAPABILITIES.assetTypes).toEqual([
      "native",
      "issued",
    ]);
  });

  it("preserves the existing XRP request shape", async () => {
    const client = new Client();
    const provider = new XamanProvider(client);
    const intent = createXrpPaymentIntent({
      paymentSlotId: "slot-1",
      network: "testnet",
      amountDrops: "1250000",
      destination: DESTINATION,
      destinationTag: 9,
      sourceTag: 123456,
      invoiceId: INVOICE_ID,
      expectedPayer: PAYER,
      now: new Date("2026-06-25T05:00:00.000Z"),
    });

    const handoff = await provider.createHandoff(intent);

    expect(client.requests).toEqual([
      {
        txjson: {
          TransactionType: "Payment",
          Destination: DESTINATION,
          Amount: "1250000",
          SourceTag: 123456,
          InvoiceID: INVOICE_ID,
          DestinationTag: 9,
        },
        options: { submit: true, expire: 5, force_network: "TESTNET" },
      },
    ]);
    expect(handoff).toMatchObject({
      providerId: "xaman",
      requestId: RESPONSE.uuid,
      status: "available",
      expiresAt: "2026-06-25T05:05:00.000Z",
    });
  });

  it("creates an official RLUSD issued Amount request", async () => {
    const client = new Client();
    const provider = new XamanProvider(client);
    const asset = getRlusdAssetDescriptor("testnet");
    const intent = createRlusdPaymentIntent({
      paymentSlotId: "slot-rlusd-1",
      network: "testnet",
      amountUnits: "1250000",
      destination: DESTINATION,
      destinationTag: null,
      sourceTag: 123456,
      invoiceId: INVOICE_ID,
      expectedPayer: PAYER,
      now: new Date("2026-06-25T05:00:00.000Z"),
    });

    await provider.createHandoff(intent);

    expect(client.requests[0]).toEqual({
      txjson: {
        TransactionType: "Payment",
        Destination: DESTINATION,
        Amount: {
          currency: asset.currency,
          issuer: asset.issuer,
          value: "1.25",
        },
        SourceTag: 123456,
        InvoiceID: INVOICE_ID,
      },
      options: { submit: true, expire: 5, force_network: "TESTNET" },
    });
  });

  it("rejects Mainnet intents before calling Xaman", async () => {
    const client = new Client();
    const provider = new XamanProvider(client);
    const intent = createXrpPaymentIntent({
      paymentSlotId: "slot-mainnet-1",
      network: "mainnet",
      amountDrops: "1",
      destination: DESTINATION,
      destinationTag: null,
      sourceTag: 123456,
      invoiceId: INVOICE_ID,
      expectedPayer: PAYER,
    });

    await expect(provider.createHandoff(intent)).rejects.toMatchObject({
      code: "UNSUPPORTED_INTENT",
    });
    expect(client.requests).toHaveLength(0);
  });
});
