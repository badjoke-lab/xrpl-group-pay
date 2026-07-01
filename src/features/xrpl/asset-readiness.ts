import type { MainnetAssetAccess } from "@/features/assets/mainnet-registry";
import type { AssetDescriptor } from "@/features/assets/types";

import type {
  XrplReadinessClient,
  XrplRecipientReadClient,
} from "./account-read-client";
import {
  checkPayerReadiness,
  type PayerReadinessResult,
} from "./payer-readiness";
import {
  checkRecipientReadiness,
  type RecipientReadinessResult,
} from "./recipient-readiness";

export type AssetReadinessRole = "recipient" | "payer";
export type AssetReadinessStatus = "ready" | "blocked" | "unavailable";

export type AssetReadinessCheck = {
  code: string;
  status: "pass" | "block" | "unavailable";
};

export type AssetReadinessAssessment = {
  strategyId: "xrpl-asset-readiness-v1";
  role: AssetReadinessRole;
  status: AssetReadinessStatus;
  ready: boolean;
  network: "testnet" | "mainnet";
  account: string;
  assetId: string;
  amountUnits: string;
  checks: AssetReadinessCheck[];
  blockingCode: string | null;
  unavailableCode: string | null;
  userMessageKey: string;
  observedAt: string;
  facts: Record<string, string | number | boolean | null>;
};

type RecipientInput = {
  role: "recipient";
  reader: XrplRecipientReadClient;
  account: string;
  destinationTag: number | null;
  asset: AssetDescriptor;
  amountUnits: string;
  mainnetAccess?: MainnetAssetAccess;
};

type PayerInput = {
  role: "payer";
  reader: XrplReadinessClient;
  account: string;
  asset: AssetDescriptor;
  amountUnits: string;
  mainnetAccess?: MainnetAssetAccess;
};

export type AssetReadinessInput = RecipientInput | PayerInput;

function assessmentBase(
  role: AssetReadinessRole,
  account: string,
  assetId: string,
  amountUnits: string,
  status: AssetReadinessStatus,
  code: string | null,
  observedAt: string,
): Omit<AssetReadinessAssessment, "checks" | "facts"> {
  const publicCode = code ?? "ready";
  return {
    strategyId: "xrpl-asset-readiness-v1",
    role,
    status,
    ready: status === "ready",
    network: assetId.includes(":mainnet:") ? "mainnet" : "testnet",
    account,
    assetId,
    amountUnits,
    blockingCode: status === "blocked" ? code : null,
    unavailableCode: status === "unavailable" ? code : null,
    userMessageKey: `readiness.${role}.${publicCode}`,
    observedAt,
  };
}

function normalizeRecipient(
  result: RecipientReadinessResult,
  amountUnits: string,
  observedAt: string,
): AssetReadinessAssessment {
  if (result.status === "ready") {
    return {
      ...assessmentBase(
        "recipient",
        result.destination,
        result.assetId,
        amountUnits,
        "ready",
        null,
        observedAt,
      ),
      network: result.network,
      checks: [
        { code: "account_exists", status: "pass" },
        { code: "destination_tag", status: "pass" },
        { code: "deposit_authorization", status: "pass" },
        {
          code: result.trustLineChecked
            ? "issued_receive_readiness"
            : "native_receive_readiness",
          status: "pass",
        },
      ],
      facts: {
        destinationTagRequired: result.destinationTagRequired,
        trustLineChecked: result.trustLineChecked,
      },
    };
  }

  const status = result.status;
  const code = result.reason;
  return {
    ...assessmentBase(
      "recipient",
      result.destination,
      result.assetId,
      amountUnits,
      status,
      code,
      observedAt,
    ),
    network: result.network,
    checks: [{ code, status: status === "blocked" ? "block" : "unavailable" }],
    facts: {},
  };
}

function payerFacts(result: PayerReadinessResult) {
  if (result.status === "unavailable") return {};
  return {
    balanceDrops: result.balanceDrops ?? null,
    reserveDrops: result.reserveDrops ?? null,
    spendableXrpDrops: result.spendableXrpDrops ?? null,
    requiredXrpDrops: result.requiredXrpDrops ?? null,
    estimatedFeeDrops: result.estimatedFeeDrops ?? null,
    issuedBalance: result.issuedBalance ?? null,
    trustLineChecked:
      result.status === "ready" ? result.trustLineChecked : null,
  };
}

function normalizePayer(
  result: PayerReadinessResult,
  amountUnits: string,
  observedAt: string,
): AssetReadinessAssessment {
  if (result.status === "ready") {
    return {
      ...assessmentBase(
        "payer",
        result.account,
        result.assetId,
        amountUnits,
        "ready",
        null,
        observedAt,
      ),
      network: result.network,
      checks: [
        { code: "account_exists", status: "pass" },
        { code: "spendable_xrp", status: "pass" },
        {
          code: result.trustLineChecked
            ? "issued_balance"
            : "native_balance",
          status: "pass",
        },
      ],
      facts: payerFacts(result),
    };
  }

  const status = result.status;
  const code = result.reason;
  return {
    ...assessmentBase(
      "payer",
      result.account,
      result.assetId,
      amountUnits,
      status,
      code,
      observedAt,
    ),
    network: result.network,
    checks: [{ code, status: status === "blocked" ? "block" : "unavailable" }],
    facts: payerFacts(result),
  };
}

export async function checkAssetReadiness(
  input: AssetReadinessInput,
  now: () => Date = () => new Date(),
): Promise<AssetReadinessAssessment> {
  const observedAt = now().toISOString();

  if (input.role === "recipient") {
    return normalizeRecipient(
      await checkRecipientReadiness({
        reader: input.reader,
        destination: input.account,
        destinationTag: input.destinationTag,
        asset: input.asset,
        amountUnits: input.amountUnits,
        mainnetAccess: input.mainnetAccess,
      }),
      input.amountUnits,
      observedAt,
    );
  }

  return normalizePayer(
    await checkPayerReadiness({
      reader: input.reader,
      account: input.account,
      asset: input.asset,
      amountUnits: input.amountUnits,
      mainnetAccess: input.mainnetAccess,
    }),
    input.amountUnits,
    observedAt,
  );
}
