import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "@/features/persistence/d1-types";

import { hashCapabilityToken } from "./capabilities";
import {
  loadPaymentSlotByToken,
  PaymentSlotNotFoundError,
  PaymentSlotStateError,
  requirePayableSlot,
  type ResolvedPaymentSlot,
} from "./payment-slot";

class Statement implements D1PreparedStatementLike {
  constructor(
    readonly row: Record<string, unknown> | null,
    readonly onBind: (statement: Statement) => void,
    readonly values: D1ValueLike[] = [],
  ) {}

  bind(...values: D1ValueLike[]) {
    const bound = new Statement(this.row, this.onBind, values);
    this.onBind(bound);
    return bound;
  }

  async first<Row = Record<string, unknown>>() {
    return this.row as Row | null;
  }

  async run<Row = Record<string, unknown>>(): Promise<D1ResultLike<Row>> {
    return { success: true };
  }
}

class Database implements D1DatabaseLike {
  statement: Statement | null = null;

  constructor(readonly row: Record<string, unknown> | null) {}

  prepare() {
    const statement = new Statement(this.row, (bound) => {
      this.statement = bound;
    });
    this.statement = statement;
    return statement;
  }

  async batch<Row = Record<string, unknown>>() {
    return [] as D1ResultLike<Row>[];
  }
}

const token = "a".repeat(64);
const row = {
  slot_id: "slot-1",
  slot_public_id: "00000000-0000-4000-8000-000000000001",
  bill_id: "bill-1",
  bill_public_id: "00000000-0000-4000-8000-000000000002",
  bill_title: "Dinner",
  network: "testnet",
  destination_address: "rDestination",
  destination_tag: null,
  participant_label: "Alex",
  expected_payer_address: "rPayer",
  expected_amount_drops: "1000000",
  invoice_id: "B".repeat(64),
  slot_status: "unpaid",
  bill_status: "open",
  paid_tx_hash: null,
};

const payable: ResolvedPaymentSlot = {
  slotId: "slot-1",
  slotPublicId: row.slot_public_id,
  billId: "bill-1",
  billPublicId: row.bill_public_id,
  billTitle: "Dinner",
  network: "testnet",
  destinationAddress: "rDestination",
  destinationTag: null,
  participantLabel: null,
  expectedPayerAddress: "rPayer",
  expectedAmountDrops: "1",
  invoiceId: "B".repeat(64),
  slotStatus: "unpaid",
  billStatus: "open",
  paidTransactionId: null,
};

describe("payment slot capabilities", () => {
  it("loads a slot with the token hash rather than the raw capability", async () => {
    const database = new Database(row);
    const slot = await loadPaymentSlotByToken(database, token);

    expect(slot).toMatchObject({
      slotId: "slot-1",
      billTitle: "Dinner",
      expectedAmountDrops: "1000000",
      slotStatus: "unpaid",
    });
    expect(database.statement?.values).toEqual([
      await hashCapabilityToken(token),
    ]);
    expect(database.statement?.values).not.toContain(token);
  });

  it("uses one uniform not-found result for malformed and unknown tokens", async () => {
    await expect(
      loadPaymentSlotByToken(new Database(null), token),
    ).rejects.toBeInstanceOf(PaymentSlotNotFoundError);
    await expect(
      loadPaymentSlotByToken(new Database(row), "invalid"),
    ).rejects.toBeInstanceOf(PaymentSlotNotFoundError);
  });

  it("allows retryable slot states while the bill remains payable", () => {
    expect(requirePayableSlot(payable)).toBe(payable);
    for (const slotStatus of [
      "payload_created",
      "awaiting_signature",
      "rejected",
      "expired",
      "verification_failed",
    ] as const) {
      expect(requirePayableSlot({ ...payable, slotStatus })).toMatchObject({
        slotStatus,
      });
    }
  });

  it("rejects paid, in-flight, review, and non-payable bill states", () => {
    expect(() =>
      requirePayableSlot({
        ...payable,
        slotStatus: "paid",
        paidTransactionId: "A".repeat(64),
      }),
    ).toThrow(PaymentSlotStateError);

    for (const slotStatus of ["submitted", "validating", "needs_review"] as const) {
      expect(() => requirePayableSlot({ ...payable, slotStatus })).toThrow(
        PaymentSlotStateError,
      );
    }

    expect(() =>
      requirePayableSlot({ ...payable, billStatus: "settled" }),
    ).toThrow(PaymentSlotStateError);
    expect(() =>
      requirePayableSlot({ ...payable, billStatus: "needs_review" }),
    ).toThrow(PaymentSlotStateError);
  });
});
