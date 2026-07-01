import { describe, expect, it, vi } from "vitest";

import {
  getRlusdAssetDescriptor,
  getXrpAssetDescriptor,
} from "@/features/assets/registry";

import {
  XrplAccountReadUnavailableError,
  type XrplAccountFlags,
  type XrplReadinessClient,
  type XrplTrustLine,
} from "./account-read-client";
import {
  checkPayerReadiness,
  PayerReadinessConfigurationError,
} from "./payer-readiness";

const ACCOUNT = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
const CURRENCY = "524C555344000000000000000000000000000000";
const MAINNET_ACCESS = {
  network: "mainnet" as const,
  mainnetGateApproved: true as const,
};

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

function line(overrides: Partial<XrplTrustLine> = {}): XrplTrustLine {
  return {
    account: ISSUER,
    balance: "100",
    currency: CURRENCY,
    limit: "1000",
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
  balanceDrops?: string;
  ownerCount?: number;
  issuerFlags?: Partial<XrplAccountFlags>;
  accountMissing?: boolean;
  issuerMissing?: boolean;
  lines?: XrplTrustLine[];
  unavailable?: boolean;
} = {}): XrplReadinessClient {
  return {
    network: "mainnet",
    getAccountInfo: vi.fn(async (account: string) => {
      if (options.unavailable) throw new XrplAccountReadUnavailableError();
      if (account === ACCOUNT) {
        if (options.accountMissing) return null;
        return {
          account,
          flags: flags(),
          balanceDrops: options.balanceDrops ?? "50000000",
          ownerCount: options.ownerCount ?? 2,
          validatedLedgerIndex: 100,
        };
      }
      if (options.issuerMissing) return null;
      return {
        account,
        flags: flags(options.issuerFlags),
        balanceDrops: "10000000",
        ownerCount: 0,
        validatedLedgerIndex: 100,
      };
    }),
    getTrustLines: vi.fn(async () => options.lines ?? [line()]),
    getNetworkReadinessState: vi.fn(async () => {
      if (options.unavailable) throw new XrplAccountReadUnavailableError();
      return {
        validatedLedgerIndex: 100,
        currentLedgerIndex: 101,
        baseFeeDrops: "10",
        minimumFeeDrops: "10",
        openLedgerFeeDrops: "12",
        reserveBaseDrops: "10000000",
        reserveIncrementDrops: "2000000",
      };
    }),
  };
}

function input(
  overrides: Partial<Parameters<typeof checkPayerReadiness>[0]> = {},
) {
  return {
    reader: reader(),
    account: ACCOUNT,
    asset: getXrpAssetDescriptor("mainnet"),
    amountUnits: "1000000",
    mainnetAccess: MAINNET_ACCESS,
    ...overrides,
  };
}

describe("checkPayerReadiness", () => {
  it("accepts XRP when spendable balance covers amount and current fee", async () => {
    await expect(checkPayerReadiness(input())).resolves.toEqual({
      status: "ready",
      network: "mainnet",
      account: ACCOUNT,
      assetId: "xrpl:mainnet:xrp",
      amountUnits: "1000000",
      balanceDrops: "50000000",
      reserveDrops: "14000000",
      spendableXrpDrops: "36000000",
      requiredXrpDrops: "1000012",
      estimatedFeeDrops: "12",
      trustLineChecked: false,
    });
  });

  it("blocks XRP when reserve-aware spendable balance is insufficient", async () => {
    await expect(
      checkPayerReadiness(
        input({ reader: reader({ balanceDrops: "14500000" }) }),
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "insufficient_spendable_xrp",
      spendableXrpDrops: "500000",
      requiredXrpDrops: "1000012",
    });
  });

  it("requires fee XRP and enough official RLUSD balance", async () => {
    const asset = getRlusdAssetDescriptor("mainnet");
    await expect(
      checkPayerReadiness(
        input({
          asset,
          amountUnits: "1250000",
          reader: reader({ lines: [line({ balance: "1.25" })] }),
        }),
      ),
    ).resolves.toMatchObject({
      status: "ready",
      assetId: "xrpl:mainnet:rlusd",
      requiredXrpDrops: "12",
      issuedBalance: "1.25",
      trustLineChecked: true,
    });
  });

  it("blocks missing, frozen, unauthorized, and insufficient trust lines", async () => {
    const asset = getRlusdAssetDescriptor("mainnet");
    await expect(
      checkPayerReadiness(input({ asset, reader: reader({ lines: [] }) })),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "trust_line_missing",
    });
    await expect(
      checkPayerReadiness(
        input({ asset, reader: reader({ lines: [line({ freeze_peer: true })] }) }),
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "trust_line_frozen",
    });
    await expect(
      checkPayerReadiness(
        input({
          asset,
          reader: reader({
            issuerFlags: { requireAuthorization: true },
            lines: [line({ peer_authorized: false })],
          }),
        }),
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "trust_line_not_authorized",
    });
    await expect(
      checkPayerReadiness(
        input({
          asset,
          amountUnits: "2000000",
          reader: reader({ lines: [line({ balance: "1.999999" })] }),
        }),
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "issued_balance_insufficient",
    });
  });

  it("returns unavailable for transient validated-ledger read failure", async () => {
    await expect(
      checkPayerReadiness(input({ reader: reader({ unavailable: true }) })),
    ).resolves.toMatchObject({
      status: "unavailable",
      reason: "validated_ledger_data_unavailable",
    });
  });

  it("rejects network mismatch and altered asset identity", async () => {
    await expect(
      checkPayerReadiness(
        input({ reader: { ...reader(), network: "testnet" } }),
      ),
    ).rejects.toBeInstanceOf(PayerReadinessConfigurationError);

    const asset = getRlusdAssetDescriptor("mainnet");
    await expect(
      checkPayerReadiness(input({ asset: { ...asset, precision: 5 } })),
    ).rejects.toBeInstanceOf(PayerReadinessConfigurationError);
  });
});
