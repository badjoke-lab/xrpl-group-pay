import { describe, expect, it, vi } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "@/features/persistence/d1-types";
import type { XamanPayloadResponse } from "@/features/xaman/schemas";

import type {
  XrplAccountFlags,
  XrplReadinessClient,
  XrplTrustLine,
} from "./account-read-client";
import {
  createOrResumeRlusdTrustSetHandoff,
  synchronizeRlusdTrustSetPayload,
} from "./rlusd-trustset-service";
import { TRUSTSET_SET_NO_RIPPLE_FLAG } from "./rlusd-trustset";

const TOKEN = "ab".repeat(32);
const ACCOUNT = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const asset = getRlusdAssetDescriptor("testnet");
const PAYLOAD_ID = "22222222-2222-4222-8222-222222222222";
const TXID = "A".repeat(64);

function flags(overrides: Partial<XrplAccountFlags> = {}): XrplAccountFlags {
  return {
    requireDestinationTag: false,
    depositAuth: false,
    globalFreeze: false,
    requireAuthorization: false,
    disallowIncomingXRP: false,
    ...overrides,
  };
}

function trustLine(overrides: Partial<XrplTrustLine> = {}): XrplTrustLine {
  return {
    account: asset.issuer,
    balance: "0",
    currency: asset.currency,
    limit: "3",
    limit_peer: "0",
    authorized: false,
    peer_authorized: false,
    freeze: false,
    freeze_peer: false,
    deep_freeze: false,
    deep_freeze_peer: false,
    ...overrides,
  };
}

function reader(lines: XrplTrustLine[] = []): XrplReadinessClient {
  return {
    network: "testnet",
    getAccountInfo: vi.fn(async (account: string) => ({
      account,
      flags: flags(),
      balanceDrops: "50000000",
      ownerCount: 1,
      validatedLedgerIndex: 100,
    })),
    getTrustLines: vi.fn(async () => lines),
    getNetworkReadinessState: vi.fn(async () => ({
      validatedLedgerIndex: 100,
      currentLedgerIndex: 101,
      baseFeeDrops: "10",
      minimumFeeDrops: "10",
      openLedgerFeeDrops: "10",
      reserveBaseDrops: "10000000",
      reserveIncrementDrops: "2000000",
    })),
  };
}

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "preparation-1",
    public_id: "00000000-0000-4000-8000-000000000001",
    network: "testnet",
    purpose: "recipient",
    account_address: ACCOUNT,
    asset_id: asset.id,
    currency_code: asset.currency,
    issuer: asset.issuer,
    required_amount_units: "3000000",
    amount_scale: 6,
    trust_limit_units: "3000000",
    trust_limit_value: "3",
    status: "required",
    provider_status: null,
    xaman_payload_id: null,
    mobile_uri: null,
    browser_uri: null,
    qr_image_url: null,
    status_channel: null,
    expires_at: null,
    transaction_id: null,
    failure_code: null,
    last_provider_sync_at: null,
    created_at: "2026-07-02T00:00:00.000Z",
    updated_at: "2026-07-02T00:00:00.000Z",
    verified_at: null,
    ...overrides,
  };
}

class Statement implements D1PreparedStatementLike {
  constructor(
    private readonly database: Database,
    readonly query: string,
    readonly values: D1ValueLike[] = [],
  ) {}

  bind(...values: D1ValueLike[]) {
    return new Statement(this.database, this.query, values);
  }

  async first<Row = Record<string, unknown>>() {
    if (this.query.includes("capability_hash")) {
      return this.database.row as Row;
    }
    if (this.query.includes("xaman_payload_id = ?1")) {
      return this.database.row.xaman_payload_id === this.values[0]
        ? (this.database.row as Row)
        : null;
    }
    return null;
  }

  async run<Row = Record<string, unknown>>(): Promise<D1ResultLike<Row>> {
    if (this.query.includes("SET status = 'awaiting_signature'")) {
      this.database.row = {
        ...this.database.row,
        status: "awaiting_signature",
        provider_status: "available",
        xaman_payload_id: this.values[0],
        mobile_uri: this.values[1],
        browser_uri: this.values[2],
        qr_image_url: this.values[3],
        status_channel: this.values[4],
        expires_at: this.values[5],
        transaction_id: null,
        failure_code: null,
        last_provider_sync_at: this.values[6],
        updated_at: this.values[6],
      };
      return { success: true, meta: { changes: 1 } };
    }

    if (this.query.includes("SET status = ?1")) {
      const expectedStatus = this.values[6];
      if (this.database.row.status !== expectedStatus) {
        return { success: true, meta: { changes: 0 } };
      }
      const nextStatus = this.values[0] as string;
      this.database.row = {
        ...this.database.row,
        status: nextStatus,
        provider_status:
          this.values[1] ?? this.database.row.provider_status,
        transaction_id:
          this.values[2] ?? this.database.row.transaction_id,
        failure_code: this.values[3],
        last_provider_sync_at:
          this.values[1] === null
            ? this.database.row.last_provider_sync_at
            : this.values[4],
        updated_at: this.values[4],
        verified_at:
          nextStatus === "ready"
            ? this.values[4]
            : this.database.row.verified_at,
      };
      return { success: true, meta: { changes: 1 } };
    }

    return { success: true, meta: { changes: 1 } };
  }
}

class Database implements D1DatabaseLike {
  constructor(public row: Record<string, unknown>) {}

  prepare(query: string) {
    return new Statement(this, query);
  }

  async batch<Row = Record<string, unknown>>() {
    return [] as D1ResultLike<Row>[];
  }
}

