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
  type XrplRecipientReadClient,
  type XrplTrustLine,
} from "./account-read-client";

const UINT32_MAX = 4_294_967_295;

type ParsedDecimal = {
  coefficient: bigint;
  scale: number;
};

export type RecipientReadinessBlockReason =
  | "account_not_found"
  | "destination_tag_required"
  | "deposit_authorization_required"
  | "issuer_not_found"
  | "issuer_global_freeze"
  | "trust_line_missing"
  | "trust_line_frozen"
  | "trust_line_not_authorized"
  | "trust_line_limit_insufficient"
  | "trust_line_data_invalid";

export type RecipientReadinessResult =
  | {
      status: "ready";
      network: "testnet" | "mainnet";
      destination: string;
      assetId: string;
      amountUnits: string;
      destinationTagRequired: boolean;
      trustLineChecked: boolean;
    }
  | {
      status: "blocked";
      reason: RecipientReadinessBlockReason;
      network: "testnet" | "mainnet";
      destination: string;
      assetId: string;
    }
  | {
      status: "unavailable";
      reason: "validated_ledger_data_unavailable";
      network: "testnet" | "mainnet";
      destination: string;
      assetId: string;
    };

export class RecipientReadinessConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipientReadinessConfigurationError";
  }
}

function isExactAsset(actual: AssetDescriptor, expected: AssetDescriptor) {
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

function requireCanonicalAsset(
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
      throw new RecipientReadinessConfigurationError(
        "The Settlement Asset is not registered.",
      );
    }
    throw error;
  }

  if (!isExactAsset(asset, canonical)) {
    throw new RecipientReadinessConfigurationError(
      "The Settlement Asset does not match its canonical registry identity.",
    );
  }
  return canonical;
}

function requireDestinationTag(value: number | null) {
  if (
    value !== null &&
    (!Number.isInteger(value) || value < 0 || value > UINT32_MAX)
  ) {
    throw new RecipientReadinessConfigurationError(
      "Destination Tag must be a UInt32 value or null.",
    );
  }
  return value;
}

function parseDecimal(value: string): ParsedDecimal {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(value);
  if (!match) {
    throw new RecipientReadinessConfigurationError(
      "The XRPL trust line contains an invalid decimal value.",
    );
  }

  const fraction = match[3] ?? "";
  const exponent = Number(match[4] ?? "0");
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 100) {
    throw new RecipientReadinessConfigurationError(
      "The XRPL trust line decimal exponent is outside the supported range.",
    );
  }

  const digits = `${match[2]}${fraction}`.replace(/^0+(?=\d)/, "");
  if (digits.length > 64) {
    throw new RecipientReadinessConfigurationError(
      "The XRPL trust line decimal is too large to validate safely.",
    );
  }

  const sign = match[1] === "-" ? -1n : 1n;
  return {
    coefficient: sign * BigInt(digits || "0"),
    scale: fraction.length - exponent,
  };
}

function alignDecimal(value: ParsedDecimal, scale: number) {
  const power = scale - value.scale;
  if (power < 0 || power > 200) {
    throw new RecipientReadinessConfigurationError(
      "The XRPL trust line decimal cannot be compared safely.",
    );
  }
  return value.coefficient * 10n ** BigInt(power);
}

function hasTrustLineCapacity(
  line: XrplTrustLine,
  amountUnits: string,
  amountScale: number,
) {
  const limit = parseDecimal(line.limit);
  const balance = parseDecimal(line.balance);
  if (limit.coefficient < 0n) {
    throw new RecipientReadinessConfigurationError(
      "The XRPL trust line limit cannot be negative.",
    );
  }

  const commonScale = Math.max(limit.scale, balance.scale, amountScale, 0);
  const available =
    alignDecimal(limit, commonScale) - alignDecimal(balance, commonScale);
  const requested = BigInt(amountUnits) * 10n ** BigInt(commonScale - amountScale);
  return available >= requested;
}

function blocked(
  reason: RecipientReadinessBlockReason,
  input: {
    network: "testnet" | "mainnet";
    destination: string;
    assetId: string;
  },
): RecipientReadinessResult {
  return { status: "blocked", reason, ...input };
}

export async function checkRecipientReadiness(input: {
  reader: XrplRecipientReadClient;
  destination: string;
  destinationTag: number | null;
  asset: AssetDescriptor;
  amountUnits: string;
  mainnetAccess?: MainnetAssetAccess;
}): Promise<RecipientReadinessResult> {
  if (!isValidClassicAddress(input.destination)) {
    throw new RecipientReadinessConfigurationError(
      "Recipient readiness requires a valid classic XRPL destination.",
    );
  }
  requireDestinationTag(input.destinationTag);

  const amount = moneyUnitsSchema.safeParse(input.amountUnits);
  if (!amount.success || BigInt(amount.data) <= 0n) {
    throw new RecipientReadinessConfigurationError(
      "Recipient readiness requires a positive canonical amount.",
    );
  }

  const asset = requireCanonicalAsset(input.asset, input.mainnetAccess);
  if (asset.network !== input.reader.network) {
    throw new RecipientReadinessConfigurationError(
      "The XRPL reader network must match the Settlement Asset network.",
    );
  }

  const identity = {
    network: asset.network,
    destination: input.destination,
    assetId: asset.id,
  };

  try {
    const destination = await input.reader.getAccountInfo(input.destination);
    if (!destination) return blocked("account_not_found", identity);
    if (
      destination.flags.requireDestinationTag &&
      input.destinationTag === null
    ) {
      return blocked("destination_tag_required", identity);
    }
    if (destination.flags.depositAuth) {
      return blocked("deposit_authorization_required", identity);
    }

    if (asset.assetType === "native") {
      return {
        status: "ready",
        ...identity,
        amountUnits: amount.data,
        destinationTagRequired: destination.flags.requireDestinationTag,
        trustLineChecked: false,
      };
    }

    const issuer = await input.reader.getAccountInfo(asset.issuer);
    if (!issuer) return blocked("issuer_not_found", identity);
    if (issuer.flags.globalFreeze) {
      return blocked("issuer_global_freeze", identity);
    }

    const lines = await input.reader.getTrustLines(
      input.destination,
      asset.issuer,
    );
    const line = lines.find(
      (candidate) =>
        candidate.account === asset.issuer &&
        candidate.currency === asset.currency,
    );
    if (!line) return blocked("trust_line_missing", identity);
    if (
      line.freeze ||
      line.freeze_peer ||
      line.deep_freeze ||
      line.deep_freeze_peer
    ) {
      return blocked("trust_line_frozen", identity);
    }
    if (issuer.flags.requireAuthorization && !line.peer_authorized) {
      return blocked("trust_line_not_authorized", identity);
    }

    let hasCapacity: boolean;
    try {
      hasCapacity = hasTrustLineCapacity(
        line,
        amount.data,
        asset.precision,
      );
    } catch (error) {
      if (error instanceof RecipientReadinessConfigurationError) {
        return blocked("trust_line_data_invalid", identity);
      }
      throw error;
    }
    if (!hasCapacity) {
      return blocked("trust_line_limit_insufficient", identity);
    }

    return {
      status: "ready",
      ...identity,
      amountUnits: amount.data,
      destinationTagRequired: destination.flags.requireDestinationTag,
      trustLineChecked: true,
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
