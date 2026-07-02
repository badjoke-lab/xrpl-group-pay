import { describe, expect, it } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";

import {
  buildRlusdTrustSetIntent,
  RlusdTrustSetBuildError,
  TRUSTSET_SET_NO_RIPPLE_FLAG,
} from "./rlusd-trustset";

const ACCOUNT = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";

function input(
  overrides: Partial<Parameters<typeof buildRlusdTrustSetIntent>[0]> = {},
) {
  return {
    preparationId: "00000000-0000-4000-8000-000000000001",
    network: "testnet" as const,
    account: ACCOUNT,
    requiredAmountUnits: "1250000",
    limitUnits: "1250000",
    signingState: {
      account: ACCOUNT,
      sequence: 10,
      validatedLedgerIndex: 100,
    },
    ...overrides,
  };
}

describe("buildRlusdTrustSetIntent", () => {
  it("pins the signer, official Testnet RLUSD identity, No Ripple, and ledger window", () => {
    const asset = getRlusdAssetDescriptor("testnet");
    const intent = buildRlusdTrustSetIntent(input());

    expect(intent).toMatchObject({
      intentId: "rlusd-trustset:00000000-0000-4000-8000-000000000001:v1",
      network: "testnet",
      account: ACCOUNT,
      asset,
      requiredAmountUnits: "1250000",
      limitUnits: "1250000",
      limitValue: "1.25",
      transaction: {
        TransactionType: "TrustSet",
        Account: ACCOUNT,
        Sequence: 10,
        LastLedgerSequence: 160,
        Flags: TRUSTSET_SET_NO_RIPPLE_FLAG,
        LimitAmount: {
          currency: asset.currency,
          issuer: asset.issuer,
          value: "1.25",
        },
      },
      payload: {
        options: {
          submit: true,
          expire: 5,
          force_network: "TESTNET",
        },
      },
    });
    expect(intent.transaction).not.toHaveProperty("Destination");
    expect(intent.transaction).not.toHaveProperty("Amount");
  });

  it("uses only approved Mainnet RLUSD when the gate is explicit", () => {
    const asset = getRlusdAssetDescriptor("mainnet");
    const intent = buildRlusdTrustSetIntent(
      input({
        network: "mainnet",
        mainnetAccess: {
          network: "mainnet",
          mainnetGateApproved: true,
        },
      }),
    );

    expect(intent.asset).toEqual(asset);
    expect(intent.payload.options.force_network).toBe("MAINNET");
  });

  it("rejects missing Mainnet approval, wrong signer, and insufficient limit", () => {
    expect(() =>
      buildRlusdTrustSetIntent(input({ network: "mainnet" })),
    ).toThrow();
    expect(() =>
      buildRlusdTrustSetIntent(
        input({
          signingState: {
            account: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
            sequence: 10,
            validatedLedgerIndex: 100,
          },
        }),
      ),
    ).toThrow(RlusdTrustSetBuildError);
    expect(() =>
      buildRlusdTrustSetIntent(input({ limitUnits: "1249999" })),
    ).toThrow(RlusdTrustSetBuildError);
  });
});
