import { describe, expect, it, vi } from "vitest";

import {
  getRlusdAssetDescriptor,
  getXrpAssetDescriptor,
} from "@/features/assets/registry";

import {
  XrplAccountReadUnavailableError,
  type XrplAccountFlags,
  type XrplRecipientReadClient,
  type XrplTrustLine,
} from "./account-read-client";
import {
  checkRecipientReadiness,
  RecipientReadinessConfigurationError,
} from "./recipient-readiness";

const DESTINATION = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
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

function trustLine(overrides: Partial<XrplTrustLine> = {}): XrplTrustLine {
  return {
    account: ISSUER,
    balance: "10",
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
  destinationFlags?: Partial<XrplAccountFlags>;
  issuerFlags?: Partial<XrplAccountFlags>;
  destinationMissing?: boolean;
  issuerMissing?: boolean;
  lines?: XrplTrustLine[];
  unavailable?: boolean;
} = {}): XrplRecipientReadClient {
  const getAccountInfo = vi.fn(async (account: string) => {
    if (options.unavailable) throw new XrplAccountReadUnavailableError();
    if (account === DESTINATION) {
      return options.destinationMissing
        ? null
        : { account, flags: flags(options.destinationFlags) };
    }
    return options.issuerMissing
      ? null
      : { account, flags: flags(options.issuerFlags) };
  });

  return {
    network: "mainnet",
    getAccountInfo,
    getTrustLines: vi.fn(async () => options.lines ?? [trustLine()]),
  };
}

function mainnetInput(
  overrides: Partial<Parameters<typeof checkRecipientReadiness>[0]> = {},
) {
  return {
    reader: reader(),
    destination: DESTINATION,
    destinationTag: null,
    asset: getRlusdAssetDescriptor("mainnet"),
    amountUnits: "1000000",
    mainnetAccess: MAINNET_ACCESS,
    ...overrides,
  };
}

describe("checkRecipientReadiness", () => {
  it("accepts an existing XRP recipient on a validated ledger", async () => {
    await expect(
      checkRecipientReadiness({
        ...mainnetInput(),
        reader: reader(),
        asset: getXrpAssetDescriptor("mainnet"),
      }),
    ).resolves.toEqual({
      status: "ready",
      network: "mainnet",
      destination: DESTINATION,
      assetId: "xrpl:mainnet:xrp",
      amountUnits: "1000000",
      destinationTagRequired: false,
      trustLineChecked: false,
    });
  });

  it("blocks missing accounts, required tags, and Deposit Authorization", async () => {
    await expect(
      checkRecipientReadiness(
        mainnetInput({ reader: reader({ destinationMissing: true }) }),
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "account_not_found",
    });

    await expect(
      checkRecipientReadiness(
        mainnetInput({
          reader: reader({
            destinationFlags: { requireDestinationTag: true },
          }),
        }),
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "destination_tag_required",
    });

    await expect(
      checkRecipientReadiness(
        mainnetInput({
          destinationTag: 7,
          reader: reader({ destinationFlags: { depositAuth: true } }),
        }),
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "deposit_authorization_required",
    });
  });

  it("accepts an exact RLUSD trust line with enough remaining capacity", async () => {
    await expect(
      checkRecipientReadiness(
        mainnetInput({
          reader: reader({
            lines: [
              trustLine({
                balance: "9.995e2",
                limit: "1001",
              }),
            ],
          }),
        }),
      ),
    ).resolves.toMatchObject({
      status: "ready",
      assetId: "xrpl:mainnet:rlusd",
      trustLineChecked: true,
    });
  });

  it("requires the exact issuer and currency trust line", async () => {
    await expect(
      checkRecipientReadiness(
        mainnetInput({
          reader: reader({
            lines: [trustLine({ currency: "USD" })],
          }),
        }),
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "trust_line_missing",
    });
  });

  it("blocks frozen, unauthorized, and globally frozen issued Assets", async () => {
    await expect(
      checkRecipientReadiness(
        mainnetInput({
          reader: reader({ lines: [trustLine({ freeze_peer: true })] }),
        }),
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "trust_line_frozen",
    });

    await expect(
      checkRecipientReadiness(
        mainnetInput({
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

    await expect(
      checkRecipientReadiness(
        mainnetInput({
          reader: reader({ issuerFlags: { globalFreeze: true } }),
        }),
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "issuer_global_freeze",
    });
  });

  it("blocks trust lines without enough capacity for the frozen amount", async () => {
    await expect(
      checkRecipientReadiness(
        mainnetInput({
          amountUnits: "1000000",
          reader: reader({
            lines: [trustLine({ balance: "99.5", limit: "100" })],
          }),
        }),
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "trust_line_limit_insufficient",
    });
  });

  it("returns unavailable instead of treating unvalidated data as ready", async () => {
    await expect(
      checkRecipientReadiness(
        mainnetInput({ reader: reader({ unavailable: true }) }),
      ),
    ).resolves.toMatchObject({
      status: "unavailable",
      reason: "validated_ledger_data_unavailable",
    });
  });

  it("rejects network mismatches and altered Asset identities", async () => {
    await expect(
      checkRecipientReadiness(
        mainnetInput({
          reader: {
            ...reader(),
            network: "testnet",
          },
        }),
      ),
    ).rejects.toBeInstanceOf(RecipientReadinessConfigurationError);

    const canonical = getRlusdAssetDescriptor("mainnet");
    await expect(
      checkRecipientReadiness(
        mainnetInput({
          asset: { ...canonical, precision: 5 },
        }),
      ),
    ).rejects.toBeInstanceOf(RecipientReadinessConfigurationError);
  });
});
