import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "@/features/persistence/d1-types";
import { digestVerifiedProof } from "@/features/persistence/digest-verified-proof";

import {
  loadPublicProofByToken,
  PublicProofDatabaseError,
  PublicProofNotFoundError,
} from "./load-public-proof";

const BASE_ROW = {
  network: "testnet" as const,
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
};

async function validFixture() {
  const proofDigest = await digestVerifiedProof({
    network: BASE_ROW.network,
    transactionId: BASE_ROW.transaction_id,
    ledgerIndex: BASE_ROW.ledger_index,
    sender: BASE_ROW.sender,
    destination: BASE_ROW.destination,
    amountDrops: BASE_ROW.amount_drops,
    deliveredAmountDrops: BASE_ROW.delivered_amount_drops,
    sourceTag: BASE_ROW.source_tag,
    destinationTag: BASE_ROW.destination_tag,
    invoiceId: BASE_ROW.invoice_id,
    idempotencyKey: `testnet:${BASE_ROW.transaction_id}`,
    verifiedAt: BASE_ROW.verified_at,
  });
  return {
    token: proofDigest.toLowerCase(),
    row: { ...BASE_ROW, proof_digest: proofDigest },
  };
}

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
    const fixture = await validFixture();
    const database = new Database(fixture.row);
    const proof = await loadPublicProofByToken(database, fixture.token);

    expect(database.bound).toEqual([fixture.row.proof_digest]);
    expect(proof).toMatchObject({
      validationStatus: "validated",
      transactionResult: "tesSUCCESS",
      transactionId: BASE_ROW.transaction_id,
      amountDrops: BASE_ROW.amount_drops,
      deliveredAmountDrops: BASE_ROW.delivered_amount_drops,
      proofDigest: fixture.row.proof_digest,
    });
    expect(proof).not.toHaveProperty("billTitle");
    expect(proof).not.toHaveProperty("participantLabel");
    expect(proof).not.toHaveProperty("xamanPayloadId");
  });

  it("uses one not-found boundary", async () => {
    await expect(
      loadPublicProofByToken(new Database(null), "bad"),
    ).rejects.toBeInstanceOf(PublicProofNotFoundError);
    await expect(
      loadPublicProofByToken(new Database(null), "A".repeat(64)),
    ).rejects.toBeInstanceOf(PublicProofNotFoundError);
  });

  it("fails closed for malformed or digest-mismatched stored rows", async () => {
    const fixture = await validFixture();
    await expect(
      loadPublicProofByToken(
        new Database({ ...fixture.row, amount_drops: "not-drops" }),
        fixture.token,
      ),
    ).rejects.toBeInstanceOf(PublicProofDatabaseError);
    await expect(
      loadPublicProofByToken(
        new Database({ ...fixture.row, sender: "rModifiedSender" }),
        fixture.token,
      ),
    ).rejects.toBeInstanceOf(PublicProofDatabaseError);
  });
});
