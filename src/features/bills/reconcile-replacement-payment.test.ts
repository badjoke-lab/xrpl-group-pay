import { describe, expect, it, vi } from "vitest";

import { getXrpAssetDescriptor } from "@/features/assets/registry";
import {
  XrplAccountHistoryUnavailableError,
  type AccountTransactionSearchResult,
} from "@/features/xrpl/account-transaction-client";
import type { XrplTxResult } from "@/features/xrpl/schemas";

import {
  PaymentSlotStateError,
  type ResolvedPaymentSlot,
} from "./payment-slot";
import {
  PaymentReconciliationReviewRequiredError,
  PaymentReconciliationUnavailableError,
  reconcileReplacementPayment,
} from "./reconcile-replacement-payment";
import type { markReconciliationNeedsReview } from "./reconciliation-review-store";
import type { settleVerifiedPaymentSlot } from "./settle-slot";

const PAYER = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const DESTINATION = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const INVOICE = "AB".repeat(32);
const SOURCE_TAG = 2171267705;

const slot: ResolvedPaymentSlot = {
  slotId: "slot-1",
  slotPublicId: "00000000-0000-4000-8000-000000000001",
  billId: "bill-1",
  billPublicId: "00000000-0000-4000-8000-000000000002",
  billTitle: "Dinner",
  network: "mainnet",
  destinationAddress: DESTINATION,
  destinationTag: null,
  participantLabel: "Alex",
  expectedPayerAddress: PAYER,
  expectedAmountDrops: "1",
  asset: getXrpAssetDescriptor("mainnet"),
  expectedAmount: { code: "XRP", units: "1", scale: 6 },
  invoiceId: INVOICE,
  slotStatus: "expired",
  billStatus: "open",
  paidTransactionId: null,
};

function payment(hash: string, overrides: Partial<XrplTxResult["tx_json"]> = {}): XrplTxResult {
  return {
    hash,
    validated: true,
    ledger_index: 105,
    tx_json: {
      TransactionType: "Payment",
      Account: PAYER,
      Destination: DESTINATION,
      Amount: "1",
      SourceTag: SOURCE_TAG,
      InvoiceID: INVOICE,
      ...overrides,
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      delivered_amount: "1",
    },
  };
}

function search(transactions: XrplTxResult[]): AccountTransactionSearchResult {
  return {
    transactions,
    reviewedLedgerMin: 1,
    reviewedLedgerMax: 200,
    pages: 1,
  };
}

const database = {} as never;

describe("replacement payment reconciliation", () => {
  it("allows replacement when no exact validated payment matches", async () => {
    const settleXrp = vi.fn();
    await expect(
      reconcileReplacementPayment(database, slot, {
        sourceTag: SOURCE_TAG,
        findTransactions: async () =>
          search([
            payment("A".repeat(64), { Destination: PAYER }),
            payment("B".repeat(64), { Amount: "2" }),
          ]),
        settleXrp: settleXrp as unknown as typeof settleVerifiedPaymentSlot,
        now: () => new Date("2026-06-29T00:00:00.000Z"),
      }),
    ).resolves.toBeUndefined();
    expect(settleXrp).not.toHaveBeenCalled();
  });

  it("settles one exact validated payment and refuses a replacement handoff", async () => {
    const settleXrp = vi.fn().mockResolvedValue({});
    const action = reconcileReplacementPayment(database, slot, {
      sourceTag: SOURCE_TAG,
      findTransactions: async () => search([payment("C".repeat(64))]),
      settleXrp: settleXrp as unknown as typeof settleVerifiedPaymentSlot,
      now: () => new Date("2026-06-29T00:00:00.000Z"),
    });

    await expect(action).rejects.toMatchObject({
      name: PaymentSlotStateError.name,
      code: "SLOT_ALREADY_PAID",
    });
    expect(settleXrp).toHaveBeenCalledTimes(1);
  });

  it("moves the slot to review when multiple exact payments are validated", async () => {
    const markNeedsReview = vi.fn().mockResolvedValue(undefined);
    const settleXrp = vi.fn();
    const action = reconcileReplacementPayment(database, slot, {
      sourceTag: SOURCE_TAG,
      findTransactions: async () =>
        search([payment("D".repeat(64)), payment("E".repeat(64))]),
      settleXrp: settleXrp as unknown as typeof settleVerifiedPaymentSlot,
      markNeedsReview:
        markNeedsReview as unknown as typeof markReconciliationNeedsReview,
      now: () => new Date("2026-06-29T00:00:00.000Z"),
    });

    await expect(action).rejects.toBeInstanceOf(
      PaymentReconciliationReviewRequiredError,
    );
    expect(settleXrp).not.toHaveBeenCalled();
    expect(markNeedsReview).toHaveBeenCalledWith(
      database,
      slot,
      expect.objectContaining({
        transactionIds: ["D".repeat(64), "E".repeat(64)],
        reviewedLedgerMin: 1,
        reviewedLedgerMax: 200,
      }),
    );
  });

  it("fails closed when validated history cannot be read", async () => {
    await expect(
      reconcileReplacementPayment(database, slot, {
        sourceTag: SOURCE_TAG,
        findTransactions: async () => {
          throw new XrplAccountHistoryUnavailableError("mainnet");
        },
      }),
    ).rejects.toBeInstanceOf(PaymentReconciliationUnavailableError);
  });
});
