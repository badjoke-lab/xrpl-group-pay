import { describe, expect, it, vi } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type { D1DatabaseLike } from "@/features/persistence/d1-types";
import type { AssetVerificationOutcome } from "@/features/payment-verification/asset-outcome";

import type { ResolvedPaymentSlot } from "./payment-slot";
import { verifyAndSettleStoredSlotPayment } from "./verify-and-settle-slot";

const TXID = "A".repeat(64);
const INVOICE_ID = "B".repeat(64);
const PROOF_DIGEST = "C".repeat(64);
const VERIFIED_DIGEST = "D".repeat(64);
const SLOT_PUBLIC_ID = "00000000-0000-4000-8000-000000000001";
const BILL_PUBLIC_ID = "00000000-0000-4000-8000-000000000002";
const ASSET = getRlusdAssetDescriptor("testnet");

const database = {
  prepare() {
    throw new Error("The injected settlement stub should be used.");
  },
  batch() {
    throw new Error("The injected settlement stub should be used.");
  },
} as D1DatabaseLike;

const slot: ResolvedPaymentSlot = {
  slotId: "slot-1",
  slotPublicId: SLOT_PUBLIC_ID,
  billId: "bill-1",
  billPublicId: BILL_PUBLIC_ID,
  billTitle: "Dinner",
  network: "testnet",
  destinationAddress: "rDestination",
  destinationTag: null,
  participantLabel: "Alex",
  expectedPayerAddress: "rSender",
  expectedAmountDrops: "1",
  invoiceId: INVOICE_ID,
  slotStatus: "validating",
  billStatus: "open",
  paidTransactionId: null,
};

const xrpOutcome: AssetVerificationOutcome = {
  status: "verified",
  payment: {
    contractVersion: "xrpl-group-pay:verified-payment:v1",
    receiptContract: "xrpl-xrp-payment-v1",
    network: "testnet",
    transactionId: TXID,
    ledgerIndex: 12345,
    sender: "rSender",
    destination: "rDestination",
    asset: {
      id: "xrpl:testnet:xrp",
      paymentRail: "xrpl",
      network: "testnet",
      assetType: "native",
      currency: "XRP",
      issuer: null,
      precision: 6,
      symbol: "XRP",
      verificationStrategy: "xrpl-xrp-v1",
      receiptContract: "xrpl-xrp-payment-v1",
    },
    requestedAmount: { code: "XRP", units: "1", scale: 6 },
    deliveredAmount: { code: "XRP", units: "1", scale: 6 },
    sourceTag: 1,
    destinationTag: null,
    invoiceId: INVOICE_ID,
    idempotencyKey: `testnet:${TXID}`,
    verifiedAt: "2026-06-25T04:00:00.000Z",
  },
  legacyProof: {
    network: "testnet",
    transactionId: TXID,
    ledgerIndex: 12345,
    sender: "rSender",
    destination: "rDestination",
    amountDrops: "1",
    deliveredAmountDrops: "1",
    sourceTag: 1,
    destinationTag: null,
    invoiceId: INVOICE_ID,
    idempotencyKey: `testnet:${TXID}`,
    verifiedAt: "2026-06-25T04:00:00.000Z",
  },
};

const issuedOutcome: AssetVerificationOutcome = {
  status: "verified",
  legacyProof: null,
  payment: {
    contractVersion: "xrpl-group-pay:verified-payment:v1",
    receiptContract: ASSET.receiptContract,
    network: "testnet",
    transactionId: TXID,
    ledgerIndex: 12345,
    sender: "rSender",
    destination: "rDestination",
    asset: ASSET,
    requestedAmount: { code: "RLUSD", units: "1250000", scale: 6 },
    deliveredAmount: { code: "RLUSD", units: "1250000", scale: 6 },
    sourceTag: 1,
    destinationTag: null,
    invoiceId: INVOICE_ID,
    idempotencyKey: `testnet:${TXID}`,
    verifiedAt: "2026-06-25T04:00:00.000Z",
  },
};

