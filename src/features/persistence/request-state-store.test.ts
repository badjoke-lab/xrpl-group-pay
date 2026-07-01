import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "./d1-types";
import {
  loadActiveRequest,
  persistRequestState,
  synchronizeProviderRequest,
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

  constructor(
    readonly activeRow: Record<string, unknown> | null = null,
    readonly providerRow: Record<string, unknown> | null = null,
    readonly historyCount = 0,
  ) {}

  prepare(query: string) {
    const row = query.includes("provider_id = ?1")
      ? this.providerRow
      : query.includes("COUNT(*)")
        ? { request_count: this.historyCount }
        : query.includes("SELECT")
          ? this.activeRow
          : null;
    return new Statement(query, row);
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

const now = new Date("2026-06-24T00:00:00.000Z");

function requestRow(
  status: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "record-1",
    payment_slot_id: "slot-1",
    request_id: "00000000-0000-4000-8000-000000000001",
    status,
    expires_at: intent.expiresAt,
    transaction_id: null,
    mobile_uri: "https://xaman.app/sign/one",
    browser_uri: "https://xaman.app/sign/one",
    qr_image_url: "https://xaman.app/qr/one.png",
    status_channel: "wss://xaman.app/sign/one",
    provider_metadata_json: JSON.stringify({ network: "testnet" }),
    slot_status: "awaiting_signature",
    ...overrides,
  };
}

describe("request state persistence", () => {
  it("returns a resumable active request with participant launch data", async () => {
    const request = await loadActiveRequest(
      new Database(requestRow("available")),
      "slot-1",
      now,
    );

    expect(request).toMatchObject({
      recordId: "record-1",
      slotId: "slot-1",
      status: "available",
      mobileUri: "https://xaman.app/sign/one",
      qrImageUrl: "https://xaman.app/qr/one.png",
      providerMetadata: { network: "testnet" },
    });
  });

  it("expires only unsigned handoffs after their nominal expiry", async () => {
    const expiredDatabase = new Database(
      requestRow("opened", { expires_at: "2026-06-23T23:59:59.000Z" }),
    );
    await expect(
      loadActiveRequest(expiredDatabase, "slot-1", now),
    ).resolves.toBeNull();
    expect(expiredDatabase.batches).toHaveLength(1);

    const submittedDatabase = new Database(
      requestRow("submitted", {
        expires_at: "2026-06-23T23:59:59.000Z",
        transaction_id: "B".repeat(64),
      }),
    );
    await expect(
      loadActiveRequest(submittedDatabase, "slot-1", now),
    ).resolves.toMatchObject({ status: "submitted" });
    expect(submittedDatabase.batches).toHaveLength(0);
  });

  it("stores provider identity and resumable launch fields in one batch", async () => {
    const database = new Database();
    await persistRequestState(
      database,
      "slot-1",
      intent,
      {
        providerId: "xaman",
        requestId: "00000000-0000-4000-8000-000000000001",
        status: "available",
        expiresAt: intent.expiresAt,
        transactionId: null,
        mobileUri: "https://xaman.app/sign/one",
        browserUri: "https://xaman.app/sign/one",
        qrImageUrl: "https://xaman.app/qr/one.png",
        statusChannel: "wss://xaman.app/sign/one",
        providerMetadata: { network: "testnet" },
      },
      now,
      "record-1",
    );

    expect(database.batches).toHaveLength(1);
    expect(database.batches[0][0].values).toEqual([
      "record-1",
      "slot-1",
      "xaman",
      "00000000-0000-4000-8000-000000000001",
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
      "https://xaman.app/sign/one",
      "https://xaman.app/sign/one",
      "https://xaman.app/qr/one.png",
      "wss://xaman.app/sign/one",
      JSON.stringify({ network: "testnet" }),
      now.toISOString(),
    ]);
  });

  it("advances lifecycle state and maps it to the payment slot", async () => {
    const database = new Database(null, requestRow("available"));
    const result = await synchronizeProviderRequest(
      database,
      "00000000-0000-4000-8000-000000000001",
      { status: "opened", transactionId: null },
      now,
    );

    expect(result).toMatchObject({ status: "opened" });
    expect(database.batches[0][0].values).toEqual([
      "opened",
      null,
      now.toISOString(),
      "record-1",
    ]);
    expect(database.batches[0][1].values).toEqual([
      "awaiting_signature",
      now.toISOString(),
      "slot-1",
    ]);
  });

  it("does not regress submitted state from a delayed rejection", async () => {
    const database = new Database(
      null,
      requestRow("submitted", { transaction_id: "B".repeat(64) }),
    );
    const result = await synchronizeProviderRequest(
      database,
      "00000000-0000-4000-8000-000000000001",
      { status: "rejected", transactionId: null },
      now,
    );

    expect(result).toMatchObject({
      status: "submitted",
      transactionId: "B".repeat(64),
    });
    expect(database.batches).toHaveLength(0);
  });

  it("accepts a late provider-confirmed submission after expiry", async () => {
    const database = new Database(null, requestRow("expired"));
    const result = await synchronizeProviderRequest(
      database,
      "00000000-0000-4000-8000-000000000001",
      { status: "submitted", transactionId: "C".repeat(64) },
      now,
    );

    expect(result).toMatchObject({
      status: "submitted",
      transactionId: "C".repeat(64),
    });
    expect(database.batches).toHaveLength(1);
  });
});
