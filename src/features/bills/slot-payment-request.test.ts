import { describe, expect, it } from "vitest";

import {
  getRlusdAssetDescriptor,
  getXrpAssetDescriptor,
} from "@/features/assets/registry";
import { PAYMENT_SLOT_CONTRACT_VERSION } from "@/features/persistence/asset-records";

import type { ResolvedPaymentSlot } from "./payment-slot";
import {
  buildStoredSlotPaymentIntent,
  buildStoredSlotPaymentPayload,
} from "./slot-payment-request";

const DESTINATION = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const PAYER = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const INVOICE_ID = "AB".repeat(32);

const slot: ResolvedPaymentSlot = {
  slotId: "slot-1",
  slotPublicId: "00000000-0000-4000-8000-000000000001",
  billId: "bill-1",
  billPublicId: "00000000-0000-4000-8000-000000000002",
  billTitle: "Dinner",
  network: "testnet",
  destinationAddress: DESTINATION,
  destinationTag: 9,
  participantLabel: "Alex",
  expectedPayerAddress: PAYER,
  expectedAmountDrops: "4000001",
  invoiceId: INVOICE_ID,
  slotStatus: "unpaid",
  billStatus: "open",
  paidTransactionId: null,
};

const now = new Date("2026-06-24T00:00:00.000Z");

describe("stored slot Payment Intent", () => {
  it("derives a frozen wallet-neutral XRP intent from server state", () => {
    expect(buildStoredSlotPaymentIntent(slot, 123456, now)).toMatchObject({
      paymentSlotId: slot.slotPublicId,
      network: "testnet",
      asset: { id: "xrpl:testnet:xrp", assetType: "native" },
      amount: { code: "XRP", units: "4000001", scale: 6 },
      destination: DESTINATION,
      destinationTag: 9,
      sourceTag: 123456,
      invoiceId: INVOICE_ID,
      expectedPayer: PAYER,
      revision: 1,
      expiresAt: "2026-06-24T00:05:00.000Z",
    });
  });

  it("derives an official RLUSD intent from the frozen issued Asset", () => {
    const asset = getRlusdAssetDescriptor("testnet");
    const issuedSlot: ResolvedPaymentSlot = {
      ...slot,
      paymentContractVersion: PAYMENT_SLOT_CONTRACT_VERSION,
      asset,
      expectedAmount: {
        code: asset.symbol,
        units: "1250000",
        scale: asset.precision,
      },
      expectedAmountDrops: "1250000",
    };

    expect(
      buildStoredSlotPaymentIntent(issuedSlot, 123456, now),
    ).toMatchObject({
      paymentSlotId: slot.slotPublicId,
      network: "testnet",
      asset: {
        id: "xrpl:testnet:rlusd",
        assetType: "issued",
        currency: asset.currency,
        issuer: asset.issuer,
      },
      amount: { code: "RLUSD", units: "1250000", scale: 6 },
      destination: DESTINATION,
      destinationTag: 9,
      sourceTag: 123456,
      invoiceId: INVOICE_ID,
      expectedPayer: PAYER,
    });
  });

  it("preserves the existing Xaman Testnet XRP request shape", () => {
    expect(buildStoredSlotPaymentPayload(slot, 123456, now)).toEqual({
      txjson: {
        TransactionType: "Payment",
        Destination: DESTINATION,
        Amount: "4000001",
        SourceTag: 123456,
        InvoiceID: INVOICE_ID,
        DestinationTag: 9,
      },
      options: { submit: true, expire: 5, force_network: "TESTNET" },
    });
  });

  it("keeps issued-asset wallet handoff disabled on the legacy payload path", () => {
    const asset = getRlusdAssetDescriptor("testnet");
    expect(() =>
      buildStoredSlotPaymentPayload(
        {
          ...slot,
          paymentContractVersion: PAYMENT_SLOT_CONTRACT_VERSION,
          asset,
          expectedAmount: {
            code: asset.symbol,
            units: "1250000",
            scale: asset.precision,
          },
          expectedAmountDrops: "1250000",
        },
        123456,
        now,
      ),
    ).toThrow("The XRP builder accepts only a native XRP Payment Intent.");
  });

  it("never creates a Testnet payload from a Mainnet slot on the legacy path", () => {
    const asset = getXrpAssetDescriptor("mainnet");
    const mainnetSlot: ResolvedPaymentSlot = {
      ...slot,
      network: "mainnet",
      paymentContractVersion: PAYMENT_SLOT_CONTRACT_VERSION,
      asset,
      expectedAmount: {
        code: asset.symbol,
        units: slot.expectedAmountDrops,
        scale: asset.precision,
      },
    };

    expect(() =>
      buildStoredSlotPaymentPayload(mainnetSlot, 987654, now),
    ).toThrow(
      "The legacy Xaman payload helper is restricted to XRPL Testnet.",
    );
  });

  it("fails closed for an invalid configured Source Tag", () => {
    expect(() => buildStoredSlotPaymentIntent(slot, -1, now)).toThrow(
      "Source Tag must be a UInt32 value.",
    );
  });
});
