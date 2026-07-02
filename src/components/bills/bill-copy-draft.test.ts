import { describe, expect, it } from "vitest";

import { getXrpAssetDescriptor } from "@/features/assets/registry";
import type { BillProgress } from "@/features/bills/progress";

import { billProgressToCopyDraft, BillCopyDraftError } from "./bill-copy-draft";
import { billDraftToInput } from "./bill-form-model";

const BILL_ID = "00000000-0000-4000-8000-000000000001";
const SLOT_ONE = "00000000-0000-4000-8000-000000000002";
const SLOT_TWO = "00000000-0000-4000-8000-000000000003";
const INVOICE_ONE = "A".repeat(64);
const INVOICE_TWO = "B".repeat(64);
const asset = getXrpAssetDescriptor("testnet");

function progress(access: "admin" | "public" = "admin"): BillProgress {
  const admin = access === "admin";
  return {
    access,
    bill: {
      publicId: BILL_ID,
      title: "XRPL Dinner",
      network: "testnet",
      paymentMode: "representative",
      recipientLabel: admin ? "Dinner host" : null,
      destinationAddress: "rDestination",
      destinationTag: 7,
      asset,
      totalAmount: { code: "XRP", units: "10000000", scale: 6 },
      recipientFundedAmount: { code: "XRP", units: "2000000", scale: 6 },
      creatorShareAmount: { code: "XRP", units: "2000000", scale: 6 },
      totalDrops: "10000000",
      recipientFundedDrops: "2000000",
      creatorShareDrops: "2000000",
      status: "partially_paid",
      closureState: "active",
      revision: 1,
      frozenAt: "2026-07-03T00:00:00.000Z",
      updatedAt: "2026-07-03T00:05:00.000Z",
    },
    summary: {
      participantCount: 2,
      paidCount: 1,
      remainingCount: 1,
      pendingCount: 1,
      reviewCount: 0,
      expectedExternalAmount: { code: "XRP", units: "8000000", scale: 6 },
      paidAmount: { code: "XRP", units: "3000000", scale: 6 },
      remainingAmount: { code: "XRP", units: "5000000", scale: 6 },
      expectedExternalDrops: "8000000",
      paidDrops: "3000000",
      remainingDrops: "5000000",
    },
    slots: [
      {
        publicId: SLOT_ONE,
        participantLabel: admin ? "Alex" : null,
        expectedPayerAddress: admin ? "rAlex" : null,
        asset,
        expectedAmount: { code: "XRP", units: "3000000", scale: 6 },
        expectedAmountDrops: "3000000",
        invoiceId: admin ? INVOICE_ONE : null,
        status: "paid",
        reviewReasonCode: null,
        paidTransactionId: "C".repeat(64),
        paidLedgerIndex: 12345,
        paidAt: "2026-07-03T00:05:00.000Z",
        proofToken: "D".repeat(64),
        updatedAt: "2026-07-03T00:05:00.000Z",
      },
      {
        publicId: SLOT_TWO,
        participantLabel: admin ? "Blair" : null,
        expectedPayerAddress: admin ? "rBlair" : null,
        asset,
        expectedAmount: { code: "XRP", units: "5000000", scale: 6 },
        expectedAmountDrops: "5000000",
        invoiceId: admin ? INVOICE_TWO : null,
        status: "unpaid",
        reviewReasonCode: null,
        paidTransactionId: null,
        paidLedgerIndex: null,
        paidAt: null,
        proofToken: null,
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    ],
  };
}

describe("billProgressToCopyDraft", () => {
  it("copies editable facts and final allocations into a custom browser draft", () => {
    const ids = ["copy-payer-1", "copy-payer-2"];
    const draft = billProgressToCopyDraft(progress(), () => ids.shift() ?? "unused");

    expect(draft).toMatchObject({
      paymentMode: "representative",
      recipientLabel: "Dinner host",
      recipientFundedEnabled: true,
      recipientFundedAmount: "2",
      title: "XRPL Dinner",
      destinationAddress: "rDestination",
      destinationTag: "7",
      settlementAssetId: "xrpl:testnet:xrp",
      totalAmount: "10",
      allocationStrategy: "custom",
      participants: [
        {
          id: "copy-payer-1",
          label: "Alex",
          expectedPayerAddress: "rAlex",
          amount: "3",
        },
        {
          id: "copy-payer-2",
          label: "Blair",
          expectedPayerAddress: "rBlair",
          amount: "5",
        },
      ],
    });
  });

  it("does not copy Bill, PaymentSlot, InvoiceID, transaction, proof, or capability identities", () => {
    const draft = billProgressToCopyDraft(progress(), () => crypto.randomUUID());
    const input = billDraftToInput({
      draft,
      includeRemainder: false,
    });
    const serialized = JSON.stringify({ draft, input });

    for (const forbidden of [
      BILL_ID,
      SLOT_ONE,
      SLOT_TWO,
      INVOICE_ONE,
      INVOICE_TWO,
      "C".repeat(64),
      "D".repeat(64),
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(new Set(draft.participants.map((item) => item.id)).size).toBe(2);
  });

  it("rejects a redacted read-only progress snapshot", () => {
    expect(() => billProgressToCopyDraft(progress("public"))).toThrow(
      BillCopyDraftError,
    );
  });
});
