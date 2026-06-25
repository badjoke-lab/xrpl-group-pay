import { describe, expect, it } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import { PAYMENT_SLOT_CONTRACT_VERSION } from "@/features/persistence/asset-records";
import {
  makeXrplTransaction,
  TEST_AMOUNT_DROPS,
  TEST_DESTINATION,
  TEST_INVOICE_ID,
  TEST_SENDER,
  TEST_SOURCE_TAG,
  TEST_TXID,
} from "@/features/payment-verification/test-helpers";
import type { XrplTxResult } from "@/features/xrpl/schemas";

import type { ResolvedPaymentSlot } from "./payment-slot";
import {
  verifyStoredSlotAssetPayment,
  verifyStoredSlotPayment,
} from "./stored-slot-verification";

const baseSlot: ResolvedPaymentSlot = {
  slotId: "slot-1",
  slotPublicId: "00000000-0000-4000-8000-000000000001",
  billId: "bill-1",
  billPublicId: "00000000-0000-4000-8000-000000000002",
  billTitle: "Dinner",
  network: "testnet",
  destinationAddress: TEST_DESTINATION,
  destinationTag: 9,
  participantLabel: "Alex",
  expectedPayerAddress: TEST_SENDER,
  expectedAmountDrops: TEST_AMOUNT_DROPS,
  invoiceId: TEST_INVOICE_ID,
  slotStatus: "unpaid",
  billStatus: "open",
  paidTransactionId: null,
};

const submittedRequest = {
  providerId: "xaman" as const,
  requestId: "request-id",
  status: "submitted" as const,
  transactionId: TEST_TXID,
};

describe("stored verification dispatch", () => {
  it("preserves the legacy XRP verification result", async () => {
    const outcome = await verifyStoredSlotPayment(
      baseSlot,
      "request-id",
      {
        readProviderStatus: async () => submittedRequest,
        getXrplTransaction: async () => makeXrplTransaction(),
        sourceTag: TEST_SOURCE_TAG,
      },
    );

    expect(outcome).toMatchObject({
      status: "verified",
      proof: { amountDrops: TEST_AMOUNT_DROPS },
    });
  });

  it("returns a canonical verified RLUSD payment through the Asset path", async () => {
    const asset = getRlusdAssetDescriptor("testnet");
    const amount = {
      currency: asset.currency,
      issuer: asset.issuer,
      value: "1.25",
    };
    const transaction: XrplTxResult = {
      hash: TEST_TXID,
      validated: true,
      ledger_index: 12345,
      tx_json: {
        TransactionType: "Payment",
        Account: TEST_SENDER,
        Destination: TEST_DESTINATION,
        DeliverMax: amount,
        SourceTag: TEST_SOURCE_TAG,
        DestinationTag: 9,
        InvoiceID: TEST_INVOICE_ID,
        Flags: 0,
      },
      meta: {
        TransactionResult: "tesSUCCESS",
        delivered_amount: amount,
      },
    };
    const slot: ResolvedPaymentSlot = {
      ...baseSlot,
      expectedAmountDrops: "1250000",
      paymentContractVersion: PAYMENT_SLOT_CONTRACT_VERSION,
      asset,
      expectedAmount: {
        code: asset.symbol,
        units: "1250000",
        scale: asset.precision,
      },
    };

    const outcome = await verifyStoredSlotAssetPayment(
      slot,
      "request-id",
      {
        readProviderStatus: async () => submittedRequest,
        getXrplTransaction: async () => transaction,
        sourceTag: TEST_SOURCE_TAG,
        now: () => new Date("2026-06-25T03:00:00.000Z"),
      },
    );

    expect(outcome).toMatchObject({
      status: "verified",
      legacyProof: null,
      payment: {
        receiptContract: "xrpl-issued-payment-v1",
        transactionId: TEST_TXID,
        asset: { id: asset.id, currency: asset.currency, issuer: asset.issuer },
        requestedAmount: { units: "1250000", scale: 6 },
        deliveredAmount: { units: "1250000", scale: 6 },
      },
    });
  });
});
