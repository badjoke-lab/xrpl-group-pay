import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "@/features/persistence/d1-types";
import { digestVerifiedProof } from "@/features/persistence/digest-verified-proof";

import { loadPublicProofByToken } from "./load-public-proof";

class Statement implements D1PreparedStatementLike {
  constructor(
    private readonly row: Record<string, unknown>,
    private readonly capture: (values: D1ValueLike[]) => void,
  ) {}

  bind(...values: D1ValueLike[]) {
    this.capture(values);
    return this;
  }

  async first<Row = Record<string, unknown>>() {
    return this.row as Row;
  }

  async run<Row = Record<string, unknown>>(): Promise<D1ResultLike<Row>> {
    return { success: true };
  }
}

class Database implements D1DatabaseLike {
  bound: D1ValueLike[] = [];

  constructor(private readonly row: Record<string, unknown>) {}

  prepare() {
    return new Statement(this.row, (values) => {
      this.bound = values;
    });
  }

  async batch<Row = Record<string, unknown>>() {
    return [] as D1ResultLike<Row>[];
  }
}

describe("Mainnet public proof", () => {
  it("verifies and returns the stored Mainnet receipt", async () => {
    const row = {
      network: "mainnet" as const,
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
    };
    const proofDigest = await digestVerifiedProof({
      network: row.network,
      transactionId: row.transaction_id,
      ledgerIndex: row.ledger_index,
      sender: row.sender,
      destination: row.destination,
      amountDrops: row.amount_drops,
      deliveredAmountDrops: row.delivered_amount_drops,
      sourceTag: row.source_tag,
      destinationTag: row.destination_tag,
      invoiceId: row.invoice_id,
      idempotencyKey: `mainnet:${row.transaction_id}` as const,
      verifiedAt: row.verified_at,
    });
    const database = new Database({ ...row, proof_digest: proofDigest });

    const proof = await loadPublicProofByToken(
      database,
      proofDigest.toLowerCase(),
    );

    expect(database.bound).toEqual([proofDigest]);
    expect(proof).toMatchObject({
      network: "mainnet",
      transactionId: row.transaction_id,
      proofDigest,
    });
  });
});
