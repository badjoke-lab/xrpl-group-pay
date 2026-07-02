import { describe, expect, it } from "vitest";

import {
  getRlusdAssetDescriptor,
  getXrpAssetDescriptor,
} from "@/features/assets/registry";
import type { XrplNetwork } from "@/features/assets/types";
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
const PROOF_TOKEN = "D".repeat(64);

function bill(
  access: "public" | "admin",
  network: XrplNetwork = "testnet",
  assetId = getXrpAssetDescriptor(network).id,
  paymentMode: "representative" | "direct" = "representative",
) {
  const recipientFunded = paymentMode === "representative" ? "2000000" : "0";
  return {
    id: "bill-1",
    public_id: BILL_PUBLIC_ID,
    title: "XRPL Meetup Dinner",
    network,
    payment_mode: paymentMode,
    recipient_label: "Dinner host",
    destination_address: "rDestination",
    destination_tag: 7,
    total_drops: "10000000",
    creator_share_drops: recipientFunded,
    settlement_asset_id: assetId,
    total_amount_units: "10000000",
    creator_share_amount_units: recipientFunded,
    recipient_funded_amount_units: recipientFunded,
    closure_state: "active",
    status: "partially_paid",
    revision: 1,
    frozen_at: "2026-06-24T00:00:00.000Z",
    updated_at: "2026-06-24T00:05:00.000Z",
    access_role: access,
  };
}

function slots(
  network: XrplNetwork = "testnet",
  assetId?: string,
  paymentMode: "representative" | "direct" = "representative",
) {
  const resolvedAssetId = assetId ?? getXrpAssetDescriptor(network).id;
  const secondAmount = paymentMode === "representative" ? "5000000" : "7000000";
  return [
    {
      public_id: "00000000-0000-4000-8000-000000000002",
      participant_label: "Alex",
      expected_payer_address: "rAlex",
      expected_amount_drops: "3000000",
      asset_id: resolvedAssetId,
      expected_amount_units: "3000000",
      invoice_id: "A".repeat(64),
      status: "paid",
      review_reason_code: null,
      paid_tx_hash: "C".repeat(64),
      paid_ledger_index: 12345,
      paid_at: "2026-06-24T00:05:00.000Z",
      proof_digest: resolvedAssetId.endsWith(":xrp") ? PROOF_TOKEN : null,
      updated_at: "2026-06-24T00:05:00.000Z",
    },
    {
      public_id: "00000000-0000-4000-8000-000000000003",
      participant_label: "Blair",
      expected_payer_address: "rBlair",
      expected_amount_drops: secondAmount,
      asset_id: resolvedAssetId,
      expected_amount_units: secondAmount,
      invoice_id: "B".repeat(64),
      status: "needs_review",
      review_reason_code: "WRONG_DESTINATION",
      paid_tx_hash: null,
      paid_ledger_index: null,
      paid_at: null,
      proof_digest: null,
      updated_at: "2026-06-24T00:04:00.000Z",
    },
  ];
}

