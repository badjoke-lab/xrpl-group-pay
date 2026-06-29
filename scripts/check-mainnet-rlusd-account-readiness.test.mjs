import { describe, expect, it } from "vitest";

import {
  evaluateMainnetRlusdAccountReadiness,
  MainnetRlusdAccountReadinessError,
} from "./check-mainnet-rlusd-account-readiness.mjs";

const DESTINATION = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const PAYER = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
const CURRENCY = "524C555344000000000000000000000000000000";

function trustLine(overrides = {}) {
  return {
    account: ISSUER,
    balance: "0",
    currency: CURRENCY,
    limit: "100",
    limit_peer: "0",
    authorized: false,
    peer_authorized: true,
    freeze: false,
    freeze_peer: false,
    deep_freeze: false,
    deep_freeze_peer: false,
    ...overrides,
  };
}

function fixtures() {
  return {
    destination: DESTINATION,
    destinationTag: null,
    payer: PAYER,
    primaryAmountUnits: "1",
    billTotalUnits: "2",
    ledgerIndex: 105_300_000,
    reserveBaseDrops: "1000000",
    reserveIncrementDrops: "200000",
    feeDrops: {
      baseFee: "10",
      minimumFee: "10",
      medianFee: "20",
      openLedgerFee: "10",
    },
    destinationInfo: {
      account: DESTINATION,
      balanceDrops: "5000000",
      ownerCount: "1",
      flags: {
        requireDestinationTag: false,
        depositAuth: false,
        globalFreeze: false,
        requireAuthorization: false,
      },
    },
    payerInfo: {
      account: PAYER,
      balanceDrops: "2000000",
      ownerCount: "2",
      flags: {
        requireDestinationTag: false,
        depositAuth: false,
        globalFreeze: false,
        requireAuthorization: false,
      },
    },
    issuerInfo: {
      account: ISSUER,
      balanceDrops: "100000000",
      ownerCount: "100",
      flags: {
        requireDestinationTag: false,
        depositAuth: false,
        globalFreeze: false,
        requireAuthorization: false,
      },
    },
    destinationLines: [trustLine()],
    payerLines: [trustLine({ balance: "1" })],
  };
}

function expectBlocked(input, code) {
  try {
    evaluateMainnetRlusdAccountReadiness(input);
    throw new Error("Expected readiness evaluation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(MainnetRlusdAccountReadinessError);
    expect(error.code).toBe(code);
  }
}

describe("Mainnet RLUSD account readiness evaluation", () => {
  it("accepts exact official trust lines, full Bill capacity, payer balance, and XRP fee headroom", () => {
    const result = evaluateMainnetRlusdAccountReadiness(fixtures());

    expect(result).toMatchObject({
      schema_version: 1,
      network: "mainnet",
      state: "ready",
      asset_id: "xrpl:mainnet:rlusd",
      currency: CURRENCY,
      issuer: ISSUER,
      ledger_index: 105_300_000,
      destination: {
        address: DESTINATION,
        destination_tag: null,
        trust_line_checked: true,
        full_bill_capacity_ready: true,
      },
      payer: {
        address: PAYER,
        trust_line_checked: true,
        primary_amount_units: "1",
        rlusd_balance_ready: true,
        reserve_requirement_drops: "1400000",
        spendable_xrp_drops: "600000",
        required_fee_headroom_drops: "80",
        xrp_fee_headroom_ready: true,
      },
      bill_total_units: "2",
      issuer_global_freeze: false,
    });
  });

  it("requires a Destination Tag and rejects Deposit Authorization", () => {
    const tagRequired = fixtures();
    tagRequired.destinationInfo.flags.requireDestinationTag = true;
    expectBlocked(tagRequired, "DESTINATION_TAG_REQUIRED");

    const depositAuth = fixtures();
    depositAuth.destinationInfo.flags.depositAuth = true;
    expectBlocked(
      depositAuth,
      "DESTINATION_DEPOSIT_AUTHORIZATION_REQUIRED",
    );
  });

  it("rejects missing, frozen, and unauthorized official trust lines", () => {
    const missing = fixtures();
    missing.destinationLines = [];
    expectBlocked(missing, "DESTINATION_TRUST_LINE_MISSING");

    const frozen = fixtures();
    frozen.payerLines = [trustLine({ balance: "1", freeze_peer: true })];
    expectBlocked(frozen, "PAYER_TRUST_LINE_FROZEN");

    const unauthorized = fixtures();
    unauthorized.issuerInfo.flags.requireAuthorization = true;
    unauthorized.destinationLines = [trustLine({ peer_authorized: false })];
    expectBlocked(unauthorized, "DESTINATION_TRUST_LINE_NOT_AUTHORIZED");
  });

  it("requires capacity for both slots and balance for the primary slot", () => {
    const capacity = fixtures();
    capacity.destinationLines = [trustLine({ limit: "0.000001" })];
    expectBlocked(
      capacity,
      "DESTINATION_TRUST_LINE_CAPACITY_INSUFFICIENT",
    );

    const balance = fixtures();
    balance.payerLines = [trustLine({ balance: "0" })];
    expectBlocked(balance, "PAYER_RLUSD_BALANCE_INSUFFICIENT");
  });

  it("requires XRP above the live reserve calculation for conservative fee headroom", () => {
    const input = fixtures();
    input.payerInfo.balanceDrops = "1400050";
    expectBlocked(input, "PAYER_XRP_FEE_HEADROOM_INSUFFICIENT");
  });

  it("rejects issuer Global Freeze and invalid ledger decimals", () => {
    const freeze = fixtures();
    freeze.issuerInfo.flags.globalFreeze = true;
    expectBlocked(freeze, "ISSUER_GLOBAL_FREEZE");

    const invalid = fixtures();
    invalid.payerLines = [trustLine({ balance: "not-a-number" })];
    expectBlocked(invalid, "INVALID_LEDGER_DATA");
  });
});
