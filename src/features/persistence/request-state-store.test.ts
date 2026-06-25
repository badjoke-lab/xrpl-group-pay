import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "./d1-types";
import { ActiveRequestError } from "./request-state-errors";
import {
  persistRequestState,
  requireNoActiveRequest,
} from "./request-state-store";

class Statement implements D1PreparedStatementLike {
  constructor(
    readonly query: string,
    readonly row: Record<string, unknown> | null,
    readonly values: D1ValueLike[] = [],
  ) {}

  bind(...values: D1ValueLike[]) {
    return new Statement(this.query, this.row, values);
  }

  async first<Row = Record<string, unknown>>() {
    return this.row as Row | null;
  }

  async run<Row = Record<string, unknown>>(): Promise<D1ResultLike<Row>> {
    return { success: true, meta: { changes: 1 } };
  }
}

class Database implements D1DatabaseLike {
  batches: Statement[][] = [];

  constructor(readonly row: Record<string, unknown> | null = null) {}

  prepare(query: string) {
    return new Statement(query, this.row);
  }

  async batch<Row = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<D1ResultLike<Row>[]> {
    this.batches.push(statements as Statement[]);
    return statements.map(() => ({ success: true, meta: { changes: 1 } }));
  }
}

const intent = {
  intentId: "payment-slot:slot-1:revision:1",
  paymentSlotId: "slot-public-1",
  paymentRail: "xrpl",
  network: "testnet",
  asset: {
    id: "xrpl:testnet:xrp",
    paymentRail: "xrpl",
    network: "testnet",
    assetType: "native",
    currency: "XRP",
    issuer: null,
    precision: 6,
    symbol: "XRP",
    verificationStrategy: "xrpl-xrp-v1",
    receiptContract: "xrpl-xrp-payment-v1",
  },
  amount: { code: "XRP", units: "1", scale: 6 },
  destination: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  destinationTag: null,
  sourceTag: 1,
  invoiceId: "A".repeat(64),
  expectedPayer: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  expiresAt: "2026-06-24T00:05:00.000Z",
  revision: 1,
} as const;

const state = {
  providerId: "xaman",
  requestId: "00000000-0000-4000-8000-000000000001",
  status: "available",
  expiresAt: intent.expiresAt,
  transactionId: null,
} as const;

const now = new Date("2026-06-24T00:00:00.000Z");

describe("request state persistence", () => {
  it("allows a slot without an active request", async () => {
    await expect(
      requireNoActiveRequest(new Database(), "slot-1", now),
    ).resolves.toBeUndefined();
  });

  it("rejects an unexpired active request", async () => {
    await expect(
      requireNoActiveRequest(
        new Database({ id: "request-1", expires_at: intent.expiresAt }),
        "slot-1",
        now,
      ),
    ).rejects.toBeInstanceOf(ActiveRequestError);
  });

  it("expires an old request and allows replacement", async () => {
    await expect(
      requireNoActiveRequest(
        new Database({
          id: "request-1",
          expires_at: "2026-06-23T23:59:59.000Z",
        }),
        "slot-1",
        now,
      ),
    ).resolves.toBeUndefined();
  });

  it("stores the provider request identity and slot state in one batch", async () => {
    const database = new Database();
    await persistRequestState(
      database,
      "slot-1",
      intent,
      state,
      now,
      "record-1",
    );

    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(2);
    expect(database.batches[0][0].values).toEqual([
      "record-1",
      "slot-1",
      "xaman",
      state.requestId,
      intent.intentId,
      1,
      "testnet",
      "xrpl:testnet:xrp",
      "native",
      "XRP",
      null,
      "available",
      intent.expiresAt,
      null,
      now.toISOString(),
    ]);
  });
});
