import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "@/features/persistence/d1-types";

import {
  authorizeReviewedSlotRetry,
  BillRecoveryStateError,
  closeBillIncomplete,
} from "./bill-recovery-management";

const TOKEN = "ab".repeat(32);
const BILL_PUBLIC_ID = "00000000-0000-4000-8000-000000000001";
const SLOT_PUBLIC_ID = "00000000-0000-4000-8000-000000000002";
const SECOND_SLOT_PUBLIC_ID = "00000000-0000-4000-8000-000000000003";
const TX = "C".repeat(64);
const PROOF = "D".repeat(64);

class Statement implements D1PreparedStatementLike {
  constructor(
    readonly database: ScriptedDatabase,
    readonly query: string,
    readonly values: D1ValueLike[] = [],
  ) {}

  bind(...values: D1ValueLike[]) {
    return new Statement(this.database, this.query, values);
  }

  async first<Row = Record<string, unknown>>() {
    this.database.firstStatements.push(this);
    return (this.database.firstRows.shift() ?? null) as Row | null;
  }

  async run<Row = Record<string, unknown>>(): Promise<D1ResultLike<Row>> {
    return { success: true };
  }
}

class ScriptedDatabase implements D1DatabaseLike {
  firstRows: Array<Record<string, unknown> | null> = [];
  batchRows: D1ResultLike[][] = [];
  firstStatements: Statement[] = [];
  batches: Statement[][] = [];

  prepare(query: string) {
    return new Statement(this, query);
  }

  async batch<Row = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<D1ResultLike<Row>[]> {
    this.batches.push(statements as Statement[]);
    return (this.batchRows.shift() ?? []) as D1ResultLike<Row>[];
  }
}

function billActionRow(
  status: "open" | "partially_paid" | "settled" | "needs_review" | "closed_incomplete" = "needs_review",
  closure: "active" | "closed_incomplete" = "active",
) {
  return {
    id: "bill-1",
    public_id: BILL_PUBLIC_ID,
    status,
    closure_state: closure,
  };
}

function slotActionRow(status: "needs_review" | "verification_failed" = "needs_review") {
  return {
    id: "slot-1",
    public_id: SLOT_PUBLIC_ID,
    status,
    review_reason_code: "WRONG_DESTINATION",
    review_details_json: JSON.stringify({
      kind: "verification_mismatch",
      transactionId: TX,
      reasonCode: "WRONG_DESTINATION",
      message: "Observed destination does not match.",
      observedAt: "2026-07-02T00:00:00.000Z",
    }),
    retry_authorized_at: null,
    retry_authorization_json: null,
  };
}

function progressBill(
  status: "open" | "closed_incomplete",
  closure: "active" | "closed_incomplete",
) {
  return {
    id: "bill-1",
    public_id: BILL_PUBLIC_ID,
    title: "Dinner",
    network: "testnet",
    payment_mode: "representative",
    recipient_label: "Host",
    destination_address: "rDestination",
    destination_tag: null,
    total_drops: "10000000",
    creator_share_drops: "2000000",
    settlement_asset_id: "xrpl:testnet:xrp",
    total_amount_units: "10000000",
    creator_share_amount_units: "2000000",
    recipient_funded_amount_units: "2000000",
    closure_state: closure,
    status,
    revision: 1,
    frozen_at: "2026-07-02T00:00:00.000Z",
    updated_at: "2026-07-02T00:10:00.000Z",
    access_role: "admin",
  };
}

function progressSlots(firstStatus: "unpaid" | "paid" = "unpaid") {
  return [
    {
      public_id: SLOT_PUBLIC_ID,
      participant_label: "Alex",
      expected_payer_address: "rAlex",
      expected_amount_drops: "3000000",
      asset_id: "xrpl:testnet:xrp",
      expected_amount_units: "3000000",
      invoice_id: "A".repeat(64),
      status: firstStatus,
      review_reason_code: "WRONG_DESTINATION",
      paid_tx_hash: firstStatus === "paid" ? TX : null,
      paid_ledger_index: firstStatus === "paid" ? 12345 : null,
      paid_at: firstStatus === "paid" ? "2026-07-02T00:05:00.000Z" : null,
      proof_digest: firstStatus === "paid" ? PROOF : null,
      updated_at: "2026-07-02T00:05:00.000Z",
    },
    {
      public_id: SECOND_SLOT_PUBLIC_ID,
      participant_label: "Blair",
      expected_payer_address: "rBlair",
      expected_amount_drops: "5000000",
      asset_id: "xrpl:testnet:xrp",
      expected_amount_units: "5000000",
      invoice_id: "B".repeat(64),
      status: firstStatus === "paid" ? "unpaid" : "paid",
      review_reason_code: null,
      paid_tx_hash: firstStatus === "paid" ? null : TX,
      paid_ledger_index: firstStatus === "paid" ? null : 12345,
      paid_at: firstStatus === "paid" ? null : "2026-07-02T00:05:00.000Z",
      proof_digest: firstStatus === "paid" ? null : PROOF,
      updated_at: "2026-07-02T00:05:00.000Z",
    },
  ];
}

function reviewRow(status: "unpaid" | "needs_review", authorizedAt: string | null) {
  return {
    public_id: SLOT_PUBLIC_ID,
    status,
    review_reason_code: "WRONG_DESTINATION",
    review_details_json: slotActionRow().review_details_json,
    retry_authorized_at: authorizedAt,
  };
}

