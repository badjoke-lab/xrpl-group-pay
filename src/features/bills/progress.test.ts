import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "@/features/persistence/d1-types";

import { hashCapabilityToken } from "./capabilities";
import {
  BillProgressDatabaseError,
  BillProgressNotFoundError,
  loadBillProgressByToken,
} from "./progress";

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

class ProgressDatabase implements D1DatabaseLike {
  statements: Statement[] = [];

  constructor(
    readonly bill: Record<string, unknown> | null,
    readonly slots: Record<string, unknown>[],
    readonly success = true,
  ) {}

  prepare(query: string) {
    return new Statement(query);
  }

  async batch<Row = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<D1ResultLike<Row>[]> {
    this.statements = statements as Statement[];
    return [
      {
        success: this.success,
        results: this.bill ? ([this.bill] as Row[]) : [],
      },
      { success: this.success, results: this.slots as Row[] },
    ];
  }
}

const TOKEN = "a".repeat(64);
const BILL_PUBLIC_ID = "00000000-0000-4000-8000-000000000001";

function bill(access: "public" | "admin") {
  return {
    id: "bill-1",
    public_id: BILL_PUBLIC_ID,
    title: "XRPL Meetup Dinner",
    network: "testnet",
    destination_address: "rDestination",
    destination_tag: 7,
    total_drops: "10000000",
    creator_share_drops: "2000000",
    status: "partially_paid",
    revision: 1,
    frozen_at: "2026-06-24T00:00:00.000Z",
    updated_at: "2026-06-24T00:05:00.000Z",
    access_role: access,
  };
}

const slots = [
  {
    public_id: "00000000-0000-4000-8000-000000000002",
    participant_label: "Alex",
    expected_payer_address: "rAlex",
    expected_amount_drops: "3000000",
    invoice_id: "A".repeat(64),
    status: "paid",
    paid_tx_hash: "C".repeat(64),
    paid_ledger_index: 12345,
    paid_at: "2026-06-24T00:05:00.000Z",
    updated_at: "2026-06-24T00:05:00.000Z",
  },
  {
    public_id: "00000000-0000-4000-8000-000000000003",
    participant_label: "Blair",
    expected_payer_address: "rBlair",
    expected_amount_drops: "5000000",
    invoice_id: "B".repeat(64),
    status: "needs_review",
    paid_tx_hash: null,
    paid_ledger_index: null,
    paid_at: null,
    updated_at: "2026-06-24T00:04:00.000Z",
  },
];

describe("loadBillProgressByToken", () => {
  it("returns full participant details for the management capability", async () => {
    const database = new ProgressDatabase(bill("admin"), slots);
    const progress = await loadBillProgressByToken(database, TOKEN);

    expect(progress).toMatchObject({
      access: "admin",
      bill: {
        publicId: BILL_PUBLIC_ID,
        status: "partially_paid",
      },
      summary: {
        participantCount: 2,
        paidCount: 1,
        pendingCount: 0,
        reviewCount: 1,
        expectedExternalDrops: "8000000",
        paidDrops: "3000000",
      },
      slots: [
        {
          participantLabel: "Alex",
          expectedPayerAddress: "rAlex",
          invoiceId: "A".repeat(64),
          paidTransactionId: "C".repeat(64),
        },
      ],
    });

    const expectedHash = await hashCapabilityToken(TOKEN);
    expect(database.statements).toHaveLength(2);
    expect(database.statements[0].values).toEqual([expectedHash]);
    expect(database.statements[1].values).toEqual([expectedHash]);
    expect(database.statements[0].values).not.toContain(TOKEN);
  });

  it("redacts private participant details for the read-only capability", async () => {
    const progress = await loadBillProgressByToken(
      new ProgressDatabase(bill("public"), slots),
      TOKEN,
    );

    expect(progress.access).toBe("public");
    expect(progress.slots[0]).toMatchObject({
      participantLabel: null,
      expectedPayerAddress: null,
      invoiceId: null,
      expectedAmountDrops: "3000000",
      status: "paid",
      paidTransactionId: "C".repeat(64),
    });
    expect(progress.slots[1]).toMatchObject({
      participantLabel: null,
      expectedPayerAddress: null,
      invoiceId: null,
      status: "needs_review",
    });
  });

  it("returns one not-found boundary for malformed and unknown capabilities", async () => {
    await expect(
      loadBillProgressByToken(new ProgressDatabase(bill("admin"), slots), "bad"),
    ).rejects.toBeInstanceOf(BillProgressNotFoundError);
    await expect(
      loadBillProgressByToken(new ProgressDatabase(null, []), TOKEN),
    ).rejects.toBeInstanceOf(BillProgressNotFoundError);
  });

  it("fails closed when D1 cannot return a complete snapshot", async () => {
    await expect(
      loadBillProgressByToken(
        new ProgressDatabase(bill("admin"), slots, false),
        TOKEN,
      ),
    ).rejects.toBeInstanceOf(BillProgressDatabaseError);
    await expect(
      loadBillProgressByToken(
        new ProgressDatabase(bill("admin"), [
          { ...slots[0], expected_amount_drops: "invalid" },
        ]),
        TOKEN,
      ),
    ).rejects.toBeInstanceOf(BillProgressDatabaseError);
  });
});