const verificationDependencies = {
  readProviderStatus: vi.fn(),
  getXrplTransaction: vi.fn(),
  sourceTag: 1,
};

describe("verifyAndSettleStoredSlotPayment", () => {
  it("preserves the exact legacy XRP endpoint shape", async () => {
    const verifyPayment = vi.fn().mockResolvedValue(xrpOutcome);
    const settleXrp = vi.fn().mockResolvedValue({
      receipt: {
        receiptId: `testnet:${TXID}`,
        status: "created",
        network: "testnet",
        transactionId: TXID,
        invoiceId: INVOICE_ID,
        recordedAt: "2026-06-25T04:00:01.000Z",
        proofDigest: PROOF_DIGEST,
      },
      slot: {},
      bill: {},
    });
    const settleIssued = vi.fn();

    const result = await verifyAndSettleStoredSlotPayment(
      database,
      slot,
      "request-id",
      {
        verification: verificationDependencies,
        verifyPayment,
        settleXrp,
        settleIssued,
      },
    );

    expect(result).toEqual({
      status: "verified",
      proof: xrpOutcome.legacyProof,
      receipt: {
        receiptId: `testnet:${TXID}`,
        status: "created",
        network: "testnet",
        transactionId: TXID,
        invoiceId: INVOICE_ID,
        recordedAt: "2026-06-25T04:00:01.000Z",
        proofDigest: PROOF_DIGEST,
      },
    });
    expect(settleXrp).toHaveBeenCalledWith(
      database,
      slot,
      xrpOutcome.legacyProof,
    );
    expect(settleIssued).not.toHaveBeenCalled();
  });

  it("returns the issued payment and generic receipt after RLUSD settlement", async () => {
    const verifyPayment = vi.fn().mockResolvedValue(issuedOutcome);
    const settleXrp = vi.fn();
    const settleIssued = vi.fn().mockResolvedValue({
      receipt: {
        receiptId: `testnet:${TXID}`,
        status: "recorded",
        network: "testnet",
        transactionId: TXID,
        invoiceId: INVOICE_ID,
        assetId: ASSET.id,
        recordedAt: "2026-06-25T04:00:01.000Z",
        verifiedPaymentDigest: VERIFIED_DIGEST,
        legacyProofDigest: null,
      },
      slot: {},
      bill: {},
    });

    const result = await verifyAndSettleStoredSlotPayment(
      database,
      slot,
      "request-id",
      {
        verification: verificationDependencies,
        verifyPayment,
        settleXrp,
        settleIssued,
      },
    );

    expect(result).toEqual({
      status: "verified",
      payment: issuedOutcome.payment,
      receipt: {
        receiptId: `testnet:${TXID}`,
        status: "recorded",
        network: "testnet",
        transactionId: TXID,
        invoiceId: INVOICE_ID,
        assetId: ASSET.id,
        recordedAt: "2026-06-25T04:00:01.000Z",
        verifiedPaymentDigest: VERIFIED_DIGEST,
        legacyProofDigest: null,
      },
    });
    expect(settleIssued).toHaveBeenCalledWith(
      database,
      slot,
      issuedOutcome.payment,
    );
    expect(settleXrp).not.toHaveBeenCalled();
  });

  it("returns pending outcomes without attempting settlement", async () => {
    const verifyPayment = vi.fn().mockResolvedValue({
      status: "pending",
      reason: "TRANSACTION_NOT_VALIDATED",
      transactionId: TXID,
      message: "Pending",
    });
    const settleXrp = vi.fn();
    const settleIssued = vi.fn();

    await expect(
      verifyAndSettleStoredSlotPayment(database, slot, "request-id", {
        verification: verificationDependencies,
        verifyPayment,
        settleXrp,
        settleIssued,
      }),
    ).resolves.toEqual({
      status: "pending",
      reason: "TRANSACTION_NOT_VALIDATED",
      transactionId: TXID,
      message: "Pending",
    });
    expect(settleXrp).not.toHaveBeenCalled();
    expect(settleIssued).not.toHaveBeenCalled();
  });
});