function success(changes = 1): D1ResultLike {
  return { success: true, meta: { changes } };
}

describe("authorizeReviewedSlotRetry", () => {
  it("requires both repeated-payment acknowledgements before touching storage", async () => {
    const database = new ScriptedDatabase();
    await expect(
      authorizeReviewedSlotRetry(database, {
        adminToken: TOKEN,
        slotPublicId: SLOT_PUBLIC_ID,
        acknowledgePossiblePriorPayment: true,
        acknowledgeDoublePaymentRisk: false,
      }),
    ).rejects.toMatchObject({ code: "RETRY_CONFIRMATION_REQUIRED" });
    expect(database.firstStatements).toHaveLength(0);
    expect(database.batches).toHaveLength(0);
  });

  it("records explicit authorization, returns the slot to unpaid, and recomputes Bill status", async () => {
    const database = new ScriptedDatabase();
    database.firstRows.push(billActionRow(), slotActionRow());
    database.batchRows.push(
      [success(), success(), success()],
      [
        { success: true, results: [progressBill("open", "active")] },
        { success: true, results: progressSlots("unpaid") },
      ],
      [
        {
          success: true,
          results: [reviewRow("unpaid", "2026-07-02T00:10:00.000Z")],
        },
      ],
    );

    const result = await authorizeReviewedSlotRetry(
      database,
      {
        adminToken: TOKEN,
        slotPublicId: SLOT_PUBLIC_ID,
        acknowledgePossiblePriorPayment: true,
        acknowledgeDoublePaymentRisk: true,
      },
      new Date("2026-07-02T00:10:00.000Z"),
    );

    expect(result.progress.bill.status).toBe("open");
    expect(result.reviews[0]).toMatchObject({
      slotPublicId: SLOT_PUBLIC_ID,
      status: "unpaid",
      retryAuthorizedAt: "2026-07-02T00:10:00.000Z",
    });
    expect(database.batches[0][0].query).toContain("bill_management_actions");
    expect(database.batches[0][1].query).toContain("status = 'unpaid'");
    expect(database.batches[0][2].query).toContain("RECOMPUTE_BILL_STATUS".replace("RECOMPUTE_BILL_STATUS", "status = CASE"));
    expect(database.batches[0][1].values).toContain("slot-1");
  });

  it("does not authorize retry after settlement or closure", async () => {
    const settled = new ScriptedDatabase();
    settled.firstRows.push(billActionRow("settled", "active"));
    await expect(
      authorizeReviewedSlotRetry(settled, {
        adminToken: TOKEN,
        slotPublicId: SLOT_PUBLIC_ID,
        acknowledgePossiblePriorPayment: true,
        acknowledgeDoublePaymentRisk: true,
      }),
    ).rejects.toMatchObject({ code: "BILL_ALREADY_SETTLED" });

    const closed = new ScriptedDatabase();
    closed.firstRows.push(billActionRow("closed_incomplete", "closed_incomplete"));
    await expect(
      authorizeReviewedSlotRetry(closed, {
        adminToken: TOKEN,
        slotPublicId: SLOT_PUBLIC_ID,
        acknowledgePossiblePriorPayment: true,
        acknowledgeDoublePaymentRisk: true,
      }),
    ).rejects.toBeInstanceOf(BillRecoveryStateError);
  });
});

describe("closeBillIncomplete", () => {
  it("requires exact typed confirmation and both closure acknowledgements", async () => {
    const database = new ScriptedDatabase();
    await expect(
      closeBillIncomplete(database, {
        adminToken: TOKEN,
        reasonCode: "collection_ended",
        confirmation: "CLOSE_INCOMPLETE",
        acknowledgeStopsPayments: true,
        acknowledgeNoAutomaticRefunds: false,
      }),
    ).rejects.toMatchObject({ code: "CLOSURE_CONFIRMATION_REQUIRED" });
    expect(database.batches).toHaveLength(0);
  });

  it("closes incomplete, preserves verified facts, and exposes unpaid totals", async () => {
    const database = new ScriptedDatabase();
    database.firstRows.push(billActionRow("partially_paid", "active"));
    database.batchRows.push(
      [success(), success(), success()],
      [
        {
          success: true,
          results: [progressBill("closed_incomplete", "closed_incomplete")],
        },
        { success: true, results: progressSlots("paid") },
      ],
      [{ success: true, results: [] }],
    );

    const result = await closeBillIncomplete(
      database,
      {
        adminToken: TOKEN,
        reasonCode: "collection_ended",
        confirmation: "CLOSE_INCOMPLETE",
        acknowledgeStopsPayments: true,
        acknowledgeNoAutomaticRefunds: true,
      },
      new Date("2026-07-02T00:10:00.000Z"),
    );

    expect(result.progress.bill).toMatchObject({
      status: "closed_incomplete",
      closureState: "closed_incomplete",
    });
    expect(result.progress.summary).toMatchObject({
      paidCount: 1,
      paidAmount: { units: "3000000" },
      remainingAmount: { units: "5000000" },
    });
    expect(database.batches[0][1].query).toContain("closure_state = 'closed_incomplete'");
    expect(database.batches[0][2].query).toContain("status <> 'paid'");
    expect(database.batches[0].some((statement) => statement.query.includes("paid_tx_hash = NULL"))).toBe(false);
  });
});
