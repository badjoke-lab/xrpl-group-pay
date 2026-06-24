import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "@/features/persistence/d1-types";

import {
  loadPublicProofByToken,
  PublicProofDatabaseError,
  PublicProofNotFoundError,
} from "./load-public-proof";

const TOKEN = "ab".repeat(32);
const ROW = {
  network: "testnet",
  transaction_id: "CD".repeat(32),
  ledger_index: 12345,
  sender: "rPublicSender",
  destination: "rPublicDestination",
  amount_drops: "3000000",
  delivered_amount_drops: "3000000",
  source_tag: 777,
  destination_tag: 9,
  invoice_id: "EF".repeat(32),
  verified_at: "2026-06-24T00:05:00.000Z",
  recorded_at: "2026-06-24T00:05:01.000Z",
  proof_digest: TOKEN.toUpperCase(),
};

class Statement implements D1PreparedStatementLike {
  constructor(
    private readonly row: Record<string, unknown> | null,
    private readonly capture: (values: D1ValueLike[]) => void,
  ) {}

  bind(...values: D1ValueLike[]) {
    this.capture(values);
    return this;
  }

  async first<Row = Record<string, unknown>>() {
    return this.row as Row | null;
  }

  async run<Row = Record<string, unknown>>(): Promise<D1ResultLike<Row>> {
    return { success: true };
  }
}

class Database implements D1DatabaseLike {
  bound: D1ValueLike[] = [];

  constructor(private readonly row: Record<string, unknown> | null) {}

  prepare() {
    return new Statement(this.row, (values) => {
      this.bound = values;
    });
  }

  async batch<Row = Record<string, unknown>>() {
    return [] as D1ResultLike<Row>[];
  }
}

describe("loadPublicProofByToken", () => {
  it("returns normalized public ledger facts", async () => {
    const database = new Database(ROW);
    const proof = await loadPublicProofByToken(database, TOKEN);

    expect(database.bound).toEqual([TOKEN.toUpperCase()]);
    expect(proof).toMatchObject({
      validationStatus: "validated",
      transactionResult: "tesSUCCESS",
      transactionId: ROW.transaction_id,
      amountDrops: ROW.amount_drops,
      deliveredAmountDrops: ROW.delivered_amount_drops,
      proofDigest: ROW.proof_digest,
    });
    expect(proof).not.toHaveProperty("billTitle");
    expect(proof).not.toHaveProperty("participantLabel");
    expect(proof).not.toHaveProperty("xamanPayloadId");
  });

  it("uses one not-found boundary", async () => {
    await expect(
      loadPublicProofByToken(new Database(ROW), "bad"),
    ).rejects.toBeInstanceOf(PublicProofNotFoundError);
    await expect(
      loadPublicProofByToken(new Database(null), TOKEN),
    ).rejects.toBeInstanceOf(PublicProofNotFoundError);
  });

  it("fails closed for malformed stored rows", async () => {
    await expect(
      loadPublicProofByToken(
        new Database({ ...ROW, amount_drops: "not-drops" }),
        TOKEN,
      ),
    ).rejects.toBeInstanceOf(PublicProofDatabaseError);
  });
});
