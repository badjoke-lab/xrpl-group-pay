import { isValidClassicAddress } from "xrpl";

import type { MainnetAssetAccess } from "@/features/assets/mainnet-registry";
import { requireApprovedMainnetSettlementAsset } from "@/features/assets/mainnet-registry";
import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type { IssuedAssetDescriptor, XrplNetwork } from "@/features/assets/types";
import { unitsToDecimal } from "@/features/money/money";
import { moneyUnitsSchema } from "@/features/money/types";
import type { D1DatabaseLike } from "@/features/persistence/d1-types";

import {
  XrplAccountReadUnavailableError,
  type XrplReadinessClient,
  type XrplTrustLine,
} from "./account-read-client";
import {
  createRlusdTrustSetPreparation,
  type RlusdTrustSetPurpose,
} from "./rlusd-trustset-store";

export type RlusdTrustSetPlanBlockReason =
  | "account_not_found"
  | "issuer_not_found"
  | "issuer_global_freeze"
  | "trust_line_frozen"
  | "trust_line_not_authorized"
  | "trust_line_data_invalid"
  | "insufficient_xrp_for_trustset";

export type RlusdTrustSetPlan =
  | {
      status: "created";
      preparationStatus: "required" | "not_required";
      publicId: string;
      capabilityToken: string;
      network: XrplNetwork;
      purpose: RlusdTrustSetPurpose;
      account: string;
      asset: IssuedAssetDescriptor;
      requiredAmountUnits: string;
      trustLimitUnits: string;
      trustLimitValue: string;
    }
  | {
      status: "blocked";
      reason: RlusdTrustSetPlanBlockReason;
      network: XrplNetwork;
      account: string;
      assetId: string;
      requiredXrpDrops?: string;
      spendableXrpDrops?: string;
    }
  | {
      status: "unavailable";
      reason: "validated_ledger_data_unavailable";
      network: XrplNetwork;
      account: string;
      assetId: string;
    };

export class RlusdTrustSetPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RlusdTrustSetPlanError";
  }
}

type Decimal = { coefficient: bigint; scale: number };

function parseDecimal(value: string): Decimal {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(value);
  if (!match) throw new RlusdTrustSetPlanError("Invalid trust-line decimal.");
  const fraction = match[3] ?? "";
  const exponent = Number(match[4] ?? "0");
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 100) {
    throw new RlusdTrustSetPlanError("Unsupported trust-line exponent.");
  }
  const digits = `${match[2]}${fraction}`.replace(/^0+(?=\d)/, "");
  if (digits.length > 64) {
    throw new RlusdTrustSetPlanError("Trust-line decimal is too large.");
  }
  return {
    coefficient: (match[1] === "-" ? -1n : 1n) * BigInt(digits || "0"),
    scale: fraction.length - exponent,
  };
}

function decimalToUnits(value: string, targetScale: number) {
  const parsed = parseDecimal(value);
  const power = targetScale - parsed.scale;
  if (power < 0) {
    const divisor = 10n ** BigInt(-power);
    if (parsed.coefficient % divisor !== 0n) {
      throw new RlusdTrustSetPlanError(
        "Trust-line decimal exceeds the supported precision.",
      );
    }
    return parsed.coefficient / divisor;
  }
  if (power > 200) {
    throw new RlusdTrustSetPlanError("Trust-line decimal scale is too large.");
  }
  return parsed.coefficient * 10n ** BigInt(power);
}

function maximum(...values: bigint[]) {
  return values.reduce((result, value) => (value > result ? value : result), 0n);
}

function exactLine(
  lines: XrplTrustLine[],
  asset: IssuedAssetDescriptor,
) {
  return lines.find(
    (line) =>
      line.account === asset.issuer && line.currency === asset.currency,
  );
}

function canonicalAsset(
  network: XrplNetwork,
  mainnetAccess: MainnetAssetAccess | undefined,
) {
  const asset = getRlusdAssetDescriptor(network);
  if (network === "mainnet") {
    const approved = requireApprovedMainnetSettlementAsset(
      asset.id,
      mainnetAccess,
    );
    if (
      approved.assetType !== "issued" ||
      approved.issuer !== asset.issuer ||
      approved.currency !== asset.currency
    ) {
      throw new RlusdTrustSetPlanError(
        "The approved Mainnet RLUSD identity is unavailable.",
      );
    }
  }
  return asset;
}