describe("loadBillProgressByToken", () => {
  it("returns mode-aware progress, recovery facts, and proof tokens for management", async () => {
    const database = new ProgressDatabase(bill("admin"), slots());
    const progress = await loadBillProgressByToken(database, TOKEN);

    expect(progress).toMatchObject({
      access: "admin",
      bill: {
        publicId: BILL_PUBLIC_ID,
        network: "testnet",
        paymentMode: "representative",
        recipientLabel: "Dinner host",
        asset: { id: "xrpl:testnet:xrp" },
        totalAmount: { code: "XRP", units: "10000000", scale: 6 },
        recipientFundedAmount: {
          code: "XRP",
          units: "2000000",
          scale: 6,
        },
        status: "partially_paid",
        closureState: "active",
      },
      summary: {
        participantCount: 2,
        paidCount: 1,
        remainingCount: 1,
        pendingCount: 0,
        reviewCount: 1,
        expectedExternalAmount: { code: "XRP", units: "8000000", scale: 6 },
        paidAmount: { code: "XRP", units: "3000000", scale: 6 },
        remainingAmount: { code: "XRP", units: "5000000", scale: 6 },
        expectedExternalDrops: "8000000",
        paidDrops: "3000000",
        remainingDrops: "5000000",
      },
      slots: [
        {
          participantLabel: "Alex",
          expectedPayerAddress: "rAlex",
          expectedAmount: { code: "XRP", units: "3000000", scale: 6 },
          invoiceId: "A".repeat(64),
          paidTransactionId: "C".repeat(64),
          reviewReasonCode: null,
          proofToken: PROOF_TOKEN,
        },
        {
          participantLabel: "Blair",
          expectedPayerAddress: "rBlair",
          invoiceId: "B".repeat(64),
          status: "needs_review",
          reviewReasonCode: "WRONG_DESTINATION",
          proofToken: null,
        },
      ],
    });

    const expectedHash = await hashCapabilityToken(TOKEN);
    expect(database.statements).toHaveLength(2);
    expect(database.statements[0].values).toEqual([expectedHash]);
    expect(database.statements[1].values).toEqual([expectedHash]);
    expect(database.statements[0].values).not.toContain(TOKEN);
    expect(database.statements[1].query).toContain(
      "records.network = bill.network",
    );
    expect(database.statements[1].query).not.toContain(
      "records.network = 'testnet'",
    );
    expect(database.statements[0].query).toContain("payment_mode");
    expect(database.statements[1].query).toContain("review_reason_code");
  });

  it("uses the full Bill total as the direct-mode payer collection total", async () => {
    const progress = await loadBillProgressByToken(
      new ProgressDatabase(
        bill("admin", "testnet", undefined, "direct"),
        slots("testnet", undefined, "direct"),
      ),
      TOKEN,
    );

    expect(progress.bill).toMatchObject({
      paymentMode: "direct",
      recipientFundedAmount: { units: "0" },
      totalAmount: { units: "10000000" },
    });
    expect(progress.summary).toMatchObject({
      expectedExternalAmount: { units: "10000000" },
      paidAmount: { units: "3000000" },
      remainingAmount: { units: "7000000" },
    });
  });

  it("loads Mainnet XRP progress from the Bill network", async () => {
    const network = "mainnet" as const;
    const asset = getXrpAssetDescriptor(network);
    const progress = await loadBillProgressByToken(
      new ProgressDatabase(
        bill("admin", network, asset.id),
        slots(network, asset.id),
      ),
      TOKEN,
    );

    expect(progress.bill).toMatchObject({
      network,
      asset,
      totalAmount: { code: "XRP", units: "10000000", scale: 6 },
    });
    expect(progress.summary).toMatchObject({
      paidAmount: { code: "XRP", units: "3000000", scale: 6 },
      remainingAmount: { code: "XRP", units: "5000000", scale: 6 },
      paidDrops: "3000000",
      remainingDrops: "5000000",
    });
  });

  for (const network of ["testnet", "mainnet"] as const) {
    it(`returns ${network} RLUSD progress without labeling units as XRP drops`, async () => {
      const asset = getRlusdAssetDescriptor(network);
      const progress = await loadBillProgressByToken(
        new ProgressDatabase(
          bill("admin", network, asset.id),
          slots(network, asset.id),
        ),
        TOKEN,
      );

      expect(progress.bill).toMatchObject({
        network,
        asset,
        totalAmount: { code: "RLUSD", units: "10000000", scale: 6 },
        totalDrops: null,
        recipientFundedDrops: null,
      });
      expect(progress.summary).toMatchObject({
        paidAmount: { code: "RLUSD", units: "3000000", scale: 6 },
        remainingAmount: { code: "RLUSD", units: "5000000", scale: 6 },
        paidDrops: null,
        remainingDrops: null,
      });
      expect(progress.slots[0]).toMatchObject({
        expectedAmount: { code: "RLUSD", units: "3000000", scale: 6 },
        expectedAmountDrops: null,
        proofToken: null,
      });
    });
  }

  it("redacts private participant and review details but retains public proof access", async () => {
    const progress = await loadBillProgressByToken(
      new ProgressDatabase(bill("public"), slots()),
      TOKEN,
    );

    expect(progress.access).toBe("public");
    expect(progress.bill.recipientLabel).toBeNull();
    expect(progress.slots[0]).toMatchObject({
      participantLabel: null,
      expectedPayerAddress: null,
      invoiceId: null,
      reviewReasonCode: null,
      expectedAmountDrops: "3000000",
      status: "paid",
      paidTransactionId: "C".repeat(64),
      proofToken: PROOF_TOKEN,
    });
    expect(progress.slots[1]).toMatchObject({
      participantLabel: null,
      expectedPayerAddress: null,
      invoiceId: null,
      reviewReasonCode: null,
      status: "needs_review",
      proofToken: null,
    });
  });

  it("fails closed when mode totals do not match the frozen Bill", async () => {
    await expect(
      loadBillProgressByToken(
        new ProgressDatabase(
          { ...bill("admin"), recipient_funded_amount_units: "1000000" },
          slots(),
        ),
        TOKEN,
      ),
    ).rejects.toBeInstanceOf(BillProgressDatabaseError);

    await expect(
      loadBillProgressByToken(
        new ProgressDatabase(
          {
            ...bill("admin", "testnet", undefined, "direct"),
            recipient_funded_amount_units: "1",
          },
          slots("testnet", undefined, "direct"),
        ),
        TOKEN,
      ),
    ).rejects.toBeInstanceOf(BillProgressDatabaseError);
  });

  it("fails closed when Bill and Asset networks disagree", async () => {
    await expect(
      loadBillProgressByToken(
        new ProgressDatabase(
          bill("admin", "mainnet", "xrpl:testnet:xrp"),
          slots("testnet", "xrpl:testnet:xrp"),
        ),
        TOKEN,
      ),
    ).rejects.toBeInstanceOf(BillProgressDatabaseError);
  });

  it("returns one not-found boundary for malformed and unknown capabilities", async () => {
    await expect(
      loadBillProgressByToken(new ProgressDatabase(bill("admin"), slots()), "bad"),
    ).rejects.toBeInstanceOf(BillProgressNotFoundError);
    await expect(
      loadBillProgressByToken(new ProgressDatabase(null, []), TOKEN),
    ).rejects.toBeInstanceOf(BillProgressNotFoundError);
  });

  it("fails closed when D1 cannot return a complete snapshot", async () => {
    await expect(
      loadBillProgressByToken(
        new ProgressDatabase(bill("admin"), slots(), false),
        TOKEN,
      ),
    ).rejects.toBeInstanceOf(BillProgressDatabaseError);
    await expect(
      loadBillProgressByToken(
        new ProgressDatabase(bill("admin"), [
          { ...slots()[0], expected_amount_units: "invalid" },
        ]),
        TOKEN,
      ),
    ).rejects.toBeInstanceOf(BillProgressDatabaseError);
  });

  it("rejects a paid native slot without its durable proof receipt", async () => {
    await expect(
      loadBillProgressByToken(
        new ProgressDatabase(bill("admin"), [
          { ...slots()[0], proof_digest: null },
        ]),
        TOKEN,
      ),
    ).rejects.toBeInstanceOf(BillProgressDatabaseError);
  });
});
