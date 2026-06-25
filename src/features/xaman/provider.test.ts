import { describe, expect, it } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type { PaymentIntent } from "@/features/payment-intents/types";
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

  async createPayload(request: XamanPaymentPayloadRequest) {
    this.requests.push(request);
    return RESPONSE;
  }
}

function approvedProvider(client: Client) {
  return new XamanProvider(client, {
    network: "mainnet",
    mainnetAccess: { network: "mainnet", mainnetGateApproved: true },
  });
}

describe("Xaman provider capabilities", () => {
  it("declares both XRPL networks and both supported Asset types", () => {
    expect(XAMAN_PROVIDER_CAPABILITIES.networks).toEqual([
      "testnet",
      "mainnet",
    ]);
    expect(XAMAN_PROVIDER_CAPABILITIES.assetTypes).toEqual([
      "native",
      "issued",
    ]);
  });

  it("preserves the Testnet XRP request", async () => {
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

    expect(client.requests[0]).toEqual({
      txjson: {
        TransactionType: "Payment",
        Destination: DESTINATION,
        Amount: "1250000",
        SourceTag: 123456,
        InvoiceID: INVOICE_ID,
        DestinationTag: 9,
      },
      options: { submit: true, expire: 5, force_network: "TESTNET" },
    });
    expect(handoff).toMatchObject({
      status: "available",
      transactionId: null,
      providerMetadata: {
        network: "testnet",
        assetId: "xrpl:testnet:xrp",
      },
    });
  });

  it("builds canonical Mainnet XRP and RLUSD requests", async () => {
    const client = new Client();
    const provider = approvedProvider(client);
    const xrpIntent = createXrpPaymentIntent({
      paymentSlotId: "slot-xrp",
      network: "mainnet",
      amountDrops: "2000000",
      destination: DESTINATION,
      destinationTag: null,
      sourceTag: 987654,
      invoiceId: INVOICE_ID,
      expectedPayer: PAYER,
    });
    const rlusdIntent = createRlusdPaymentIntent({
      paymentSlotId: "slot-rlusd",
      network: "mainnet",
      amountUnits: "7250000",
      destination: DESTINATION,
      destinationTag: 44,
      sourceTag: 987654,
      invoiceId: INVOICE_ID,
      expectedPayer: PAYER,
    });

    await provider.createHandoff(xrpIntent);
    await provider.createHandoff(rlusdIntent);

    const asset = getRlusdAssetDescriptor("mainnet");
    expect(client.requests).toEqual([
      {
        txjson: {
          TransactionType: "Payment",
          Destination: DESTINATION,
          Amount: "2000000",
          SourceTag: 987654,
          InvoiceID: INVOICE_ID,
        },
        options: { submit: true, expire: 5, force_network: "MAINNET" },
      },
      {
        txjson: {
          TransactionType: "Payment",
          Destination: DESTINATION,
          Amount: {
            currency: asset.currency,
            issuer: asset.issuer,
            value: "7.25",
          },
          SourceTag: 987654,
          InvoiceID: INVOICE_ID,
          DestinationTag: 44,
        },
        options: { submit: true, expire: 5, force_network: "MAINNET" },
      },
    ]);
  });

  it("rejects an unavailable Mainnet gate and network crossover", async () => {
    const blockedClient = new Client();
    const blocked = new XamanProvider(blockedClient, { network: "mainnet" });
    const mainnetIntent = createXrpPaymentIntent({
      paymentSlotId: "slot-mainnet",
      network: "mainnet",
      amountDrops: "1",
      destination: DESTINATION,
      destinationTag: null,
      sourceTag: 987654,
      invoiceId: INVOICE_ID,
      expectedPayer: PAYER,
    });
    await expect(blocked.createHandoff(mainnetIntent)).rejects.toMatchObject({
      code: "UNSUPPORTED_INTENT",
    });
    expect(blockedClient.requests).toHaveLength(0);

    const testnetClient = new Client();
    await expect(
      new XamanProvider(testnetClient).createHandoff(mainnetIntent),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_INTENT" });
    expect(testnetClient.requests).toHaveLength(0);
  });

  it("rejects a modified approved Asset descriptor", async () => {
    const client = new Client();
    const provider = approvedProvider(client);
    const intent = createRlusdPaymentIntent({
      paymentSlotId: "slot-modified",
      network: "mainnet",
      amountUnits: "1000000",
      destination: DESTINATION,
      destinationTag: null,
      sourceTag: 987654,
      invoiceId: INVOICE_ID,
      expectedPayer: PAYER,
    });
    const modified = {
      ...intent,
      asset: { ...intent.asset, issuer: PAYER },
    } as PaymentIntent;

    await expect(provider.createHandoff(modified)).rejects.toMatchObject({
      code: "UNSUPPORTED_INTENT",
    });
    expect(client.requests).toHaveLength(0);
  });
});