export async function planRlusdTrustSetPreparation(input: {
  database: D1DatabaseLike;
  reader: XrplReadinessClient;
  network: XrplNetwork;
  purpose: RlusdTrustSetPurpose;
  account: string;
  requiredAmountUnits: string;
  mainnetAccess?: MainnetAssetAccess;
  now?: Date;
}): Promise<RlusdTrustSetPlan> {
  if (!isValidClassicAddress(input.account)) {
    throw new RlusdTrustSetPlanError(
      "RLUSD preparation requires a valid classic XRPL account.",
    );
  }
  const required = moneyUnitsSchema.safeParse(input.requiredAmountUnits);
  if (!required.success || BigInt(required.data) <= 0n) {
    throw new RlusdTrustSetPlanError(
      "RLUSD preparation requires a positive canonical amount.",
    );
  }
  if (input.reader.network !== input.network) {
    throw new RlusdTrustSetPlanError(
      "The readiness reader network does not match the preparation network.",
    );
  }

  const asset = canonicalAsset(input.network, input.mainnetAccess);
  const identity = {
    network: input.network,
    account: input.account,
    assetId: asset.id,
  };

  try {
    const [account, issuer, lines, networkState] = await Promise.all([
      input.reader.getAccountInfo(input.account),
      input.reader.getAccountInfo(asset.issuer),
      input.reader.getTrustLines(input.account, asset.issuer),
      input.reader.getNetworkReadinessState(),
    ]);
    if (!account) return { status: "blocked", reason: "account_not_found", ...identity };
    if (!issuer) return { status: "blocked", reason: "issuer_not_found", ...identity };
    if (issuer.flags.globalFreeze) {
      return { status: "blocked", reason: "issuer_global_freeze", ...identity };
    }

    const line = exactLine(lines, asset);
    if (
      line &&
      (line.freeze ||
        line.freeze_peer ||
        line.deep_freeze ||
        line.deep_freeze_peer)
    ) {
      return { status: "blocked", reason: "trust_line_frozen", ...identity };
    }
    if (line && issuer.flags.requireAuthorization && !line.peer_authorized) {
      return {
        status: "blocked",
        reason: "trust_line_not_authorized",
        ...identity,
      };
    }

    let currentBalance = 0n;
    let currentLimit = 0n;
    try {
      if (line) {
        currentBalance = decimalToUnits(line.balance, asset.precision);
        currentLimit = decimalToUnits(line.limit, asset.precision);
      }
    } catch (error) {
      if (error instanceof RlusdTrustSetPlanError) {
        return {
          status: "blocked",
          reason: "trust_line_data_invalid",
          ...identity,
        };
      }
      throw error;
    }

    const requiredUnits = BigInt(required.data);
    const positiveBalance = currentBalance > 0n ? currentBalance : 0n;
    const targetLimit =
      input.purpose === "recipient"
        ? maximum(currentLimit, positiveBalance + requiredUnits)
        : maximum(currentLimit, requiredUnits);
    const trustLineReady = line !== undefined && currentLimit >= targetLimit;
    const preparationStatus = trustLineReady ? "not_required" : "required";

    if (!trustLineReady) {
      const balanceDrops = BigInt(account.balanceDrops);
      const currentReserve =
        BigInt(networkState.reserveBaseDrops) +
        BigInt(account.ownerCount) * BigInt(networkState.reserveIncrementDrops);
      const futureReserve =
        currentReserve +
        (line ? 0n : BigInt(networkState.reserveIncrementDrops));
      const spendableAfterReserve =
        balanceDrops > futureReserve ? balanceDrops - futureReserve : 0n;
      const estimatedFee = maximum(
        BigInt(networkState.baseFeeDrops),
        BigInt(networkState.minimumFeeDrops),
        BigInt(networkState.openLedgerFeeDrops),
      );
      if (spendableAfterReserve < estimatedFee) {
        return {
          status: "blocked",
          reason: "insufficient_xrp_for_trustset",
          ...identity,
          requiredXrpDrops: (futureReserve + estimatedFee).toString(),
          spendableXrpDrops: spendableAfterReserve.toString(),
        };
      }
    }

    const trustLimitUnits = targetLimit.toString();
    const trustLimitValue = unitsToDecimal(
      trustLimitUnits,
      asset.precision,
    );
    const created = await createRlusdTrustSetPreparation(
      input.database,
      {
        network: input.network,
        purpose: input.purpose,
        account: input.account,
        assetId: asset.id,
        currency: asset.currency,
        issuer: asset.issuer,
        requiredAmountUnits: required.data,
        amountScale: asset.precision,
        trustLimitUnits,
        trustLimitValue,
        status: preparationStatus,
      },
      { now: input.now },
    );

    return {
      status: "created",
      preparationStatus,
      ...created,
      network: input.network,
      purpose: input.purpose,
      account: input.account,
      asset,
      requiredAmountUnits: required.data,
      trustLimitUnits,
      trustLimitValue,
    };
  } catch (error) {
    if (error instanceof XrplAccountReadUnavailableError) {
      return {
        status: "unavailable",
        reason: "validated_ledger_data_unavailable",
        ...identity,
      };
    }
    throw error;
  }
}
