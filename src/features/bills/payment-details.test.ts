import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "@/features/persistence/d1-types";

import { hashCapabilityToken } from "./capabilities";
import { loadPayablePaymentDetails } from "./payment-details";
import { PaymentSlotStateError } from "./payment-slot";

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
  destination_tag: 7,
  participant_label: "Alex",
  expected_payer_address: "rPayer",
  expected_amount_drops: "4000000",
  invoice_id: "B".repeat(64),
  slot_status: "unpaid",
  bill_status: "open",
  paid_tx_hash: null,
};

describe("loadPayablePaymentDetails", () => {
  it("returns the exact frozen fields without writing or exposing raw capability", async () => {
    const database = new Database(row);

    await expect(
      loadPayablePaymentDetails(database, token, 123456),
    ).resolves.toEqual({
      billTitle: "Dinner",
      participantLabel: "Alex",
      expectedPayerAddress: "rPayer",
      destinationAddress: "rDestination",
      destinationTag: 7,
      amountDrops: "4000000",
      sourceTag: 123456,
      invoiceId: "B".repeat(64),
      network: "testnet",
    });
    expect(database.statement?.values).toEqual([
      await hashCapabilityToken(token),
    ]);
    expect(database.statement?.values).not.toContain(token);
  });

  it("fails closed for an already-paid slot", async () => {
    await expect(
      loadPayablePaymentDetails(
        new Database({
          ...row,
          slot_status: "paid",
          bill_status: "settled",
          paid_tx_hash: "A".repeat(64),
        }),
        token,
        123456,
      ),
    ).rejects.toBeInstanceOf(PaymentSlotStateError);
  });
});
