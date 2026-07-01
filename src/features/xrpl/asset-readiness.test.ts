import { describe, expect, it, vi } from "vitest";

import {
  getRlusdAssetDescriptor,
  getXrpAssetDescriptor,
} from "@/features/assets/registry";

import type {
  XrplReadinessClient,
  XrplRecipientReadClient,
} from "./account-read-client";
import { checkAssetReadiness } from "./asset-readiness";

const ACCOUNT = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
const MAINNET_ACCESS = {
  network: "mainnet" as const,
  mainnetGateApproved: true as const,
};
const NOW = () => new Date("2026-07-02T00:00:00.000Z");

function recipientReader(): XrplRecipientReadClient {
  return {
    network: "mainnet",
    getAccountInfo: vi.fn(async () => ({
      account: ACCOUNT,
      flags: {
        requireDestinationTag: false,
        depositAuth: false,
        globalFreeze: false,
        requireAuthorization: false,
        disallowIncomingXRP: false,
      },
    })),
    getTrustLines: vi.fn(async () => []),
  };
}

function payerReader(): XrplReadinessClient {
  return {
    network: "mainnet",
    getAccountInfo: vi.fn(async (account: string) => ({
      account,
      flags: {
        requireDestinationTag: false,
        depositAuth: false,
        globalFreeze: false,
        requireAuthorization: false,
        disallowIncomingXRP: false,
      },
      balanceDrops: "50000000",
      ownerCount: 0,
      validatedLedgerIndex: 100,
    })),
    getTrustLines: vi.fn(async () => [
      {
        account: ISSUER,
        balance: "0.5",
        currency: "524C555344000000000000000000000000000000",
        limit: "1000",
        limit_peer: "0",
        authorized: false,
        peer_authorized: false,
        freeze: false,
        freeze_peer: false,
        deep_freeze: false,
        deep_freeze_peer: false,
      },
    ]),
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

describe("checkAssetReadiness", () => {
  it("normalizes recipient readiness without UI copy", async () => {
    await expect(
      checkAssetReadiness(
        {
          role: "recipient",
          reader: recipientReader(),
          account: ACCOUNT,
          destinationTag: null,
          asset: getXrpAssetDescriptor("mainnet"),
          amountUnits: "1000000",
          mainnetAccess: MAINNET_ACCESS,
        },
        NOW,
      ),
    ).resolves.toEqual({
      strategyId: "xrpl-asset-readiness-v1",
      role: "recipient",
      status: "ready",
      ready: true,
      network: "mainnet",
      account: ACCOUNT,
      assetId: "xrpl:mainnet:xrp",
      amountUnits: "1000000",
      checks: [
        { code: "account_exists", status: "pass" },
        { code: "destination_tag", status: "pass" },
        { code: "deposit_authorization", status: "pass" },
        { code: "native_receive_readiness", status: "pass" },
      ],
      blockingCode: null,
      unavailableCode: null,
      userMessageKey: "readiness.recipient.ready",
      observedAt: "2026-07-02T00:00:00.000Z",
      facts: {
        destinationTagRequired: false,
        trustLineChecked: false,
      },
    });
  });

  it("normalizes payer setup failures with stable codes and facts", async () => {
    const assessment = await checkAssetReadiness(
      {
        role: "payer",
        reader: payerReader(),
        account: ACCOUNT,
        asset: getRlusdAssetDescriptor("mainnet"),
        amountUnits: "1000000",
        mainnetAccess: MAINNET_ACCESS,
      },
      NOW,
    );

    expect(assessment).toMatchObject({
      strategyId: "xrpl-asset-readiness-v1",
      role: "payer",
      status: "blocked",
      ready: false,
      blockingCode: "issued_balance_insufficient",
      unavailableCode: null,
      userMessageKey: "readiness.payer.issued_balance_insufficient",
      observedAt: "2026-07-02T00:00:00.000Z",
      checks: [
        { code: "issued_balance_insufficient", status: "block" },
      ],
      facts: {
        issuedBalance: "0.5",
        estimatedFeeDrops: "10",
      },
    });
  });
});