function xamanPayload(
  meta: Partial<XamanPayloadResponse["meta"]>,
  txid: string | null = null,
): XamanPayloadResponse {
  return {
    meta: {
      resolved: false,
      signed: false,
      cancelled: false,
      expired: false,
      ...meta,
    },
    payload: {
      tx_type: "TrustSet",
      request_json: {
        TransactionType: "TrustSet",
        Account: ACCOUNT,
        Flags: TRUSTSET_SET_NO_RIPPLE_FLAG,
        LimitAmount: {
          currency: asset.currency,
          issuer: asset.issuer,
          value: "3",
        },
      },
    },
    response: { txid },
  };
}

describe("RLUSD TrustSet service", () => {
  it("creates a signer-bound handoff and persists resumable launch data", async () => {
    const database = new Database(baseRow());
    const createPayload = vi.fn().mockResolvedValue({
      uuid: PAYLOAD_ID,
      next: { always: "https://xaman.app/sign/trustset" },
      refs: {
        qr_png: "https://xaman.app/qr/trustset.png",
        websocket_status: "wss://xaman.app/status/trustset",
      },
    });

    const launch = await createOrResumeRlusdTrustSetHandoff(
      database,
      TOKEN,
      {
        reader: reader(),
        getSigningState: vi.fn().mockResolvedValue({
          account: ACCOUNT,
          sequence: 10,
          validatedLedgerIndex: 100,
        }),
        createPayload,
        getPayload: vi.fn(),
        now: () => new Date("2026-07-02T00:00:00.000Z"),
      },
    );

    expect(launch).toMatchObject({
      status: "awaiting_signature",
      providerStatus: "available",
      payloadId: PAYLOAD_ID,
      deepLink: "https://xaman.app/sign/trustset",
    });
    expect(createPayload).toHaveBeenCalledTimes(1);
    expect(createPayload.mock.calls[0][0]).toMatchObject({
      txjson: {
        TransactionType: "TrustSet",
        Account: ACCOUNT,
        LimitAmount: {
          currency: asset.currency,
          issuer: asset.issuer,
          value: "3",
        },
      },
    });
  });

  it("keeps submitted separate from ready until the validated trust line appears", async () => {
    const database = new Database(
      baseRow({
        status: "awaiting_signature",
        provider_status: "available",
        xaman_payload_id: PAYLOAD_ID,
        mobile_uri: "https://xaman.app/sign/trustset",
        browser_uri: "https://xaman.app/sign/trustset",
        qr_image_url: "https://xaman.app/qr/trustset.png",
        status_channel: "wss://xaman.app/status/trustset",
        expires_at: "2026-07-02T00:05:00.000Z",
      }),
    );

    const launch = await synchronizeRlusdTrustSetPayload(
      database,
      PAYLOAD_ID,
      {
        reader: reader([]),
        getPayload: vi
          .fn()
          .mockResolvedValue(
            xamanPayload({ resolved: true, signed: true }, TXID),
          ),
        now: () => new Date("2026-07-02T00:01:00.000Z"),
      },
    );

    expect(launch).toMatchObject({
      status: "verifying",
      providerStatus: "submitted",
      transactionId: TXID,
    });
  });

  it("marks ready only after the validated official trust line has the frozen limit", async () => {
    const database = new Database(
      baseRow({
        status: "verifying",
        provider_status: "submitted",
        xaman_payload_id: PAYLOAD_ID,
        transaction_id: TXID,
      }),
    );

    const launch = await synchronizeRlusdTrustSetPayload(
      database,
      PAYLOAD_ID,
      {
        reader: reader([trustLine()]),
        getPayload: vi
          .fn()
          .mockResolvedValue(
            xamanPayload({ resolved: true, signed: true }, TXID),
          ),
        now: () => new Date("2026-07-02T00:02:00.000Z"),
      },
    );

    expect(launch).toMatchObject({ status: "ready", transactionId: TXID });
  });

  it("persists rejection and permits a new canonical handoff", async () => {
    const database = new Database(
      baseRow({
        status: "awaiting_signature",
        provider_status: "available",
        xaman_payload_id: PAYLOAD_ID,
        mobile_uri: "https://xaman.app/sign/old",
        browser_uri: "https://xaman.app/sign/old",
        qr_image_url: "https://xaman.app/qr/old.png",
        status_channel: "wss://xaman.app/status/old",
        expires_at: "2026-07-02T00:05:00.000Z",
      }),
    );
    await synchronizeRlusdTrustSetPayload(database, PAYLOAD_ID, {
      reader: reader(),
      getPayload: vi
        .fn()
        .mockResolvedValue(xamanPayload({ resolved: true, signed: false })),
      now: () => new Date("2026-07-02T00:01:00.000Z"),
    });
    expect(database.row.status).toBe("rejected");

    const createPayload = vi.fn().mockResolvedValue({
      uuid: "33333333-3333-4333-8333-333333333333",
      next: { always: "https://xaman.app/sign/new" },
      refs: {
        qr_png: "https://xaman.app/qr/new.png",
        websocket_status: "wss://xaman.app/status/new",
      },
    });
    const launch = await createOrResumeRlusdTrustSetHandoff(
      database,
      TOKEN,
      {
        reader: reader(),
        getSigningState: vi.fn().mockResolvedValue({
          account: ACCOUNT,
          sequence: 11,
          validatedLedgerIndex: 101,
        }),
        createPayload,
        getPayload: vi.fn(),
        now: () => new Date("2026-07-02T00:02:00.000Z"),
      },
    );

    expect(launch).toMatchObject({
      status: "awaiting_signature",
      payloadId: "33333333-3333-4333-8333-333333333333",
    });
  });
});
