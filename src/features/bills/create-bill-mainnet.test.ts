import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "../persistence/d1-types";
import {
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

  prepare(query: string) {
    return new Statement(query);
  }

  async batch<Row = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<D1ResultLike<Row>[]> {
    this.statements = statements as Statement[];
    return statements.map(() => ({ success: true }));
  }
}

function deterministicRandom(): BillRandomSource {
  const uuids = [
    "00000000-0000-4000-8000-000000000101",
    "00000000-0000-4000-8000-000000000102",
    "00000000-0000-4000-8000-000000000103",
    "00000000-0000-4000-8000-000000000104",
    "00000000-0000-4000-8000-000000000105",
    "00000000-0000-4000-8000-000000000106",
  ];
  const tokens = ["1", "2", "3", "4"].map((value) => value.repeat(64));
  const invoices = ["A".repeat(64), "B".repeat(64)];
  return {
    uuid: () => uuids.shift()!,
    token: () => tokens.shift()!,
    invoiceId: () => invoices.shift()!,
  };
}

const mainnetInput = {
  title: "Controlled Mainnet XRP acceptance",
  destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  settlementAssetId: "xrpl:mainnet:xrp" as const,
  totalAmount: "0.000002",
  creatorShareAmount: "0",
  allocation: { strategy: "equal" as const },
  participants: [
    {
      participantId: "payer-1",
      expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    },
    {
      participantId: "payer-2",
      expectedPayerAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
    },
  ],
};

describe("network-aware Bill creation", () => {
  it("freezes an XRP Bill with exact Mainnet asset identity", async () => {
    const database = new CaptureDatabase();
    const created = await createPublishedBill(
      database,
      mainnetInput,
      new Date("2026-06-28T00:00:00.000Z"),
      deterministicRandom(),
      "mainnet",
    );

    expect(created.bill).toMatchObject({
      network: "mainnet",
      asset: {
        id: "xrpl:mainnet:xrp",
        network: "mainnet",
        assetType: "native",
      },
      totalAmount: { code: "XRP", units: "2", scale: 6 },
    });
    expect(created.slots.map((slot) => slot.expectedAmountDrops)).toEqual([
      "1",
      "1",
    ]);
    expect(database.statements[0].values).toContain("mainnet");
    expect(database.statements[1].values).toContain("xrpl:mainnet:xrp");
  });

  it("rejects cross-network assets before any D1 write", async () => {
    const database = new CaptureDatabase();

    await expect(
      createPublishedBill(
        database,
        { ...mainnetInput, settlementAssetId: "xrpl:testnet:xrp" },
        new Date(),
        deterministicRandom(),
        "mainnet",
      ),
    ).rejects.toThrow(BillInputError);

    expect(database.statements).toHaveLength(0);
  });

  it("requires canonical Mainnet input instead of reinterpreting legacy XRP", () => {
    expect(() =>
      prepareBillReview(
        {
          title: "Legacy input",
          destinationAddress: mainnetInput.destinationAddress,
          totalXrp: "2",
          creatorShareXrp: "0",
          participants: [
            {
              expectedPayerAddress:
                mainnetInput.participants[0].expectedPayerAddress,
              amountXrp: "1",
            },
            {
              expectedPayerAddress:
                mainnetInput.participants[1].expectedPayerAddress,
              amountXrp: "1",
            },
          ],
        },
        "mainnet",
      ),
    ).toThrow(BillInputError);
  });
});
