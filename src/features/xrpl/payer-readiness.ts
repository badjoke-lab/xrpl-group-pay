import { isValidClassicAddress } from "xrpl";

import {
  type MainnetAssetAccess,
  requireApprovedMainnetSettlementAsset,
} from "@/features/assets/mainnet-registry";
import { assetRegistry, AssetRegistryError } from "@/features/assets/registry";
import type { AssetDescriptor } from "@/features/assets/types";
import { moneyUnitsSchema } from "@/features/money/types";

import {
  XrplAccountReadUnavailableError,
  type XrplReadinessClient,
  type XrplTrustLine,
} from "./account-read-client";

export type PayerReadinessBlockReason =
  | "account_not_found"
  | "insufficient_spendable_xrp"
  | "issuer_not_found"
  | "issuer_global_freeze"
  | "trust_line_missing"
  | "trust_line_frozen"
  | "trust_line_not_authorized"
  | "issued_balance_insufficient"
  | "trust_line_data_invalid";

export type PayerReadinessResult =
  | {
      status: "ready";
      network: "testnet" | "mainnet";
      account: string;
      assetId: string;
      amountUnits: string;
      balanceDrops: string;
      reserveDrops: string;
      spendableXrpDrops: string;
      requiredXrpDrops: string;
      estimatedFeeDrops: string;
      trustLineChecked: boolean;
      issuedBalance?: string;
    }
  | {
      status: "blocked";
      reason: PayerReadinessBlockReason;
      network: "testnet" | "mainnet";
      account: string;
      assetId: string;
      balanceDrops?: string;
      reserveDrops?: string;
      spendableXrpDrops?: string;
      requiredXrpDrops?: string;
      estimatedFeeDrops?: string;
      issuedBalance?: string;
    }
  | {
      status: "unavailable";
      reason: "validated_ledger_data_unavailable";
      network: "testnet" | "mainnet";
      account: string;
      assetId: string;
    };

export class PayerReadinessConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayerReadinessConfigurationError";
  }
}

type ParsedDecimal = {
  coefficient: bigint;
  scale: number;
};

function exactAsset(actual: AssetDescriptor, expected: AssetDescriptor) {
  return (
    actual.id === expected.id &&
    actual.paymentRail === expected.paymentRail &&
    actual.network === expected.network &&
    actual.assetType === expected.assetType &&
    actual.currency === expected.currency &&
    actual.issuer === expected.issuer &&
    actual.precision === expected.precision &&
    actual.symbol === expected.symbol &&
    actual.verificationStrategy === expected.verificationStrategy &&
    actual.receiptContract === expected.receiptContract
  );
}

function canonicalAsset(
  asset: AssetDescriptor,
  mainnetAccess: MainnetAssetAccess | undefined,
) {
  let canonical: AssetDescriptor;
  try {
    canonical =
      asset.network === "mainnet"
        ? requireApprovedMainnetSettlementAsset(asset.id, mainnetAccess)
        : assetRegistry.require(asset.id);
  } catch (error) {
    if (error instanceof AssetRegistryError) {
      throw new PayerReadinessConfigurationError(
        "The Settlement Asset is not registered.",
      );
    }
    throw error;
  }

  if (!exactAsset(asset, canonical)) {
    throw new PayerReadinessConfigurationError(
      "The Settlement Asset does not match its canonical registry identity.",
    );
  }
  return canonical;
}

function parseDecimal(value: string): ParsedDecimal {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(value);
  if (!match) {
    throw new PayerReadinessConfigurationError(
      "The XRPL trust line contains an invalid decimal value.",
    );
  }

  const fraction = match[3] ?? "";
  const exponent = Number(match[4] ?? "0");
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 100) {
    throw new PayerReadinessConfigurationError(
      "The XRPL trust line decimal exponent is outside the supported range.",
    );
  }

  const digits = `${match[2]}${fraction}`.replace(/^0+(?=\d)/, "");
  if (digits.length > 64) {
    throw new PayerReadinessConfigurationError(
      "The XRPL trust line decimal is too large to validate safely.",
    );
  }

  return {
    coefficient: (match[1] === "-" ? -1n : 1n) * BigInt(digits || "0"),
    scale: fraction.length - exponent,
  };
}

function alignDecimal(value: ParsedDecimal, scale: number) {
  const power = scale - value.scale;
  if (power < 0 || power > 200) {
    throw new PayerReadinessConfigurationError(
      "The XRPL trust line decimal cannot be compared safely.",
    );
  }
  return value.coefficient * 10n ** BigInt(power);
}

function hasIssuedBalance(
  line: XrplTrustLine,
  amountUnits: string,
  amountScale: number,
) {
  const balance = parseDecimal(line.balance);
  const commonScale = Math.max(balance.scale, amountScale, 0);
  const observed = alignDecimal(balance, commonScale);
  const required =
    BigInt(amountUnits) * 10n ** BigInt(commonScale - amountScale);
  return observed >= required;
}

