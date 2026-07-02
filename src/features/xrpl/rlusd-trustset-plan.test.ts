import { describe, expect, it, vi } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "@/features/persistence/d1-types";

import type {
  XrplAccountFlags,
  XrplReadinessClient,
  XrplTrustLine,
} from "./account-read-client";
import { planRlusdTrustSetPreparation } from "./rlusd-trustset-plan";

const ACCOUNT = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const asset = getRlusdAssetDescriptor("testnet");

class Statement implements D1PreparedStatementLike {
  constructor(
    readonly values: D1ValueLike[] = [],
  ) {}

  bind(...values: D1ValueLike[]) {
    return new Statement(values);
  }

  async first<Row = Record<string, unknown>>() {
    return null as Row | null;
  }

  async run<Row = Record<string, unknown>>(): Promise<D1ResultLike<Row>> {
    return { success: true, meta: { changes: 1 } };
  }
}

class Database implements D1DatabaseLike {
  lastStatement: Statement | null = null;

  prepare() {
    const statement = new Statement();
    const originalBind = statement.bind.bind(statement);
    statement.bind = (...values: D1ValueLike[]) => {
      const bound = originalBind(...values) as Statement;
      this.lastStatement = bound;
      return bound;
    };
    return statement;
  }

  async batch<Row = Record<string, unknown>>() {
    return [] as D1ResultLike<Row>[];
  }
}

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
    balance: "2",
    currency: asset.currency,
    limit: "4",
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

function reader(options: {
  lines?: XrplTrustLine[];
  balanceDrops?: string;
  ownerCount?: number;
  issuerFlags?: Partial<XrplAccountFlags>;
} = {}): XrplReadinessClient {
  return {
    network: "testnet",
    getAccountInfo: vi.fn(async (account: string) => ({
      account,
      flags: account === asset.issuer ? flags(options.issuerFlags) : flags(),
      balanceDrops: options.balanceDrops ?? "50000000",
      ownerCount: options.ownerCount ?? 0,
      validatedLedgerIndex: 100,
    })),
    getTrustLines: vi.fn(async () => options.lines ?? []),
    getNetworkReadinessState: vi.fn(async () => ({
      validatedLedgerIndex: 100,
      currentLedgerIndex: 101,
      baseFeeDrops: "10",
      minimumFeeDrops: "10",
      openLedgerFeeDrops: "12",
      reserveBaseDrops: "10000000",
      reserveIncrementDrops: "2000000",
    })),
  };
}

function input(
  database: D1DatabaseLike,
  overrides: Partial<Parameters<typeof planRlusdTrustSetPreparation>[0]> = {},
) {
  return {
    database,
    reader: reader(),
    network: "testnet" as const,
    purpose: "recipient" as const,
    account: ACCOUNT,
    requiredAmountUnits: "3000000",
    now: new Date("2026-07-02T00:00:00.000Z"),
    ...overrides,
  };
}

describe("planRlusdTrustSetPreparation", () => {
  it("creates a missing recipient trust line with enough reserve and fee XRP", async () => {
    const database = new Database();
    const plan = await planRlusdTrustSetPreparation(input(database));

    expect(plan).toMatchObject({
      status: "created",
      preparationStatus: "required",
      trustLimitUnits: "3000000",
      trustLimitValue: "3",
      asset,
    });
    expect(database.lastStatement?.values).toContain("required");
  });

  it("includes the existing positive balance when planning recipient capacity", async () => {
    const plan = await planRlusdTrustSetPreparation(
      input(new Database(), {
        reader: reader({ lines: [trustLine()] }),
      }),
    );

    expect(plan).toMatchObject({
      status: "created",
      preparationStatus: "required",
      trustLimitUnits: "5000000",
      trustLimitValue: "5",
    });
  });

  it("records not-required when the existing line already has enough capacity", async () => {
    const plan = await planRlusdTrustSetPreparation(
      input(new Database(), {
        reader: reader({ lines: [trustLine({ limit: "5" })] }),
      }),
    );

    expect(plan).toMatchObject({
      status: "created",
      preparationStatus: "not_required",
      trustLimitUnits: "5000000",
    });
  });

  it("blocks a new trust line when XRP cannot cover future reserve and fee", async () => {
    const plan = await planRlusdTrustSetPreparation(
      input(new Database(), {
        reader: reader({ balanceDrops: "12000000" }),
      }),
    );

    expect(plan).toEqual({
      status: "blocked",
      reason: "insufficient_xrp_for_trustset",
      network: "testnet",
      account: ACCOUNT,
      assetId: asset.id,
      requiredXrpDrops: "12000012",
      spendableXrpDrops: "0",
    });
  });

  it("does not offer TrustSet as a fix for frozen or unauthorized lines", async () => {
    await expect(
      planRlusdTrustSetPreparation(
        input(new Database(), {
          reader: reader({ lines: [trustLine({ freeze_peer: true })] }),
        }),
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "trust_line_frozen",
    });

    await expect(
      planRlusdTrustSetPreparation(
        input(new Database(), {
          reader: reader({
            issuerFlags: { requireAuthorization: true },
            lines: [trustLine({ peer_authorized: false })],
          }),
        }),
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "trust_line_not_authorized",
    });
  });
});
