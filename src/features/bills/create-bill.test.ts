import { describe, expect, it } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "../persistence/d1-types";
import { hashCapabilityToken } from "./capabilities";
import {
  BillDatabaseError,
  BillInputError,
  createPublishedBill,
  prepareBillReview,
  type BillRandomSource,
} from "./create-bill";

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

class CaptureDatabase implements D1DatabaseLike {
  statements: Statement[] = [];

  constructor(readonly fail = false) {}

  prepare(query: string) {
    return new Statement(query);
  }

  async batch<Row = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<D1ResultLike<Row>[]> {
    this.statements = statements as Statement[];
    if (this.fail) throw new Error("database unavailable");
    return statements.map(() => ({ success: true }));
  }
}

const uuids = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
  "00000000-0000-4000-8000-000000000005",
  "00000000-0000-4000-8000-000000000006",
];
const tokens = ["1", "2", "3", "4"].map((value) => value.repeat(64));
const invoices = ["A".repeat(64), "B".repeat(64)];

function deterministicRandom(): BillRandomSource {
  const uuidValues = [...uuids];
  const tokenValues = [...tokens];
  const invoiceValues = [...invoices];
  return {
    uuid: () => uuidValues.shift()!,
    token: () => tokenValues.shift()!,
    invoiceId: () => invoiceValues.shift()!,
  };
}

function input() {
  return {
    title: "Dinner",
    destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
    destinationTag: 7,
    totalXrp: "10",
    creatorShareXrp: "2",
    participants: [
      {
        label: "A",
        expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
        amountXrp: "3",
      },
      {
        label: "B",
        expectedPayerAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
        amountXrp: "5",
      },
    ],
  };
}

function rlusdInput() {
  return {
    title: "RLUSD Dinner",
    destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
    destinationTag: 7,
    settlementAssetId: "xrpl:testnet:rlusd" as const,
    totalAmount: "10",
    creatorShareAmount: "2",
    participants: [
      {
        label: "A",
        expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
        amount: "3",
      },
      {
        label: "B",
        expectedPayerAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
        amount: "5",
      },
    ],
  };
}

describe("createPublishedBill", () => {
  it("keeps the legacy XRP input compatible while returning Asset amounts", async () => {
    const database = new CaptureDatabase();
    const created = await createPublishedBill(
      database,
      input(),
      new Date("2026-06-24T00:00:00.000Z"),
      deterministicRandom(),
    );

    expect(database.statements).toHaveLength(3);
    expect(database.statements[0].query).toContain("INSERT INTO bills");
    expect(database.statements[1].query).toContain("INSERT INTO payment_slots");
    expect(database.statements[2].query).toContain("INSERT INTO payment_slots");

    expect(created.bill).toMatchObject({
      publicId: uuids[1],
      asset: { id: "xrpl:testnet:xrp", symbol: "XRP" },
      totalAmount: { code: "XRP", units: "10000000", scale: 6 },
      creatorShareAmount: { code: "XRP", units: "2000000", scale: 6 },
      totalDrops: "10000000",
      creatorShareDrops: "2000000",
      status: "open",
    });
    expect(created.slots.map((slot) => slot.expectedAmountDrops)).toEqual([
      "3000000",
      "5000000",
    ]);
    expect(created.capabilities).toEqual({
      publicToken: tokens[0],
      adminToken: tokens[1],
    });

    const billValues = database.statements[0].values;
    expect(billValues).not.toContain(tokens[0]);
    expect(billValues).not.toContain(tokens[1]);
    expect(billValues).toContain(await hashCapabilityToken(tokens[0]));
    expect(billValues).toContain(await hashCapabilityToken(tokens[1]));

    expect(database.statements[1].values).not.toContain(tokens[2]);
    expect(database.statements[1].values).toContain(
      await hashCapabilityToken(tokens[2]),
    );
  });

  it("freezes official RLUSD identity and generic units for every slot", async () => {
    const database = new CaptureDatabase();
    const asset = getRlusdAssetDescriptor("testnet");
    const created = await createPublishedBill(
      database,
      rlusdInput(),
      new Date("2026-06-25T00:00:00.000Z"),
      deterministicRandom(),
    );

    expect(created.bill).toMatchObject({
      asset,
      totalAmount: { code: "RLUSD", units: "10000000", scale: 6 },
      creatorShareAmount: { code: "RLUSD", units: "2000000", scale: 6 },
      totalDrops: null,
      creatorShareDrops: null,
    });
    expect(created.slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          asset,
          expectedAmount: { code: "RLUSD", units: "3000000", scale: 6 },
          expectedAmountDrops: null,
        }),
      ]),
    );

    const billValues = database.statements[0].values;
    expect(billValues).toContain(asset.id);
    expect(billValues).toContain(asset.currency);
    expect(billValues).toContain(asset.issuer);
    const firstSlotValues = database.statements[1].values;
    expect(firstSlotValues).toContain(asset.id);
    expect(firstSlotValues).toContain("3000000");
  });

  it("returns an Asset-aware normalized review before persistence", () => {
    const review = prepareBillReview(rlusdInput());
    expect(review).toMatchObject({
      asset: { id: "xrpl:testnet:rlusd", assetType: "issued" },
      totalAmount: { code: "RLUSD", units: "10000000", scale: 6 },
      totalDrops: null,
      participants: [
        expect.objectContaining({
          expectedAmount: { code: "RLUSD", units: "3000000", scale: 6 },
          expectedAmountDrops: null,
        }),
        expect.anything(),
      ],
    });
  });

  it("rejects allocations that do not equal the bill total", async () => {
    const database = new CaptureDatabase();
    await expect(
      createPublishedBill(
        database,
        { ...input(), totalXrp: "11" },
        new Date(),
        deterministicRandom(),
      ),
    ).rejects.toBeInstanceOf(BillInputError);
    expect(database.statements).toHaveLength(0);
  });

  it("rejects invalid payer addresses before persistence", async () => {
    const database = new CaptureDatabase();
    const invalid = input();
    invalid.participants[0].expectedPayerAddress = "not-an-address";

    await expect(
      createPublishedBill(database, invalid, new Date(), deterministicRandom()),
    ).rejects.toBeInstanceOf(BillInputError);
    expect(database.statements).toHaveLength(0);
  });

  it("fails closed when the atomic batch fails", async () => {
    await expect(
      createPublishedBill(
        new CaptureDatabase(true),
        input(),
        new Date(),
        deterministicRandom(),
      ),
    ).rejects.toBeInstanceOf(BillDatabaseError);
  });
});