function maximumDrops(...values: string[]) {
  return values.reduce(
    (maximum, value) => (BigInt(value) > maximum ? BigInt(value) : maximum),
    0n,
  );
}

function blocked(
  reason: PayerReadinessBlockReason,
  identity: {
    network: "testnet" | "mainnet";
    account: string;
    assetId: string;
  },
  observed: Partial<Extract<PayerReadinessResult, { status: "blocked" }>> = {},
): PayerReadinessResult {
  return { status: "blocked", reason, ...identity, ...observed };
}

export async function checkPayerReadiness(input: {
  reader: XrplReadinessClient;
  account: string;
  asset: AssetDescriptor;
  amountUnits: string;
  mainnetAccess?: MainnetAssetAccess;
}): Promise<PayerReadinessResult> {
  if (!isValidClassicAddress(input.account)) {
    throw new PayerReadinessConfigurationError(
      "Payer readiness requires a valid classic XRPL account.",
    );
  }

  const amount = moneyUnitsSchema.safeParse(input.amountUnits);
  if (!amount.success || BigInt(amount.data) <= 0n) {
    throw new PayerReadinessConfigurationError(
      "Payer readiness requires a positive canonical amount.",
    );
  }

  const asset = canonicalAsset(input.asset, input.mainnetAccess);
  if (asset.network !== input.reader.network) {
    throw new PayerReadinessConfigurationError(
      "The XRPL reader network must match the Settlement Asset network.",
    );
  }

  const identity = {
    network: asset.network,
    account: input.account,
    assetId: asset.id,
  };

  try {
    const [account, network] = await Promise.all([
      input.reader.getAccountInfo(input.account),
      input.reader.getNetworkReadinessState(),
    ]);
    if (!account) return blocked("account_not_found", identity);

    const balanceDrops = BigInt(account.balanceDrops);
    const reserveDrops =
      BigInt(network.reserveBaseDrops) +
      BigInt(account.ownerCount) * BigInt(network.reserveIncrementDrops);
    const spendableDrops = balanceDrops > reserveDrops
      ? balanceDrops - reserveDrops
      : 0n;
    const estimatedFeeDrops = maximumDrops(
      network.baseFeeDrops,
      network.minimumFeeDrops,
      network.openLedgerFeeDrops,
    );
    const requiredXrpDrops =
      estimatedFeeDrops +
      (asset.assetType === "native" ? BigInt(amount.data) : 0n);
    const xrpFacts = {
      balanceDrops: balanceDrops.toString(),
      reserveDrops: reserveDrops.toString(),
      spendableXrpDrops: spendableDrops.toString(),
      requiredXrpDrops: requiredXrpDrops.toString(),
      estimatedFeeDrops: estimatedFeeDrops.toString(),
    };

    if (spendableDrops < requiredXrpDrops) {
      return blocked("insufficient_spendable_xrp", identity, xrpFacts);
    }

    if (asset.assetType === "native") {
      return {
        status: "ready",
        ...identity,
        amountUnits: amount.data,
        ...xrpFacts,
        trustLineChecked: false,
      };
    }

    const issuer = await input.reader.getAccountInfo(asset.issuer);
    if (!issuer) return blocked("issuer_not_found", identity, xrpFacts);
    if (issuer.flags.globalFreeze) {
      return blocked("issuer_global_freeze", identity, xrpFacts);
    }

    const lines = await input.reader.getTrustLines(input.account, asset.issuer);
    const line = lines.find(
      (candidate) =>
        candidate.account === asset.issuer &&
        candidate.currency === asset.currency,
    );
    if (!line) return blocked("trust_line_missing", identity, xrpFacts);
    if (
      line.freeze ||
      line.freeze_peer ||
      line.deep_freeze ||
      line.deep_freeze_peer
    ) {
      return blocked("trust_line_frozen", identity, {
        ...xrpFacts,
        issuedBalance: line.balance,
      });
    }
    if (issuer.flags.requireAuthorization && !line.peer_authorized) {
      return blocked("trust_line_not_authorized", identity, {
        ...xrpFacts,
        issuedBalance: line.balance,
      });
    }

    let sufficient: boolean;
    try {
      sufficient = hasIssuedBalance(line, amount.data, asset.precision);
    } catch (error) {
      if (error instanceof PayerReadinessConfigurationError) {
        return blocked("trust_line_data_invalid", identity, xrpFacts);
      }
      throw error;
    }
    if (!sufficient) {
      return blocked("issued_balance_insufficient", identity, {
        ...xrpFacts,
        issuedBalance: line.balance,
      });
    }

    return {
      status: "ready",
      ...identity,
      amountUnits: amount.data,
      ...xrpFacts,
      trustLineChecked: true,
      issuedBalance: line.balance,
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
