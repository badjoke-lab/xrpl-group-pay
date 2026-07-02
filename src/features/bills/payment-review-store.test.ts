import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "@/features/persistence/d1-types";

import type { ResolvedPaymentSlot } from "./payment-slot";
import {
  markPaymentSlotNeedsReview,
  PaymentReviewPersistenceError,
} from "./payment-review-store";

class Statement implements D1PreparedStatementLike {
  constructor(
    readonly query: string,
    readonly values: D1ValueLike[] = [],
  ) {}

  bind(...values: D1ValueLike[]) {
    return new Statement(this.query, values);
  }

  async first<Row = Record<string, unknown>>() {
    return null as Row | null;
  }

  async run<Row = Record<string, unknown>>(): Promise<D1ResultLike<Row>> {
    return { success: true };
  }
}

class Database implements D1DatabaseLike {
  statements: Statement[] = [];

  constructor(readonly results: D1ResultLike[] = [
    { success: true, meta: { changes: 1 } },
    { success: true, meta: { changes: 1 } },
  ]) {}

  prepare(query: string) {
    return new Statement(query);
  }

  async batch<Row = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<D1ResultLike<Row>[]> {
    this.statements = statements as Statement[];
    return this.results as D1ResultLike<Row>[];
  }
}

const slot: ResolvedPaymentSlot = {
  slotId: "slot-1",
  slotPublicId: "00000000-0000-4000-8000-000000000001",
  billId: "bill-1",
  billPublicId: "00000000-0000-4000-8000-000000000002",
  billTitle: "Dinner",
  network: "testnet",
  destinationAddress: "rDestination",
  destinationTag: null,
  participantLabel: "Alex",
  expectedPayerAddress: "rSender",
  expectedAmountDrops: "1000000",
  invoiceId: "A".repeat(64),
  slotStatus: "validating",
  billStatus: "open",
  paidTransactionId: null,
};

describe("markPaymentSlotNeedsReview", () => {
  it("stores normalized observed facts and moves the Bill and slot to review", async () => {
    const database = new Database();
    await markPaymentSlotNeedsReview(
      database,
      slot,
      {
        kind: "verification_mismatch",
        transactionId: "b".repeat(64),
        reasonCode: "WRONG_DESTINATION",
        message: "Observed destination differs.",
      },
      new Date("2026-07-03T00:00:00.000Z"),
    );

    expect(database.statements).toHaveLength(2);
    expect(database.statements[0].query).toContain("status = 'needs_review'");
    expect(database.statements[1].query).toContain("closure_state = 'active'");
    const stored = JSON.parse(String(database.statements[0].values[1])) as {
      transactionId: string;
      observedAt: string;
    };
    expect(stored.transactionId).toBe("B".repeat(64));
    expect(stored.observedAt).toBe("2026-07-03T00:00:00.000Z");
  });

  it("fails closed when either review update is incomplete", async () => {
    const database = new Database([
      { success: true, meta: { changes: 1 } },
      { success: true, meta: { changes: 0 } },
    ]);
    await expect(
      markPaymentSlotNeedsReview(database, slot, {
        kind: "verification_mismatch",
        transactionId: "B".repeat(64),
        reasonCode: "WRONG_DESTINATION",
        message: "Observed destination differs.",
      }),
    ).rejects.toBeInstanceOf(PaymentReviewPersistenceError);
  });
});
